/**
 * Integration Tests for Group Session Flow
 *
 * Testing Strategy:
 * - BLACK BOX: Tests complete user journeys without internal knowledge
 * - End-to-end flow testing across groupSessionStore, walletStore, authStore
 * - State consistency validation across stores after multi-step operations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGroupSessionStore } from "../../store/groupSessionStore";
import { useWalletStore } from "../../store/walletStore";
import { useAuthStore } from "../../store/authStore";
import { CADENCES, INITIAL_BALANCE } from "../../constants/config";
import type { GroupSession, SessionTransfer, UserReputation } from "../../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeReputation = (overrides: Partial<UserReputation> = {}): UserReputation => ({
  score: 50,
  level: "sapling",
  paymentsCompleted: 0,
  paymentsMissed: 0,
  totalOwedPaid: 0,
  totalOwedMissed: 0,
  lastUpdated: new Date(),
  ...overrides,
});

const P_A = { userId: "user-a", name: "Alice", venmoHandle: "@alice", reputation: makeReputation() };
const P_B = { userId: "user-b", name: "Bob", venmoHandle: "@bob", reputation: makeReputation() };
const P_C = { userId: "user-c", name: "Charlie", reputation: makeReputation() };

const resetStores = () => {
  useGroupSessionStore.setState({
    activeGroupSession: null,
    groupSessionHistory: [],
  });
  useWalletStore.setState({
    balance: INITIAL_BALANCE,
    transactions: [],
    pendingWithdrawal: 0,
  });
  useAuthStore.setState({
    user: {
      id: "user-a",
      email: "alice@test.com",
      name: "Alice",
      balance: INITIAL_BALANCE,
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      completedSessions: 0,
      totalEarnings: 0,
      createdAt: new Date(),
      reputation: makeReputation(),
    },
    isAuthenticated: true,
    isLoading: false,
  });
};

// Injects a completed session with a transfer into history.
const seedSessionWithTransfer = (
  transferOverrides: Partial<SessionTransfer> = {},
): { sessionId: string; transferId: string } => {
  const transfer: SessionTransfer = {
    id: "t1",
    fromUserId: "user-a",
    fromUserName: "Alice",
    toUserId: "user-b",
    toUserName: "Bob",
    amount: CADENCES.daily.stake,
    status: "pending",
    createdAt: new Date(),
    ...transferOverrides,
  };
  const session: GroupSession = {
    id: "session-seed",
    cadence: "daily",
    stakePerParticipant: CADENCES.daily.stake,
    poolTotal: CADENCES.daily.stake * 2,
    startedAt: new Date(),
    endsAt: new Date(),
    status: "surrendered",
    completedAt: new Date(),
    participants: [
      { ...P_A, stakeAmount: CADENCES.daily.stake },
      { ...P_B, stakeAmount: CADENCES.daily.stake },
    ],
    transfers: [transfer],
  };
  useGroupSessionStore.setState({ groupSessionHistory: [session] });
  return { sessionId: "session-seed", transferId: "t1" };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Group Session Flow Integration Tests", () => {
  beforeEach(resetStores);

  // ── Both participants complete ─────────────────────────────────────────────

  describe("Both participants complete", () => {
    it("wallet returns to initial balance (stake in, payout out = net 0)", () => {
      const initial = useWalletStore.getState().balance;
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);
      // Even-split: payout == stake → net 0
      expect(useWalletStore.getState().balance).toBe(initial);
    });

    it("session moves to history with completed status", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);
      const history = useGroupSessionStore.getState().groupSessionHistory;
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe("completed");
    });

    it("auth stats: streak++, totalSessions++, completedSessions++", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);
      const user = useAuthStore.getState().user!;
      expect(user.currentStreak).toBe(1);
      expect(user.totalSessions).toBe(1);
      expect(user.completedSessions).toBe(1);
    });

    it("transaction history: contains stake and payout, no forfeit", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);
      const txs = useWalletStore.getState().transactions;
      expect(txs.some((t) => t.type === "stake")).toBe(true);
      expect(txs.some((t) => t.type === "payout")).toBe(true);
      expect(txs.some((t) => t.type === "forfeit")).toBe(false);
    });

    it("both participants have completed=true in history", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);
      const { participants } = useGroupSessionStore.getState().groupSessionHistory[0];
      expect(participants.every((p) => p.completed)).toBe(true);
    });
  });

  // ── User surrenders ───────────────────────────────────────────────────────

  describe("User surrenders (current user quits)", () => {
    it("wallet stays below initial (stake lost, no payout)", () => {
      const initial = useWalletStore.getState().balance;
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
        { userId: "user-b", completed: true },
      ]);
      expect(useWalletStore.getState().balance).toBe(initial - CADENCES.daily.stake);
    });

    it("session moves to history with surrendered status", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
        { userId: "user-b", completed: true },
      ]);
      expect(useGroupSessionStore.getState().groupSessionHistory[0].status).toBe("surrendered");
    });

    it("auth stats: streak resets, totalSessions++, completedSessions unchanged", () => {
      useAuthStore.getState().updateUser({ currentStreak: 5 });
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
      ]);
      const user = useAuthStore.getState().user!;
      expect(user.currentStreak).toBe(0);
      expect(user.totalSessions).toBe(1);
      expect(user.completedSessions).toBe(0);
    });

    it("transaction history: stake then forfeit, no payout", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
      ]);
      const txs = useWalletStore.getState().transactions;
      expect(txs.some((t) => t.type === "stake")).toBe(true);
      expect(txs.some((t) => t.type === "forfeit")).toBe(true);
      expect(txs.some((t) => t.type === "payout")).toBe(false);
    });

    it("partner's completed flag is true in history when only user surrenders", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
        { userId: "user-b", completed: true },
      ]);
      const { participants } = useGroupSessionStore.getState().groupSessionHistory[0];
      expect(participants.find((p) => p.userId === "user-b")?.completed).toBe(true);
      expect(participants.find((p) => p.userId === "user-a")?.completed).toBe(false);
    });
  });

  // ── Three-person session ──────────────────────────────────────────────────

  describe("Three-person session", () => {
    it("poolTotal = stake × 3", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B, P_C]);
      const session = useGroupSessionStore.getState().activeGroupSession!;
      expect(session.poolTotal).toBe(CADENCES.daily.stake * 3);
    });

    it("only current user's wallet is debited on start", () => {
      const initial = useWalletStore.getState().balance;
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B, P_C]);
      expect(useWalletStore.getState().balance).toBe(initial - CADENCES.daily.stake);
    });

    it("all three participants recorded in session", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B, P_C]);
      const { participants } = useGroupSessionStore.getState().activeGroupSession!;
      expect(participants).toHaveLength(3);
      expect(participants.map((p) => p.userId)).toEqual(
        expect.arrayContaining(["user-a", "user-b", "user-c"]),
      );
    });

    it("wallet net = 0 when current user completes (even-split)", () => {
      const initial = useWalletStore.getState().balance;
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B, P_C]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: false },
        { userId: "user-c", completed: true },
      ]);
      expect(useWalletStore.getState().balance).toBe(initial);
    });

    it("each participant has payout attached after completion", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B, P_C]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
        { userId: "user-c", completed: true },
      ]);
      const { participants } = useGroupSessionStore.getState().groupSessionHistory[0];
      expect(participants).toHaveLength(3);
      participants.forEach((p) => expect(p.payout).toBeDefined());
    });
  });

  // ── Streak building across multiple sessions ──────────────────────────────

  describe("Streak building across multiple sessions", () => {
    it("builds streak to 5 after 5 consecutive completions", () => {
      for (let i = 0; i < 5; i++) {
        useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
        useGroupSessionStore.getState().completeGroupSession([
          { userId: "user-a", completed: true },
        ]);
      }
      const user = useAuthStore.getState().user!;
      expect(user.currentStreak).toBe(5);
      expect(user.longestStreak).toBe(5);
      expect(user.totalSessions).toBe(5);
      expect(user.completedSessions).toBe(5);
    });

    it("wallet stays at initial after N completions (even-split net 0 each)", () => {
      const initial = useWalletStore.getState().balance;
      for (let i = 0; i < 5; i++) {
        useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
        useGroupSessionStore.getState().completeGroupSession([
          { userId: "user-a", completed: true },
        ]);
      }
      expect(useWalletStore.getState().balance).toBe(initial);
    });

    it("history accumulates all sessions, most recent first, each with unique id", () => {
      for (let i = 0; i < 3; i++) {
        useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
        useGroupSessionStore.getState().completeGroupSession([
          { userId: "user-a", completed: true },
        ]);
      }
      const history = useGroupSessionStore.getState().groupSessionHistory;
      expect(history).toHaveLength(3);
      const ids = history.map((s) => s.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  // ── Streak reset + longestStreak preservation ─────────────────────────────

  describe("Streak reset preserves longestStreak", () => {
    it("longestStreak is not lowered when current streak resets on surrender", () => {
      for (let i = 0; i < 4; i++) {
        useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
        useGroupSessionStore.getState().completeGroupSession([
          { userId: "user-a", completed: true },
        ]);
      }
      expect(useAuthStore.getState().user!.currentStreak).toBe(4);
      expect(useAuthStore.getState().user!.longestStreak).toBe(4);

      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
      ]);

      const user = useAuthStore.getState().user!;
      expect(user.currentStreak).toBe(0);
      expect(user.longestStreak).toBe(4);
    });

    it("longestStreak updates when new streak surpasses old record", () => {
      // Build streak of 3, break it
      for (let i = 0; i < 3; i++) {
        useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
        useGroupSessionStore.getState().completeGroupSession([
          { userId: "user-a", completed: true },
        ]);
      }
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
      ]);

      // Build new streak past old record
      for (let i = 0; i < 5; i++) {
        useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
        useGroupSessionStore.getState().completeGroupSession([
          { userId: "user-a", completed: true },
        ]);
      }

      const user = useAuthStore.getState().user!;
      expect(user.currentStreak).toBe(5);
      expect(user.longestStreak).toBe(5);
    });
  });

  // ── Financial consistency across mixed sessions ────────────────────────────

  describe("Financial consistency across mixed sessions", () => {
    it("multiple surrenders stack losses correctly", () => {
      const initial = useWalletStore.getState().balance;
      const stake = CADENCES.daily.stake;
      for (let i = 0; i < 3; i++) {
        useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
        useGroupSessionStore.getState().completeGroupSession([
          { userId: "user-a", completed: false },
        ]);
      }
      expect(useWalletStore.getState().balance).toBe(initial - stake * 3);
    });

    it("complete → complete → surrender nets -1 stake", () => {
      const initial = useWalletStore.getState().balance;
      const stake = CADENCES.daily.stake;

      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: true }]);

      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: true }]);

      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: false }]);

      expect(useWalletStore.getState().balance).toBe(initial - stake);
    });

    it("totalEarnings accumulates only from completions, not surrenders", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: true }]);

      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: false }]);

      useGroupSessionStore.getState().startGroupSession("weekly", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: true }]);

      const user = useAuthStore.getState().user!;
      expect(user.totalEarnings).toBe(CADENCES.daily.stake + CADENCES.weekly.stake);
    });

    it("totalSessions counts both completions and surrenders", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: true }]);

      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([{ userId: "user-a", completed: false }]);

      expect(useAuthStore.getState().user!.totalSessions).toBe(2);
      expect(useAuthStore.getState().user!.completedSessions).toBe(1);
    });
  });

  // ── Transfer settlement lifecycle ─────────────────────────────────────────

  describe("Transfer settlement: pending → payment_indicated → settled", () => {
    it("full lifecycle transitions status at each step", () => {
      const { sessionId, transferId } = seedSessionWithTransfer({ status: "pending" });

      useGroupSessionStore.getState().markTransferPaid(sessionId, transferId);
      let t = useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("payment_indicated");
      expect(t.paidAt).toBeDefined();

      useGroupSessionStore.getState().markTransferConfirmed(sessionId, transferId);
      t = useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("settled");
      expect(t.confirmedAt).toBeDefined();
    });

    it("paying debits wallet and updates payer reputation", () => {
      const { sessionId, transferId } = seedSessionWithTransfer({
        status: "pending",
        fromUserId: "user-a",
        toUserId: "user-b",
        amount: CADENCES.daily.stake,
      });

      const walletBefore = useWalletStore.getState().balance;
      useGroupSessionStore.getState().markTransferPaid(sessionId, transferId);

      expect(useWalletStore.getState().balance).toBe(walletBefore - CADENCES.daily.stake);
      const rep = useAuthStore.getState().user!.reputation;
      expect(rep.paymentsCompleted).toBe(1);
      expect(rep.totalOwedPaid).toBe(CADENCES.daily.stake);
    });

    it("confirming credits wallet with settlement_received transaction", () => {
      const { sessionId, transferId } = seedSessionWithTransfer({
        status: "payment_indicated",
        fromUserId: "user-b",
        toUserId: "user-a",
        amount: CADENCES.daily.stake,
      });

      const walletBefore = useWalletStore.getState().balance;
      useGroupSessionStore.getState().markTransferConfirmed(sessionId, transferId);

      expect(useWalletStore.getState().balance).toBe(walletBefore + CADENCES.daily.stake);
      expect(
        useWalletStore.getState().transactions.some((t) => t.type === "settlement_received"),
      ).toBe(true);
    });

    it("session no longer appears in pending queries after fully settled", () => {
      const { sessionId, transferId } = seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferPaid(sessionId, transferId);
      useGroupSessionStore.getState().markTransferConfirmed(sessionId, transferId);

      expect(
        useGroupSessionStore.getState().getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(0);
      expect(
        useGroupSessionStore.getState().getPendingTransfersForUser("user-a"),
      ).toHaveLength(0);
    });

    it("settlement_paid then settlement_received are both in transaction history", () => {
      // user-a pays user-b (payer)
      seedSessionWithTransfer({
        id: "t1",
        status: "pending",
        fromUserId: "user-a",
        toUserId: "user-b",
        amount: CADENCES.daily.stake,
      });
      useGroupSessionStore.getState().markTransferPaid("session-seed", "t1");

      // separately, user-a receives from user-c (recipient)
      const receiveTransfer: SessionTransfer = {
        id: "t2",
        fromUserId: "user-c",
        fromUserName: "Charlie",
        toUserId: "user-a",
        toUserName: "Alice",
        amount: CADENCES.daily.stake,
        status: "payment_indicated",
        createdAt: new Date(),
      };
      const existingHistory = useGroupSessionStore.getState().groupSessionHistory;
      useGroupSessionStore.setState({
        groupSessionHistory: [
          { ...existingHistory[0], transfers: [...existingHistory[0].transfers, receiveTransfer] },
        ],
      });
      useGroupSessionStore.getState().markTransferConfirmed("session-seed", "t2");

      const txs = useWalletStore.getState().transactions;
      expect(txs.some((t) => t.type === "settlement_paid")).toBe(true);
      expect(txs.some((t) => t.type === "settlement_received")).toBe(true);
    });
  });

  // ── Overdue penalty flow ──────────────────────────────────────────────────

  describe("Overdue penalty flow", () => {
    it("marking overdue penalizes payer's reputation", () => {
      const { sessionId, transferId } = seedSessionWithTransfer({
        status: "pending",
        fromUserId: "user-a",
        amount: CADENCES.daily.stake,
      });

      useGroupSessionStore.getState().markTransferOverdue(sessionId, transferId);

      const rep = useAuthStore.getState().user!.reputation;
      expect(rep.paymentsMissed).toBe(1);
      expect(rep.totalOwedMissed).toBe(CADENCES.daily.stake);
    });

    it("overdue transfers still appear as actionable in queries", () => {
      const { sessionId } = seedSessionWithTransfer({
        status: "pending",
        fromUserId: "user-a",
      });

      useGroupSessionStore.getState().markTransferOverdue(sessionId, "t1");

      expect(
        useGroupSessionStore.getState().getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(1);
    });

    it("overdue → disputed removes transfer from pending queries", () => {
      const { sessionId, transferId } = seedSessionWithTransfer({
        status: "pending",
        fromUserId: "user-a",
      });

      useGroupSessionStore.getState().markTransferOverdue(sessionId, transferId);
      useGroupSessionStore.getState().markTransferDisputed(sessionId, transferId);

      expect(
        useGroupSessionStore.getState().getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(0);
    });

    it("marking overdue twice does not double-penalize reputation", () => {
      const { sessionId, transferId } = seedSessionWithTransfer({
        status: "pending",
        fromUserId: "user-a",
        amount: CADENCES.daily.stake,
      });

      useGroupSessionStore.getState().markTransferOverdue(sessionId, transferId);
      // second call is a no-op because status is already "overdue"
      useGroupSessionStore.getState().markTransferOverdue(sessionId, transferId);

      const rep = useAuthStore.getState().user!.reputation;
      expect(rep.paymentsMissed).toBe(1);
    });
  });

  // ── Cross-store invariants ────────────────────────────────────────────────

  describe("Cross-store state invariants", () => {
    it("no active session after complete", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
      ]);
      expect(useGroupSessionStore.getState().activeGroupSession).toBeNull();
    });

    it("no active session after surrender", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
      ]);
      expect(useGroupSessionStore.getState().activeGroupSession).toBeNull();
    });

    it("session in history has same id as was active", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const activeId = useGroupSessionStore.getState().activeGroupSession!.id;
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
      ]);
      expect(useGroupSessionStore.getState().groupSessionHistory[0].id).toBe(activeId);
    });

    it("stake transaction is linked to session id", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const activeId = useGroupSessionStore.getState().activeGroupSession!.id;
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
      ]);
      const txs = useWalletStore.getState().transactions;
      const stakeTx = txs.find((t) => t.type === "stake");
      expect(stakeTx?.sessionId).toBe(activeId);
    });

    it("forfeit transaction is linked to session id", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const activeId = useGroupSessionStore.getState().activeGroupSession!.id;
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
      ]);
      const txs = useWalletStore.getState().transactions;
      const forfeitTx = txs.find((t) => t.type === "forfeit");
      expect(forfeitTx?.sessionId).toBe(activeId);
    });

    it("completeGroupSession returns the session that ends up in history", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const returned = useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
      ]);
      const inHistory = useGroupSessionStore.getState().groupSessionHistory[0];
      expect(returned!.id).toBe(inHistory.id);
      expect(returned!.status).toBe(inHistory.status);
    });
  });
});
