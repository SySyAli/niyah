/**
 * sessionStore — Cloud Sync Tests (DEMO_MODE=false)
 *
 * The production code paths that call cloudForfeit / cloudComplete are
 * dead-code in DEMO_MODE=true. This separate file overrides the constant so
 * those branches are exercised without affecting the main sessionStore tests.
 *
 * Security focus:
 * - Cloud functions are called with the correct sessionId + stakeAmount
 * - Local state is correct regardless of whether the cloud call succeeds/fails
 *   (local state is the source of truth; cloud sync is fire-and-forget)
 */

// MUST be declared before imports — babel-jest hoists jest.mock() calls
jest.mock("../../../constants/config", () => ({
  ...jest.requireActual("../../../constants/config"),
  DEMO_MODE: false,
}));

jest.mock("../../../config/functions", () => ({
  handleSessionComplete: jest.fn(),
  handleSessionForfeit: jest.fn(),
}));

import { useSessionStore } from "../../../store/sessionStore";
import { useWalletStore } from "../../../store/walletStore";
import { useAuthStore } from "../../../store/authStore";
import { CADENCES, INITIAL_BALANCE } from "../../../constants/config";
import {
  handleSessionComplete,
  handleSessionForfeit,
} from "../../../config/functions";

const makeUser = () => ({
  id: "cloud-test-user",
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
    level: "sapling" as const,
    paymentsCompleted: 0,
    paymentsMissed: 0,
    totalOwedPaid: 0,
    totalOwedMissed: 0,
    lastUpdated: new Date(),
    referralCount: 0,
  },
});

describe("sessionStore — cloud sync (DEMO_MODE=false)", () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentSession: null,
      sessionHistory: [],
      isBlocking: false,
    });
    useWalletStore.setState({
      balance: INITIAL_BALANCE,
      transactions: [],
      pendingWithdrawal: 0,
    });
    useAuthStore.setState({
      user: makeUser(),
      isAuthenticated: true,
      isLoading: false,
    });

    jest.mocked(handleSessionComplete).mockResolvedValue({
      newBalance: INITIAL_BALANCE,
      payout: CADENCES.daily.stake,
    });
    jest.mocked(handleSessionForfeit).mockResolvedValue({ success: true });
  });

  // ─── completeSession ─────────────────────────────────────────────────────────

  describe("completeSession", () => {
    it("calls cloudComplete with correct sessionId and stakeAmount", async () => {
      useSessionStore.getState().startSession("daily");
      const { id: sessionId, stakeAmount } =
        useSessionStore.getState().currentSession!;

      useSessionStore.getState().completeSession();

      // cloudComplete is non-blocking; wait for it
      await Promise.resolve();

      expect(handleSessionComplete).toHaveBeenCalledWith(
        sessionId,
        stakeAmount,
      );
    });

    it("local state is correct even if cloud call fails", async () => {
      jest
        .mocked(handleSessionComplete)
        .mockRejectedValueOnce(new Error("Server error"));

      useSessionStore.getState().startSession("daily");
      const stake = CADENCES.daily.stake;

      useSessionStore.getState().completeSession();
      await Promise.resolve();

      // Local state must reflect completion regardless of cloud failure
      const state = useSessionStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.isBlocking).toBe(false);
      expect(state.sessionHistory[0].status).toBe("completed");
      // Payout credited to wallet locally
      expect(useWalletStore.getState().balance).toBe(
        INITIAL_BALANCE - stake + stake,
      );
    });

    it("does not call cloudForfeit when completing a session", async () => {
      useSessionStore.getState().startSession("daily");
      useSessionStore.getState().completeSession();
      await Promise.resolve();

      expect(handleSessionForfeit).not.toHaveBeenCalled();
    });
  });

  // ─── surrenderSession ────────────────────────────────────────────────────────

  describe("surrenderSession", () => {
    it("calls cloudForfeit with correct sessionId and stakeAmount", async () => {
      useSessionStore.getState().startSession("weekly");
      const { id: sessionId, stakeAmount } =
        useSessionStore.getState().currentSession!;

      useSessionStore.getState().surrenderSession();
      await Promise.resolve();

      expect(handleSessionForfeit).toHaveBeenCalledWith(sessionId, stakeAmount);
    });

    it("local state shows surrender even if cloud call fails", async () => {
      jest
        .mocked(handleSessionForfeit)
        .mockRejectedValueOnce(new Error("Timeout"));

      useSessionStore.getState().startSession("daily");
      useSessionStore.getState().surrenderSession();
      await Promise.resolve();

      const state = useSessionStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.isBlocking).toBe(false);
      expect(state.sessionHistory[0].status).toBe("surrendered");
    });

    it("does not call cloudComplete when surrendering", async () => {
      useSessionStore.getState().startSession("daily");
      useSessionStore.getState().surrenderSession();
      await Promise.resolve();

      expect(handleSessionComplete).not.toHaveBeenCalled();
    });

    it("stake amount passed to cloudForfeit matches what was deducted from wallet", async () => {
      useSessionStore.getState().startSession("monthly");
      const expectedStake = CADENCES.monthly.stake;
      const walletAfterStart = useWalletStore.getState().balance;
      expect(walletAfterStart).toBe(INITIAL_BALANCE - expectedStake);

      useSessionStore.getState().surrenderSession();
      await Promise.resolve();

      expect(handleSessionForfeit).toHaveBeenCalledWith(
        expect.any(String),
        expectedStake,
      );
    });
  });
});
