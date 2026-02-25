/**
 * Unit Tests for sessionStore.ts
 *
 * Testing Strategy:
 * - WHITE BOX: Tests session state machine transitions
 * - Integration with walletStore and authStore
 * - Time-based calculations
 * - Session lifecycle testing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { act } from "react";
import { useSessionStore } from "../../../store/sessionStore";
import { useWalletStore } from "../../../store/walletStore";
import { useAuthStore } from "../../../store/authStore";
import {
  CADENCES,
  DEMO_MODE,
  INITIAL_BALANCE,
} from "../../../constants/config";

describe("sessionStore", () => {
  beforeEach(() => {
    // Reset session store
    useSessionStore.setState({
      currentSession: null,
      sessionHistory: [],
      isBlocking: false,
    });

    // Reset wallet store
    useWalletStore.setState({
      balance: INITIAL_BALANCE,
      transactions: [
        {
          id: "initial",
          type: "deposit",
          amount: INITIAL_BALANCE,
          description: "Welcome bonus",
          createdAt: new Date(),
        },
      ],
      pendingWithdrawal: 0,
    });

    // Setup a logged in user
    useAuthStore.setState({
      user: {
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
        balance: INITIAL_BALANCE,
        currentStreak: 0,
        longestStreak: 0,
        totalSessions: 0,
        completedSessions: 0,
        totalEarnings: 0,
        createdAt: new Date(),
        reputation: {
          score: 50,
          level: "sapling",
          paymentsCompleted: 0,
          paymentsMissed: 0,
          totalOwedPaid: 0,
          totalOwedMissed: 0,
          lastUpdated: new Date(),
          referralCount: 0,
        },
      },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe("initial state", () => {
    it("should have no current session", () => {
      const state = useSessionStore.getState();
      expect(state.currentSession).toBeNull();
    });

    it("should have empty session history", () => {
      const state = useSessionStore.getState();
      expect(state.sessionHistory).toEqual([]);
    });

    it("should not be blocking", () => {
      const state = useSessionStore.getState();
      expect(state.isBlocking).toBe(false);
    });
  });

  describe("startSession", () => {
    describe("daily cadence", () => {
      it("should create session with correct stake and payout", () => {
        const store = useSessionStore.getState();

        act(() => {
          store.startSession("daily");
        });

        const session = useSessionStore.getState().currentSession;
        expect(session).not.toBeNull();
        expect(session?.cadence).toBe("daily");
        expect(session?.stakeAmount).toBe(CADENCES.daily.stake);
        expect(session?.potentialPayout).toBe(CADENCES.daily.stake);
      });

      it("should set demo duration in DEMO_MODE", () => {
        const store = useSessionStore.getState();

        act(() => {
          store.startSession("daily");
        });

        const session = useSessionStore.getState().currentSession;
        const expectedDuration = DEMO_MODE
          ? CADENCES.daily.demoDuration
          : CADENCES.daily.duration;

        // endsAt should be startedAt + expectedDuration
        expect(session?.endsAt.getTime()).toBe(
          session!.startedAt.getTime() + expectedDuration,
        );
      });
    });

    describe("weekly cadence", () => {
      it("should create session with correct stake and payout", () => {
        const store = useSessionStore.getState();

        act(() => {
          store.startSession("weekly");
        });

        const session = useSessionStore.getState().currentSession;
        expect(session?.cadence).toBe("weekly");
        expect(session?.stakeAmount).toBe(CADENCES.weekly.stake);
        expect(session?.potentialPayout).toBe(CADENCES.weekly.stake);
      });
    });

    describe("monthly cadence", () => {
      it("should create session with correct stake and payout", () => {
        const store = useSessionStore.getState();

        act(() => {
          store.startSession("monthly");
        });

        const session = useSessionStore.getState().currentSession;
        expect(session?.cadence).toBe("monthly");
        expect(session?.stakeAmount).toBe(CADENCES.monthly.stake);
        expect(session?.potentialPayout).toBe(CADENCES.monthly.stake);
      });
    });

    it("should set session status to active", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.startSession("daily");
      });

      expect(useSessionStore.getState().currentSession?.status).toBe("active");
    });

    it("should set startedAt to approximately current time", () => {
      const beforeStart = Date.now();
      const store = useSessionStore.getState();

      act(() => {
        store.startSession("daily");
      });

      const afterStart = Date.now();
      const startedAt = useSessionStore
        .getState()
        .currentSession?.startedAt.getTime();

      expect(startedAt).toBeGreaterThanOrEqual(beforeStart);
      expect(startedAt).toBeLessThanOrEqual(afterStart);
    });

    it("should enable blocking mode", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.startSession("daily");
      });

      expect(useSessionStore.getState().isBlocking).toBe(true);
    });

    it("should deduct stake from wallet", () => {
      const store = useSessionStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      act(() => {
        store.startSession("daily");
      });

      expect(useWalletStore.getState().balance).toBe(
        initialBalance - CADENCES.daily.stake,
      );
    });

    it("should generate unique session ID", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.startSession("daily");
      });

      const id1 = useSessionStore.getState().currentSession?.id;
      expect(id1).toBeDefined();
      expect(id1?.length).toBeGreaterThan(0);
    });
  });

  describe("surrenderSession", () => {
    beforeEach(() => {
      // Start a session first
      act(() => {
        useSessionStore.getState().startSession("daily");
      });
    });

    it("should clear current session", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.surrenderSession();
      });

      expect(useSessionStore.getState().currentSession).toBeNull();
    });

    it("should disable blocking mode", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.surrenderSession();
      });

      expect(useSessionStore.getState().isBlocking).toBe(false);
    });

    it("should add completed session to history with surrendered status", () => {
      const store = useSessionStore.getState();
      const sessionId = useSessionStore.getState().currentSession?.id;

      act(() => {
        store.surrenderSession();
      });

      const history = useSessionStore.getState().sessionHistory;
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(sessionId);
      expect(history[0].status).toBe("surrendered");
      expect(history[0].actualPayout).toBe(0);
    });

    it("should set completedAt time", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.surrenderSession();
      });

      const completedSession = useSessionStore.getState().sessionHistory[0];
      expect(completedSession.completedAt).toBeDefined();
    });

    it("should reset user streak to 0", () => {
      // Set a streak first
      useAuthStore.getState().updateUser({ currentStreak: 5 });

      const store = useSessionStore.getState();

      act(() => {
        store.surrenderSession();
      });

      expect(useAuthStore.getState().user?.currentStreak).toBe(0);
    });

    it("should increment totalSessions", () => {
      const initialTotal = useAuthStore.getState().user?.totalSessions || 0;
      const store = useSessionStore.getState();

      act(() => {
        store.surrenderSession();
      });

      expect(useAuthStore.getState().user?.totalSessions).toBe(
        initialTotal + 1,
      );
    });

    it("should record forfeit in wallet", () => {
      const store = useSessionStore.getState();
      const transactionsBefore = useWalletStore.getState().transactions.length;

      act(() => {
        store.surrenderSession();
      });

      const transactions = useWalletStore.getState().transactions;
      expect(transactions.length).toBe(transactionsBefore + 1);
      expect(transactions[0].type).toBe("forfeit");
    });

    it("should do nothing if no current session", () => {
      const store = useSessionStore.getState();

      // First surrender
      act(() => {
        store.surrenderSession();
      });

      const historyLengthAfterFirst =
        useSessionStore.getState().sessionHistory.length;

      // Try to surrender again
      act(() => {
        store.surrenderSession();
      });

      // Should not add another entry
      expect(useSessionStore.getState().sessionHistory.length).toBe(
        historyLengthAfterFirst,
      );
    });
  });

  describe("completeSession", () => {
    beforeEach(() => {
      act(() => {
        useSessionStore.getState().startSession("daily");
      });
    });

    it("should clear current session", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useSessionStore.getState().currentSession).toBeNull();
    });

    it("should disable blocking mode", () => {
      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useSessionStore.getState().isBlocking).toBe(false);
    });

    it("should add session to history with completed status", () => {
      const store = useSessionStore.getState();
      const sessionId = useSessionStore.getState().currentSession?.id;

      act(() => {
        store.completeSession();
      });

      const history = useSessionStore.getState().sessionHistory;
      expect(history[0].id).toBe(sessionId);
      expect(history[0].status).toBe("completed");
    });

    it("should set actualPayout to potentialPayout", () => {
      const store = useSessionStore.getState();
      const potentialPayout =
        useSessionStore.getState().currentSession?.potentialPayout;

      act(() => {
        store.completeSession();
      });

      expect(useSessionStore.getState().sessionHistory[0].actualPayout).toBe(
        potentialPayout,
      );
    });

    it("should increment currentStreak", () => {
      const initialStreak = useAuthStore.getState().user?.currentStreak || 0;
      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useAuthStore.getState().user?.currentStreak).toBe(
        initialStreak + 1,
      );
    });

    it("should update longestStreak if current exceeds it", () => {
      useAuthStore
        .getState()
        .updateUser({ currentStreak: 5, longestStreak: 5 });

      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useAuthStore.getState().user?.longestStreak).toBe(6);
    });

    it("should not update longestStreak if current is less", () => {
      useAuthStore
        .getState()
        .updateUser({ currentStreak: 2, longestStreak: 10 });

      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useAuthStore.getState().user?.longestStreak).toBe(10);
    });

    it("should increment totalSessions and completedSessions", () => {
      const initialTotal = useAuthStore.getState().user?.totalSessions || 0;
      const initialCompleted =
        useAuthStore.getState().user?.completedSessions || 0;

      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useAuthStore.getState().user?.totalSessions).toBe(
        initialTotal + 1,
      );
      expect(useAuthStore.getState().user?.completedSessions).toBe(
        initialCompleted + 1,
      );
    });

    it("should add payout to totalEarnings", () => {
      const initialEarnings = useAuthStore.getState().user?.totalEarnings || 0;
      const payout =
        useSessionStore.getState().currentSession?.potentialPayout || 0;

      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useAuthStore.getState().user?.totalEarnings).toBe(
        initialEarnings + payout,
      );
    });

    it("should credit payout to wallet", () => {
      const balanceBefore = useWalletStore.getState().balance;
      const payout =
        useSessionStore.getState().currentSession?.potentialPayout || 0;

      const store = useSessionStore.getState();

      act(() => {
        store.completeSession();
      });

      expect(useWalletStore.getState().balance).toBe(balanceBefore + payout);
    });
  });

  describe("getTimeRemaining", () => {
    it("should return 0 when no current session", () => {
      const store = useSessionStore.getState();
      expect(store.getTimeRemaining()).toBe(0);
    });

    it("should return correct time remaining", () => {
      act(() => {
        useSessionStore.getState().startSession("daily");
      });

      const store = useSessionStore.getState();
      const expectedDuration = DEMO_MODE
        ? CADENCES.daily.demoDuration
        : CADENCES.daily.duration;

      expect(store.getTimeRemaining()).toBe(expectedDuration);
    });

    it("should return time remaining close to duration", () => {
      act(() => {
        useSessionStore.getState().startSession("daily");
      });

      const store = useSessionStore.getState();
      const expectedDuration = DEMO_MODE
        ? CADENCES.daily.demoDuration
        : CADENCES.daily.duration;

      // Time remaining should be close to expected duration
      expect(store.getTimeRemaining()).toBeGreaterThan(expectedDuration - 1000);
      expect(store.getTimeRemaining()).toBeLessThanOrEqual(expectedDuration);
    });
  });

  describe("session history ordering", () => {
    it("should prepend new sessions to history (most recent first)", () => {
      const store = useSessionStore.getState();

      // Complete first session
      act(() => {
        store.startSession("daily");
      });
      act(() => {
        store.completeSession();
      });

      // Complete second session
      act(() => {
        store.startSession("weekly");
      });
      act(() => {
        store.completeSession();
      });

      const history = useSessionStore.getState().sessionHistory;
      expect(history[0].cadence).toBe("weekly"); // Most recent
      expect(history[1].cadence).toBe("daily");
    });
  });

  describe("full session lifecycle", () => {
    it("should handle complete successful session flow", () => {
      const store = useSessionStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      // Start session
      act(() => {
        store.startSession("daily");
      });

      expect(useSessionStore.getState().currentSession).not.toBeNull();
      expect(useWalletStore.getState().balance).toBe(
        initialBalance - CADENCES.daily.stake,
      );

      // Complete session
      act(() => {
        store.completeSession();
      });

      // Balance should be initial + (payout - stake) = initial + net gain
      const netGain = CADENCES.daily.stake - CADENCES.daily.stake;
      expect(useWalletStore.getState().balance).toBe(initialBalance + netGain);
      expect(useAuthStore.getState().user?.currentStreak).toBe(1);
    });

    it("should handle surrendered session flow", () => {
      const store = useSessionStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      // Start session
      act(() => {
        store.startSession("daily");
      });

      // Surrender session
      act(() => {
        store.surrenderSession();
      });

      // Balance should be reduced by stake (no payout)
      expect(useWalletStore.getState().balance).toBe(
        initialBalance - CADENCES.daily.stake,
      );
      expect(useAuthStore.getState().user?.currentStreak).toBe(0);
    });
  });
});
