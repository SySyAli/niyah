import { create } from "zustand";
import {
  GroupSession,
  SessionParticipant,
  SessionTransfer,
  TransferStatus,
  CadenceType,
} from "../types";
import { CADENCES, DEMO_MODE } from "../constants/config";
import { useAuthStore } from "./authStore";
import { useWalletStore } from "./walletStore";
import {
  calculatePayouts,
  calculateTransfers,
  ParticipantResult,
} from "../utils/payoutAlgorithm";

// Participants are provided without the fields the store sets internally.
type NewParticipant = Omit<
  SessionParticipant,
  "stakeAmount" | "completed" | "screenTime" | "payout"
>;

interface GroupSessionState {
  activeGroupSession: GroupSession | null;
  groupSessionHistory: GroupSession[];

  startGroupSession: (
    cadence: CadenceType,
    participants: NewParticipant[],
  ) => void;
  completeGroupSession: (
    results: ParticipantResult[],
  ) => GroupSession | undefined;
  getTimeRemaining: () => number;

  markTransferPaid: (sessionId: string, transferId: string) => void;
  markTransferConfirmed: (sessionId: string, transferId: string) => void;
  markTransferOverdue: (sessionId: string, transferId: string) => void;
  markTransferDisputed: (sessionId: string, transferId: string) => void;

  getSessionsWithPendingTransfers: (userId: string) => GroupSession[];
  getPendingTransfersForUser: (
    userId: string,
  ) => Array<{ session: GroupSession; transfer: SessionTransfer }>;

  getVenmoPayLink: (
    amount: number,
    recipientHandle: string,
    note: string,
  ) => string;
}

export const useGroupSessionStore = create<GroupSessionState>((set, get) => ({
  activeGroupSession: null,
  groupSessionHistory: [],

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  startGroupSession: (cadence, participants) => {
    const config = CADENCES[cadence];
    const duration = DEMO_MODE ? config.demoDuration : config.duration;

    const fullParticipants: SessionParticipant[] = participants.map((p) => ({
      ...p,
      stakeAmount: config.stake,
    }));

    const session: GroupSession = {
      id: Math.random().toString(36).substr(2, 9),
      cadence,
      stakePerParticipant: config.stake,
      poolTotal: config.stake * fullParticipants.length,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + duration),
      status: "active",
      participants: fullParticipants,
      transfers: [],
    };

    // Only deduct from the current user's wallet; remote participants manage their own wallets.
    useWalletStore.getState().deductStake(config.stake, session.id);

    set({ activeGroupSession: session });
  },

  completeGroupSession: (results) => {
    const { activeGroupSession, groupSessionHistory } = get();
    if (!activeGroupSession) return undefined;

    const currentUserId = useAuthStore.getState().user?.id;

    const participantsWithResults: SessionParticipant[] =
      activeGroupSession.participants.map((p) => {
        const result = results.find((r) => r.userId === p.userId);
        return {
          ...p,
          completed: result?.completed ?? false,
          screenTime: result?.screenTime,
        };
      });

    const payouts = calculatePayouts(
      activeGroupSession.stakePerParticipant,
      results,
    );

    const finalParticipants: SessionParticipant[] = participantsWithResults.map(
      (p) => ({
        ...p,
        payout:
          payouts.find((pay) => pay.userId === p.userId)?.payout ??
          p.stakeAmount,
      }),
    );

    const drafts = calculateTransfers(finalParticipants, payouts);
    const transfers: SessionTransfer[] = drafts.map((d) => ({
      ...d,
      id: Math.random().toString(36).substr(2, 9),
      status: (d.amount === 0 ? "none" : "pending") as TransferStatus,
      createdAt: new Date(),
    }));

    const currentUserResult = results.find((r) => r.userId === currentUserId);
    const didComplete = currentUserResult?.completed ?? false;

    const completedSession: GroupSession = {
      ...activeGroupSession,
      status: didComplete ? "completed" : "surrendered",
      completedAt: new Date(),
      participants: finalParticipants,
      transfers,
    };

    if (currentUserId) {
      const currentUserPayout =
        payouts.find((p) => p.userId === currentUserId)?.payout ??
        activeGroupSession.stakePerParticipant;

      if (didComplete) {
        useWalletStore
          .getState()
          .creditPayout(currentUserPayout, activeGroupSession.id);
      } else {
        useWalletStore
          .getState()
          .recordForfeit(
            activeGroupSession.stakePerParticipant,
            activeGroupSession.id,
          );
      }

      const authStore = useAuthStore.getState();
      if (didComplete) {
        const newStreak = (authStore.user?.currentStreak ?? 0) + 1;
        // Net profit only: the stake was already deducted at session start,
        // so earnings = payout received minus the stake we put in.
        const netProfit =
          currentUserPayout - activeGroupSession.stakePerParticipant;
        authStore.updateUser({
          currentStreak: newStreak,
          longestStreak: Math.max(
            newStreak,
            authStore.user?.longestStreak ?? 0,
          ),
          totalSessions: (authStore.user?.totalSessions ?? 0) + 1,
          completedSessions: (authStore.user?.completedSessions ?? 0) + 1,
          totalEarnings: (authStore.user?.totalEarnings ?? 0) + netProfit,
        });
      } else {
        // Surrendered: stake was already deducted at session start.
        // totalEarnings is only updated on successful completions (consistent
        // with solo session behaviour in sessionStore.ts).
        authStore.updateUser({
          currentStreak: 0,
          totalSessions: (authStore.user?.totalSessions ?? 0) + 1,
        });
      }
    }

    set({
      activeGroupSession: null,
      groupSessionHistory: [completedSession, ...groupSessionHistory],
    });

    return completedSession;
  },

  getTimeRemaining: () => {
    const { activeGroupSession } = get();
    if (!activeGroupSession) return 0;
    return Math.max(0, activeGroupSession.endsAt.getTime() - Date.now());
  },

  // ─── Settlement ─────────────────────────────────────────────────────────────

  markTransferPaid: (sessionId, transferId) => {
    const { groupSessionHistory } = get();
    const session = groupSessionHistory.find((s) => s.id === sessionId);
    const transfer = session?.transfers.find((t) => t.id === transferId);

    if (!transfer || transfer.status !== "pending") return;

    const updatedHistory = groupSessionHistory.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            transfers: s.transfers.map((t) =>
              t.id !== transferId
                ? t
                : {
                    ...t,
                    status: "payment_indicated" as TransferStatus,
                    paidAt: new Date(),
                  },
            ),
          },
    );

    useWalletStore
      .getState()
      .recordSettlement(
        -transfer.amount,
        sessionId,
        transfer.toUserId,
        `Paid ${transfer.toUserName}`,
      );

    const authStore = useAuthStore.getState();
    const rep = authStore.user?.reputation;
    if (rep) {
      authStore.updateReputation({
        paymentsCompleted: rep.paymentsCompleted + 1,
        totalOwedPaid: rep.totalOwedPaid + transfer.amount,
      });
    }

    set({ groupSessionHistory: updatedHistory });
  },

  markTransferConfirmed: (sessionId, transferId) => {
    const { groupSessionHistory } = get();
    const session = groupSessionHistory.find((s) => s.id === sessionId);
    const transfer = session?.transfers.find((t) => t.id === transferId);

    if (!transfer || transfer.status !== "payment_indicated") return;

    const updatedHistory = groupSessionHistory.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            transfers: s.transfers.map((t) =>
              t.id !== transferId
                ? t
                : {
                    ...t,
                    status: "settled" as TransferStatus,
                    confirmedAt: new Date(),
                  },
            ),
          },
    );

    useWalletStore
      .getState()
      .recordSettlement(
        transfer.amount,
        sessionId,
        transfer.fromUserId,
        `Received from ${transfer.fromUserName}`,
      );

    set({ groupSessionHistory: updatedHistory });
  },

  markTransferOverdue: (sessionId, transferId) => {
    const { groupSessionHistory } = get();
    const session = groupSessionHistory.find((s) => s.id === sessionId);
    const transfer = session?.transfers.find((t) => t.id === transferId);

    if (!transfer || transfer.status !== "pending") return;

    const updatedHistory = groupSessionHistory.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            transfers: s.transfers.map((t) =>
              t.id !== transferId
                ? t
                : { ...t, status: "overdue" as TransferStatus },
            ),
          },
    );

    // Penalise reputation only when the current user is the payer who missed.
    const currentUserId = useAuthStore.getState().user?.id;
    if (transfer.fromUserId === currentUserId) {
      const authStore = useAuthStore.getState();
      const rep = authStore.user?.reputation;
      if (rep) {
        authStore.updateReputation({
          paymentsMissed: rep.paymentsMissed + 1,
          totalOwedMissed: rep.totalOwedMissed + transfer.amount,
        });
      }
    }

    set({ groupSessionHistory: updatedHistory });
  },

  markTransferDisputed: (sessionId, transferId) => {
    const { groupSessionHistory } = get();

    const updatedHistory = groupSessionHistory.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            transfers: s.transfers.map((t) =>
              t.id !== transferId
                ? t
                : { ...t, status: "disputed" as TransferStatus },
            ),
          },
    );

    set({ groupSessionHistory: updatedHistory });
  },

  // ─── Queries ────────────────────────────────────────────────────────────────

  getSessionsWithPendingTransfers: (userId) => {
    const { groupSessionHistory } = get();
    const actionable: TransferStatus[] = [
      "pending",
      "payment_indicated",
      "overdue",
    ];
    return groupSessionHistory.filter((session) =>
      session.transfers.some(
        (t) =>
          (t.fromUserId === userId || t.toUserId === userId) &&
          actionable.includes(t.status),
      ),
    );
  },

  getPendingTransfersForUser: (userId) => {
    const { groupSessionHistory } = get();
    const actionable: TransferStatus[] = [
      "pending",
      "payment_indicated",
      "overdue",
    ];
    const result: Array<{ session: GroupSession; transfer: SessionTransfer }> =
      [];

    for (const session of groupSessionHistory) {
      for (const transfer of session.transfers) {
        if (
          (transfer.fromUserId === userId || transfer.toUserId === userId) &&
          actionable.includes(transfer.status)
        ) {
          result.push({ session, transfer });
        }
      }
    }

    return result;
  },

  // ─── Utilities ──────────────────────────────────────────────────────────────

  getVenmoPayLink: (amount, recipientHandle, note) => {
    const handle = recipientHandle.replace("@", "");
    const dollars = (amount / 100).toFixed(2);
    const encodedNote = encodeURIComponent(note);
    return `venmo://paycharge?txn=pay&recipients=${handle}&amount=${dollars}&note=${encodedNote}`;
  },
}));
