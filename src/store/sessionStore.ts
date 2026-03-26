import { create } from "zustand";
import { Session, CadenceType } from "../types";
import { CADENCES, DEMO_MODE } from "../constants/config";
import { useAuthStore } from "./authStore";
import { useWalletStore } from "./walletStore";
import {
  handleSessionComplete as cloudComplete,
  handleSessionForfeit as cloudForfeit,
} from "../config/functions";
import {
  writeSession,
  updateSession,
  getActiveSession,
} from "../config/firebase";
import {
  startBlocking,
  stopBlocking,
  onSurrenderRequested,
} from "../config/screentime";
import { generateId } from "../utils/id";
import { logger } from "../utils/logger";

interface SessionState {
  currentSession: Session | null;
  sessionHistory: Session[];
  isBlocking: boolean;

  startSession: (cadence: CadenceType) => void;
  surrenderSession: () => void;
  completeSession: () => void;
  getTimeRemaining: () => number;
  /** Recover an active session from Firestore after app restart. */
  recoverActiveSession: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  sessionHistory: [],
  isBlocking: false,

  startSession: (cadence: CadenceType) => {
    const { currentSession } = get();
    if (currentSession) {
      throw new Error(
        "A session is already active. Complete or surrender it first.",
      );
    }

    const config = CADENCES[cadence];
    const duration = DEMO_MODE ? config.demoDuration : config.duration;

    const session: Session = {
      id: generateId(),
      cadence,
      stakeAmount: config.stake,
      potentialPayout: config.stake,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + duration),
      status: "active",
    };

    useWalletStore.getState().deductStake(config.stake, session.id);

    set({ currentSession: session, isBlocking: true });

    // Start Screen Time blocking (fire-and-forget; no-op on simulator)
    startBlocking().catch((err) =>
      logger.warn("Screen Time startBlocking failed:", err),
    );

    // Listen for surrender requests from the custom shield screen.
    // If the user taps "Surrender Session" on the Niyah shield while a
    // blocked app is open, the ShieldActionExtension writes a flag to
    // shared UserDefaults and this subscription picks it up.
    const unsubSurrender = onSurrenderRequested(() => {
      unsubSurrender();
      get().surrenderSession();
    });

    // Persist session to Firestore (fire-and-forget)
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      writeSession(session.id, {
        userId,
        cadence: session.cadence,
        stakeAmount: session.stakeAmount,
        potentialPayout: session.potentialPayout,
        startedAt: session.startedAt,
        endsAt: session.endsAt,
        status: "active",
      }).catch((err) =>
        logger.error("Failed to persist session to Firestore:", err),
      );
    }
  },

  surrenderSession: () => {
    const { currentSession, sessionHistory } = get();
    if (!currentSession) return;

    const completedAt = new Date();
    const completedSession: Session = {
      ...currentSession,
      status: "surrendered",
      completedAt,
      actualPayout: 0,
    };

    const authStore = useAuthStore.getState();
    authStore.updateUser({
      currentStreak: 0,
      totalSessions: (authStore.user?.totalSessions || 0) + 1,
    });
    useWalletStore
      .getState()
      .recordForfeit(currentSession.stakeAmount, currentSession.id);

    // Stop Screen Time blocking (fire-and-forget)
    stopBlocking().catch((err) =>
      logger.warn("Screen Time stopBlocking (surrender) failed:", err),
    );

    set({
      currentSession: null,
      isBlocking: false,
      sessionHistory: [completedSession, ...sessionHistory],
    });

    // Update session doc in Firestore (fire-and-forget).
    // actualPayout is written by Cloud Functions only — not sent from client.
    updateSession(currentSession.id, {
      status: "surrendered",
      completedAt,
    }).catch((err) =>
      logger.error("Failed to update session in Firestore:", err),
    );

    // Sync to server (non-blocking — local state is source of truth in DEMO_MODE)
    if (!DEMO_MODE) {
      cloudForfeit(currentSession.id, currentSession.stakeAmount).catch((err) =>
        logger.error("cloudForfeit failed:", err),
      );
    }
  },

  completeSession: () => {
    const { currentSession, sessionHistory } = get();
    if (!currentSession) return;

    const payout = currentSession.potentialPayout;
    const completedAt = new Date();

    const completedSession: Session = {
      ...currentSession,
      status: "completed",
      completedAt,
      actualPayout: payout,
    };

    const authStore = useAuthStore.getState();
    const newStreak = (authStore.user?.currentStreak || 0) + 1;
    authStore.updateUser({
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, authStore.user?.longestStreak || 0),
      totalSessions: (authStore.user?.totalSessions || 0) + 1,
      completedSessions: (authStore.user?.completedSessions || 0) + 1,
      // Net profit: payout minus stake already deducted at session start
      totalEarnings:
        (authStore.user?.totalEarnings || 0) +
        (payout - currentSession.stakeAmount),
    });
    useWalletStore.getState().creditPayout(payout, currentSession.id);

    // Stop Screen Time blocking (fire-and-forget)
    stopBlocking().catch((err) =>
      logger.warn("Screen Time stopBlocking (complete) failed:", err),
    );

    set({
      currentSession: null,
      isBlocking: false,
      sessionHistory: [completedSession, ...sessionHistory],
    });

    // Update session doc in Firestore (fire-and-forget).
    // actualPayout is written by Cloud Functions only — not sent from client.
    updateSession(currentSession.id, {
      status: "completed",
      completedAt,
    }).catch((err) =>
      logger.error("Failed to update session in Firestore:", err),
    );

    // Sync to server (non-blocking — local state is source of truth in DEMO_MODE)
    if (!DEMO_MODE) {
      cloudComplete(currentSession.id, currentSession.stakeAmount).catch(
        (err) => logger.error("cloudComplete failed:", err),
      );
    }
  },

  getTimeRemaining: () => {
    const { currentSession } = get();
    if (!currentSession) return 0;

    const remaining = currentSession.endsAt.getTime() - Date.now();
    return Math.max(0, remaining);
  },

  recoverActiveSession: async (userId: string) => {
    const { currentSession } = get();
    // Don't recover if we already have an active session in memory
    if (currentSession) return;

    try {
      const activeSession = await getActiveSession(userId);
      if (!activeSession) return;

      // Check if the session has already expired
      if (activeSession.endsAt.getTime() <= Date.now()) {
        // Session expired while app was closed — auto-complete it
        const payout = activeSession.potentialPayout;
        const completedAt = new Date();

        const completedSession: Session = {
          id: activeSession.id,
          cadence: activeSession.cadence as CadenceType,
          stakeAmount: activeSession.stakeAmount,
          potentialPayout: activeSession.potentialPayout,
          startedAt: activeSession.startedAt,
          endsAt: activeSession.endsAt,
          status: "completed",
          completedAt,
          actualPayout: payout,
        };

        // Mark the session as completed in Firestore FIRST. If this fails
        // (e.g. network timeout), we skip the local payout so the next app
        // restart will find the same "active" session and retry — preventing
        // duplicate local credits.
        try {
          await updateSession(activeSession.id, {
            status: "completed",
            completedAt,
          });
        } catch (err) {
          logger.error("Failed to auto-complete expired session:", err);
          // Firestore still has status: "active", so the next restart will
          // retry. Don't credit the payout locally to avoid double-counting.
          return;
        }

        const authStore = useAuthStore.getState();
        const newStreak = (authStore.user?.currentStreak || 0) + 1;
        authStore.updateUser({
          currentStreak: newStreak,
          longestStreak: Math.max(
            newStreak,
            authStore.user?.longestStreak || 0,
          ),
          totalSessions: (authStore.user?.totalSessions || 0) + 1,
          completedSessions: (authStore.user?.completedSessions || 0) + 1,
          totalEarnings:
            (authStore.user?.totalEarnings || 0) +
            (payout - activeSession.stakeAmount),
        });
        useWalletStore.getState().creditPayout(payout, activeSession.id);

        set((state) => ({
          sessionHistory: [completedSession, ...state.sessionHistory],
        }));

        if (!DEMO_MODE) {
          cloudComplete(activeSession.id, activeSession.stakeAmount).catch(
            (err) => logger.error("cloudComplete (recovery) failed:", err),
          );
        }
        return;
      }

      // Session is still active — restore it
      const restoredSession: Session = {
        id: activeSession.id,
        cadence: activeSession.cadence as CadenceType,
        stakeAmount: activeSession.stakeAmount,
        potentialPayout: activeSession.potentialPayout,
        startedAt: activeSession.startedAt,
        endsAt: activeSession.endsAt,
        status: "active",
      };

      set({ currentSession: restoredSession, isBlocking: true });
    } catch (error) {
      logger.error("Failed to recover active session:", error);
    }
  },

  reset: () => {
    set({
      currentSession: null,
      sessionHistory: [],
      isBlocking: false,
    });
  },
}));
