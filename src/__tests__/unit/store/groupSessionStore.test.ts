import { describe, it, expect, beforeEach } from "vitest";
import { useGroupSessionStore } from "../../../store/groupSessionStore";
import { useWalletStore } from "../../../store/walletStore";
import { useAuthStore } from "../../../store/authStore";
import { CADENCES, INITIAL_BALANCE } from "../../../constants/config";
import type {
  GroupSession,
  SessionTransfer,
  UserReputation,
} from "../../../types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeReputation = (
  overrides: Partial<UserReputation> = {},
): UserReputation => ({
  score: 50,
  level: "sapling",
  paymentsCompleted: 0,
  paymentsMissed: 0,
  totalOwedPaid: 0,
  totalOwedMissed: 0,
  lastUpdated: new Date(),
  referralCount: 0,
  ...overrides,
});

const P_A = {
  userId: "user-a",
  name: "Alice",
  venmoHandle: "@alice",
  reputation: makeReputation(),
};
const P_B = {
  userId: "user-b",
  name: "Bob",
  venmoHandle: "@bob",
  reputation: makeReputation(),
};
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

// Inject a completed session with a single transfer directly into history.
const seedSessionWithTransfer = (
  transferOverrides: Partial<SessionTransfer> = {},
): SessionTransfer => {
  const transfer: SessionTransfer = {
    id: "t1",
    fromUserId: "user-a",
    fromUserName: "Alice",
    toUserId: "user-b",
    toUserName: "Bob",
    amount: 500,
    status: "pending",
    createdAt: new Date(),
    ...transferOverrides,
  };
  const session: GroupSession = {
    id: "session-1",
    cadence: "daily",
    stakePerParticipant: 500,
    poolTotal: 1000,
    startedAt: new Date(),
    endsAt: new Date(),
    status: "surrendered",
    completedAt: new Date(),
    participants: [
      { ...P_A, stakeAmount: 500 },
      { ...P_B, stakeAmount: 500 },
    ],
    transfers: [transfer],
  };
  useGroupSessionStore.setState({ groupSessionHistory: [session] });
  return transfer;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("groupSessionStore", () => {
  beforeEach(resetStores);

  // ── startGroupSession ─────────────────────────────────────────────────────

  describe("startGroupSession", () => {
    it("creates an active session with correct fields", () => {
      const before = Date.now();
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const after = Date.now();

      const s = useGroupSessionStore.getState().activeGroupSession!;
      expect(s).not.toBeNull();
      expect(s.cadence).toBe("daily");
      expect(s.status).toBe("active");
      expect(s.stakePerParticipant).toBe(CADENCES.daily.stake);
      expect(s.transfers).toEqual([]);
      expect(s.startedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(s.startedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it("sets stakeAmount on every participant from cadence config", () => {
      useGroupSessionStore.getState().startGroupSession("weekly", [P_A, P_B]);
      const { participants } =
        useGroupSessionStore.getState().activeGroupSession!;
      participants.forEach((p) =>
        expect(p.stakeAmount).toBe(CADENCES.weekly.stake),
      );
    });

    it("computes poolTotal as stake × participant count", () => {
      useGroupSessionStore
        .getState()
        .startGroupSession("daily", [P_A, P_B, P_C]);
      expect(
        useGroupSessionStore.getState().activeGroupSession!.poolTotal,
      ).toBe(CADENCES.daily.stake * 3);
    });

    it("deducts stake from wallet (current user only)", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      expect(useWalletStore.getState().balance).toBe(
        INITIAL_BALANCE - CADENCES.daily.stake,
      );
    });

    it("adds a stake transaction to wallet history", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const txs = useWalletStore.getState().transactions;
      expect(txs.some((t) => t.type === "stake")).toBe(true);
    });

    it("includes all participants with correct userIds", () => {
      useGroupSessionStore
        .getState()
        .startGroupSession("daily", [P_A, P_B, P_C]);
      const ids = useGroupSessionStore
        .getState()
        .activeGroupSession!.participants.map((p) => p.userId);
      expect(ids).toContain("user-a");
      expect(ids).toContain("user-b");
      expect(ids).toContain("user-c");
    });

    it("generates unique session ids across calls", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const id1 = useGroupSessionStore.getState().activeGroupSession!.id;

      useGroupSessionStore.setState({ activeGroupSession: null });
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      const id2 = useGroupSessionStore.getState().activeGroupSession!.id;

      expect(id1).not.toBe(id2);
    });
  });

  // ── completeGroupSession ──────────────────────────────────────────────────

  describe("completeGroupSession", () => {
    const start = () =>
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);

    it("returns undefined when no active session", () => {
      expect(
        useGroupSessionStore.getState().completeGroupSession([]),
      ).toBeUndefined();
    });

    it("clears activeGroupSession and moves to history", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);

      expect(useGroupSessionStore.getState().activeGroupSession).toBeNull();
      expect(useGroupSessionStore.getState().groupSessionHistory).toHaveLength(
        1,
      );
    });

    it("prepends to history (most recent first)", () => {
      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: true }]);
      const firstId = useGroupSessionStore.getState().groupSessionHistory[0].id;

      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: true }]);
      const newestId =
        useGroupSessionStore.getState().groupSessionHistory[0].id;

      expect(newestId).not.toBe(firstId);
      expect(useGroupSessionStore.getState().groupSessionHistory).toHaveLength(
        2,
      );
    });

    it("returns the completed session", () => {
      start();
      const result = useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: true }]);
      expect(result).toBeDefined();
      expect(result!.status).toBe("completed");
    });

    it("status is 'completed' when current user completed", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: false },
      ]);
      expect(
        useGroupSessionStore.getState().groupSessionHistory[0].status,
      ).toBe("completed");
    });

    it("status is 'surrendered' when current user failed", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
        { userId: "user-b", completed: true },
      ]);
      expect(
        useGroupSessionStore.getState().groupSessionHistory[0].status,
      ).toBe("surrendered");
    });

    it("sets completed flags on participants from results", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: false },
      ]);
      const { participants } =
        useGroupSessionStore.getState().groupSessionHistory[0];
      expect(participants.find((p) => p.userId === "user-a")?.completed).toBe(
        true,
      );
      expect(participants.find((p) => p.userId === "user-b")?.completed).toBe(
        false,
      );
    });

    it("attaches screenTime to participants when provided", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true, screenTime: 12000 },
        { userId: "user-b", completed: true, screenTime: 5000 },
      ]);
      const { participants } =
        useGroupSessionStore.getState().groupSessionHistory[0];
      expect(participants.find((p) => p.userId === "user-a")?.screenTime).toBe(
        12000,
      );
      expect(participants.find((p) => p.userId === "user-b")?.screenTime).toBe(
        5000,
      );
    });

    it("participants missing from results default to completed: false", () => {
      start();
      // Only provide result for user-a
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: true }]);
      const { participants } =
        useGroupSessionStore.getState().groupSessionHistory[0];
      expect(participants.find((p) => p.userId === "user-b")?.completed).toBe(
        false,
      );
    });

    it("credits payout to wallet when current user completed", () => {
      start();
      const balanceAfterStake = useWalletStore.getState().balance;
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: false },
      ]);
      // even-split payout = stake, so balance is restored
      expect(useWalletStore.getState().balance).toBe(
        balanceAfterStake + CADENCES.daily.stake,
      );
    });

    it("records forfeit (no extra balance deduction) when current user failed", () => {
      start();
      const balanceAfterStake = useWalletStore.getState().balance;
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: false },
        { userId: "user-b", completed: true },
      ]);
      // Stake was already lost on start; forfeit just records the event
      expect(useWalletStore.getState().balance).toBe(balanceAfterStake);
      expect(
        useWalletStore
          .getState()
          .transactions.some((t) => t.type === "forfeit"),
      ).toBe(true);
    });

    it("increments currentStreak on completion", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);
      expect(useAuthStore.getState().user!.currentStreak).toBe(1);
    });

    it("resets currentStreak to 0 on failure", () => {
      useAuthStore.getState().updateUser({ currentStreak: 5 });
      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: false }]);
      expect(useAuthStore.getState().user!.currentStreak).toBe(0);
    });

    it("updates longestStreak when new streak surpasses it", () => {
      useAuthStore
        .getState()
        .updateUser({ currentStreak: 4, longestStreak: 4 });
      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: true }]);
      expect(useAuthStore.getState().user!.longestStreak).toBe(5);
    });

    it("does not lower longestStreak on surrender", () => {
      useAuthStore.getState().updateUser({ longestStreak: 10 });
      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: false }]);
      expect(useAuthStore.getState().user!.longestStreak).toBe(10);
    });

    it("increments totalSessions on both completion and failure", () => {
      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: false }]);
      expect(useAuthStore.getState().user!.totalSessions).toBe(1);

      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: true }]);
      expect(useAuthStore.getState().user!.totalSessions).toBe(2);
    });

    it("only increments completedSessions on successful completion", () => {
      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: false }]);
      expect(useAuthStore.getState().user!.completedSessions).toBe(0);

      start();
      useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-a", completed: true }]);
      expect(useAuthStore.getState().user!.completedSessions).toBe(1);
    });

    it("with even-split placeholder: produces empty transfers array", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: false },
      ]);
      expect(
        useGroupSessionStore.getState().groupSessionHistory[0].transfers,
      ).toHaveLength(0);
    });

    it("attaches payout to each participant", () => {
      start();
      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: true },
      ]);
      const { participants } =
        useGroupSessionStore.getState().groupSessionHistory[0];
      participants.forEach((p) => expect(p.payout).toBeDefined());
    });

    it("does not crash when no auth user is logged in", () => {
      useAuthStore.setState({ user: null });
      start();
      expect(() =>
        useGroupSessionStore
          .getState()
          .completeGroupSession([{ userId: "user-a", completed: true }]),
      ).not.toThrow();
    });
  });

  // ── getTimeRemaining ──────────────────────────────────────────────────────

  describe("getTimeRemaining", () => {
    it("returns 0 when no active session", () => {
      expect(useGroupSessionStore.getState().getTimeRemaining()).toBe(0);
    });

    it("returns a positive value during an active session", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);
      expect(
        useGroupSessionStore.getState().getTimeRemaining(),
      ).toBeGreaterThan(0);
    });

    it("never returns a negative value for an expired session", () => {
      useGroupSessionStore.setState({
        activeGroupSession: {
          id: "past",
          cadence: "daily",
          stakePerParticipant: 500,
          poolTotal: 1000,
          startedAt: new Date(Date.now() - 20000),
          endsAt: new Date(Date.now() - 5000), // already ended
          status: "active",
          participants: [],
          transfers: [],
        },
      });
      expect(useGroupSessionStore.getState().getTimeRemaining()).toBe(0);
    });
  });

  // ── markTransferPaid ──────────────────────────────────────────────────────

  describe("markTransferPaid", () => {
    it("transitions pending → payment_indicated", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferPaid("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("payment_indicated");
    });

    it("sets paidAt timestamp", () => {
      const before = Date.now();
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferPaid("session-1", "t1");
      const after = Date.now();

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.paidAt).toBeDefined();
      expect(t.paidAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(t.paidAt!.getTime()).toBeLessThanOrEqual(after);
    });

    it("records a settlement_paid transaction in wallet", () => {
      seedSessionWithTransfer({ status: "pending", amount: 500 });
      useGroupSessionStore.getState().markTransferPaid("session-1", "t1");

      expect(
        useWalletStore
          .getState()
          .transactions.some((t) => t.type === "settlement_paid"),
      ).toBe(true);
    });

    it("increments paymentsCompleted in reputation", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferPaid("session-1", "t1");

      expect(useAuthStore.getState().user!.reputation.paymentsCompleted).toBe(
        1,
      );
    });

    it("adds transfer amount to totalOwedPaid in reputation", () => {
      seedSessionWithTransfer({ status: "pending", amount: 500 });
      useGroupSessionStore.getState().markTransferPaid("session-1", "t1");

      expect(useAuthStore.getState().user!.reputation.totalOwedPaid).toBe(500);
    });

    it("is no-op when transfer is not pending", () => {
      seedSessionWithTransfer({ status: "payment_indicated" });
      useGroupSessionStore.getState().markTransferPaid("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("payment_indicated"); // unchanged
    });

    it("is no-op when session is not found", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferPaid("wrong-session", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("pending"); // unchanged
    });
  });

  // ── markTransferConfirmed ─────────────────────────────────────────────────

  describe("markTransferConfirmed", () => {
    it("transitions payment_indicated → settled", () => {
      seedSessionWithTransfer({ status: "payment_indicated" });
      useGroupSessionStore.getState().markTransferConfirmed("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("settled");
    });

    it("sets confirmedAt timestamp", () => {
      const before = Date.now();
      seedSessionWithTransfer({ status: "payment_indicated" });
      useGroupSessionStore.getState().markTransferConfirmed("session-1", "t1");
      const after = Date.now();

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.confirmedAt).toBeDefined();
      expect(t.confirmedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(t.confirmedAt!.getTime()).toBeLessThanOrEqual(after);
    });

    it("records a settlement_received transaction in wallet", () => {
      // user-a (current user) is the recipient
      seedSessionWithTransfer({
        status: "payment_indicated",
        fromUserId: "user-b",
        toUserId: "user-a",
      });
      useGroupSessionStore.getState().markTransferConfirmed("session-1", "t1");

      expect(
        useWalletStore
          .getState()
          .transactions.some((t) => t.type === "settlement_received"),
      ).toBe(true);
    });

    it("is no-op when transfer is not payment_indicated", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferConfirmed("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("pending"); // unchanged
    });
  });

  // ── markTransferOverdue ───────────────────────────────────────────────────

  describe("markTransferOverdue", () => {
    it("transitions pending → overdue", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferOverdue("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("overdue");
    });

    it("penalizes reputation when current user is the payer", () => {
      // user-a is current user and fromUserId (payer)
      seedSessionWithTransfer({
        status: "pending",
        fromUserId: "user-a",
        amount: 500,
      });
      useGroupSessionStore.getState().markTransferOverdue("session-1", "t1");

      const rep = useAuthStore.getState().user!.reputation;
      expect(rep.paymentsMissed).toBe(1);
      expect(rep.totalOwedMissed).toBe(500);
    });

    it("does not penalize reputation when current user is the recipient", () => {
      // user-a is recipient, user-b is payer
      seedSessionWithTransfer({
        status: "pending",
        fromUserId: "user-b",
        toUserId: "user-a",
      });
      useGroupSessionStore.getState().markTransferOverdue("session-1", "t1");

      const rep = useAuthStore.getState().user!.reputation;
      expect(rep.paymentsMissed).toBe(0);
      expect(rep.totalOwedMissed).toBe(0);
    });

    it("is no-op when transfer is not pending", () => {
      seedSessionWithTransfer({ status: "overdue" });
      const repBefore = { ...useAuthStore.getState().user!.reputation };

      useGroupSessionStore.getState().markTransferOverdue("session-1", "t1");

      // Status unchanged; no double-penalty
      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("overdue");
      expect(useAuthStore.getState().user!.reputation.paymentsMissed).toBe(
        repBefore.paymentsMissed,
      );
    });
  });

  // ── markTransferDisputed ──────────────────────────────────────────────────

  describe("markTransferDisputed", () => {
    it("sets status to disputed from pending", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore.getState().markTransferDisputed("session-1", "t1");

      expect(
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0]
          .status,
      ).toBe("disputed");
    });

    it("sets status to disputed from payment_indicated", () => {
      seedSessionWithTransfer({ status: "payment_indicated" });
      useGroupSessionStore.getState().markTransferDisputed("session-1", "t1");

      expect(
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0]
          .status,
      ).toBe("disputed");
    });
  });

  // ── getSessionsWithPendingTransfers ───────────────────────────────────────

  describe("getSessionsWithPendingTransfers", () => {
    const makeSession = (
      id: string,
      transferStatus: SessionTransfer["status"],
      fromUserId: string,
      toUserId: string,
    ): GroupSession => ({
      id,
      cadence: "daily",
      stakePerParticipant: 500,
      poolTotal: 1000,
      startedAt: new Date(),
      endsAt: new Date(),
      status: "surrendered",
      completedAt: new Date(),
      participants: [],
      transfers: [
        {
          id: `${id}-t`,
          fromUserId,
          fromUserName: "From",
          toUserId,
          toUserName: "To",
          amount: 500,
          status: transferStatus,
          createdAt: new Date(),
        },
      ],
    });

    it("returns sessions where user is the payer with actionable transfer", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [makeSession("s1", "pending", "user-a", "user-b")],
      });
      expect(
        useGroupSessionStore
          .getState()
          .getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(1);
    });

    it("returns sessions where user is the recipient with actionable transfer", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [
          makeSession("s1", "payment_indicated", "user-b", "user-a"),
        ],
      });
      expect(
        useGroupSessionStore
          .getState()
          .getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(1);
    });

    it("includes overdue transfers as actionable", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [makeSession("s1", "overdue", "user-a", "user-b")],
      });
      expect(
        useGroupSessionStore
          .getState()
          .getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(1);
    });

    it("excludes settled transfers", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [makeSession("s1", "settled", "user-a", "user-b")],
      });
      expect(
        useGroupSessionStore
          .getState()
          .getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(0);
    });

    it("excludes disputed transfers", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [
          makeSession("s1", "disputed", "user-a", "user-b"),
        ],
      });
      expect(
        useGroupSessionStore
          .getState()
          .getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(0);
    });

    it("excludes sessions where user is not involved", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [makeSession("s1", "pending", "user-b", "user-c")],
      });
      expect(
        useGroupSessionStore
          .getState()
          .getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(0);
    });
  });

  // ── getPendingTransfersForUser ────────────────────────────────────────────

  describe("getPendingTransfersForUser", () => {
    it("returns flat list of {session, transfer} pairs", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [
          {
            id: "s1",
            cadence: "daily",
            stakePerParticipant: 500,
            poolTotal: 1000,
            startedAt: new Date(),
            endsAt: new Date(),
            status: "surrendered",
            completedAt: new Date(),
            participants: [],
            transfers: [
              {
                id: "t1",
                fromUserId: "user-a",
                fromUserName: "Alice",
                toUserId: "user-b",
                toUserName: "Bob",
                amount: 500,
                status: "pending",
                createdAt: new Date(),
              },
            ],
          },
          {
            id: "s2",
            cadence: "weekly",
            stakePerParticipant: 2500,
            poolTotal: 5000,
            startedAt: new Date(),
            endsAt: new Date(),
            status: "surrendered",
            completedAt: new Date(),
            participants: [],
            transfers: [
              {
                id: "t2",
                fromUserId: "user-a",
                fromUserName: "Alice",
                toUserId: "user-c",
                toUserName: "Charlie",
                amount: 2500,
                status: "overdue",
                createdAt: new Date(),
              },
            ],
          },
        ],
      });

      const result = useGroupSessionStore
        .getState()
        .getPendingTransfersForUser("user-a");
      expect(result).toHaveLength(2);
      expect(result[0].session.id).toBe("s1");
      expect(result[0].transfer.id).toBe("t1");
      expect(result[1].session.id).toBe("s2");
      expect(result[1].transfer.id).toBe("t2");
    });

    it("returns empty array when no pending transfers", () => {
      expect(
        useGroupSessionStore.getState().getPendingTransfersForUser("user-a"),
      ).toHaveLength(0);
    });

    it("excludes settled and disputed transfers", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [
          {
            id: "s1",
            cadence: "daily",
            stakePerParticipant: 500,
            poolTotal: 1000,
            startedAt: new Date(),
            endsAt: new Date(),
            status: "completed",
            completedAt: new Date(),
            participants: [],
            transfers: [
              {
                id: "t-settled",
                fromUserId: "user-b",
                fromUserName: "Bob",
                toUserId: "user-a",
                toUserName: "Alice",
                amount: 500,
                status: "settled",
                createdAt: new Date(),
              },
              {
                id: "t-disputed",
                fromUserId: "user-b",
                fromUserName: "Bob",
                toUserId: "user-a",
                toUserName: "Alice",
                amount: 500,
                status: "disputed",
                createdAt: new Date(),
              },
            ],
          },
        ],
      });

      expect(
        useGroupSessionStore.getState().getPendingTransfersForUser("user-a"),
      ).toHaveLength(0);
    });
  });

  // ── getVenmoPayLink ───────────────────────────────────────────────────────

  describe("getVenmoPayLink", () => {
    it("generates a valid Venmo deep link", () => {
      const link = useGroupSessionStore
        .getState()
        .getVenmoPayLink(500, "@bob", "NIYAH session");
      expect(link).toContain("venmo://paycharge");
      expect(link).toContain("txn=pay");
      expect(link).toContain("recipients=bob");
    });

    it("strips @ from handle", () => {
      const link = useGroupSessionStore
        .getState()
        .getVenmoPayLink(500, "@alice-test", "note");
      expect(link).toContain("recipients=alice-test");
      expect(link).not.toContain("@alice-test");
    });

    it("converts cents to dollars (500 → 5.00)", () => {
      const link = useGroupSessionStore
        .getState()
        .getVenmoPayLink(500, "@bob", "note");
      expect(link).toContain("amount=5.00");
    });

    it("converts larger amounts correctly (10000 → 100.00)", () => {
      const link = useGroupSessionStore
        .getState()
        .getVenmoPayLink(10000, "@bob", "note");
      expect(link).toContain("amount=100.00");
    });

    it("URL-encodes the note", () => {
      const link = useGroupSessionStore
        .getState()
        .getVenmoPayLink(500, "@bob", "NIYAH session & payment");
      expect(link).not.toContain(" "); // spaces encoded
      expect(link).toContain("note=");
    });

    it("works without @ prefix on handle", () => {
      const link = useGroupSessionStore
        .getState()
        .getVenmoPayLink(500, "bob", "note");
      expect(link).toContain("recipients=bob");
    });
  });
});
