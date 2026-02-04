import { create } from "zustand";
import { Session, CadenceType } from "../types";
import { CADENCES, DEMO_MODE } from "../constants/config";
import { useAuthStore } from "./authStore";
import { useWalletStore } from "./walletStore";

interface SessionState {
  currentSession: Session | null;
  sessionHistory: Session[];
  isBlocking: boolean;

  // Actions
  startSession: (cadence: CadenceType) => void;
  surrenderSession: () => void;
  completeSession: () => void;
  getTimeRemaining: () => number;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  sessionHistory: [],
  isBlocking: false,

  startSession: (cadence: CadenceType) => {
    const config = CADENCES[cadence];
    const duration = DEMO_MODE ? config.demoDuration : config.duration;

    const session: Session = {
      id: Math.random().toString(36).substr(2, 9),
      cadence,
      stakeAmount: config.stake,
      potentialPayout: config.basePayout,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + duration),
      status: "active",
    };

    // Deduct stake from wallet
    useWalletStore.getState().deductStake(config.stake, session.id);

    set({ currentSession: session, isBlocking: true });
  },

  surrenderSession: () => {
    const { currentSession, sessionHistory } = get();
    if (!currentSession) return;

    const completedSession: Session = {
      ...currentSession,
      status: "surrendered",
      completedAt: new Date(),
      actualPayout: 0,
    };

    // Reset streak
    const authStore = useAuthStore.getState();
    authStore.updateUser({
      currentStreak: 0,
      totalSessions: (authStore.user?.totalSessions || 0) + 1,
    });

    // Record forfeit in wallet
    useWalletStore
      .getState()
      .recordForfeit(currentSession.stakeAmount, currentSession.id);

    set({
      currentSession: null,
      isBlocking: false,
      sessionHistory: [completedSession, ...sessionHistory],
    });
  },

  completeSession: () => {
    const { currentSession, sessionHistory } = get();
    if (!currentSession) return;

    const payout = currentSession.potentialPayout;

    const completedSession: Session = {
      ...currentSession,
      status: "completed",
      completedAt: new Date(),
      actualPayout: payout,
    };

    // Update user stats
    const authStore = useAuthStore.getState();
    const newStreak = (authStore.user?.currentStreak || 0) + 1;
    authStore.updateUser({
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, authStore.user?.longestStreak || 0),
      totalSessions: (authStore.user?.totalSessions || 0) + 1,
      completedSessions: (authStore.user?.completedSessions || 0) + 1,
      totalEarnings: (authStore.user?.totalEarnings || 0) + payout,
    });

    // Credit payout to wallet
    useWalletStore.getState().creditPayout(payout, currentSession.id);

    set({
      currentSession: null,
      isBlocking: false,
      sessionHistory: [completedSession, ...sessionHistory],
    });
  },

  getTimeRemaining: () => {
    const { currentSession } = get();
    if (!currentSession) return 0;

    const remaining = currentSession.endsAt.getTime() - Date.now();
    return Math.max(0, remaining);
  },
}));
