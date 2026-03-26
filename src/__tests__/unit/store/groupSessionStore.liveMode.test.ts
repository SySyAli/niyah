jest.mock("../../../constants/config", () => ({
  ...jest.requireActual("../../../constants/config"),
  DEMO_MODE: false,
}));

const mockWarn = jest.fn();

jest.mock("../../../utils/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => mockWarn(...args),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { CADENCES, INITIAL_BALANCE } from "../../../constants/config";
import { useAuthStore } from "../../../store/authStore";
import { useGroupSessionStore } from "../../../store/groupSessionStore";
import { useWalletStore } from "../../../store/walletStore";
import type { UserReputation } from "../../../types";

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

const resetStores = () => {
  mockWarn.mockClear();

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

describe("groupSessionStore live mode legacy fallback", () => {
  beforeEach(resetStores);

  it("still starts solo sessions through the legacy local path", () => {
    useGroupSessionStore.getState().startGroupSession("daily", [P_A]);

    const state = useGroupSessionStore.getState();

    expect(state.activeGroupSession).not.toBeNull();
    expect(state.activeGroupSession?.participants).toHaveLength(1);
    expect(state.activeGroupSession?.stakePerParticipant).toBe(
      CADENCES.daily.stake,
    );
    expect(useWalletStore.getState().balance).toBe(
      INITIAL_BALANCE - CADENCES.daily.stake,
    );
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("still blocks legacy multi-user sessions in live mode", () => {
    useGroupSessionStore.getState().startGroupSession("daily", [P_A, P_B]);

    expect(useGroupSessionStore.getState().activeGroupSession).toBeNull();
    expect(useWalletStore.getState().balance).toBe(INITIAL_BALANCE);
    expect(mockWarn).toHaveBeenCalledWith(
      "startGroupSession called in live mode — use proposeSession instead",
    );
  });
});
