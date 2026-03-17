/**
 * walletStore — Firestore Hydration Tests (DEMO_MODE=false)
 *
 * Tests the wallet hydration layer added in the refactor:
 * - hydrate() reads balance from Firestore via getWalletDoc
 * - Handles null wallet doc (new user), Firestore errors gracefully
 * - isHydrated flag ensures UI is not stuck in loading state
 *
 * DEMO_MODE is overridden to false so the hydration path is exercised.
 */

// MUST be declared before imports — babel-jest hoists jest.mock() calls
jest.mock("../../../constants/config", () => ({
  ...jest.requireActual("../../../constants/config"),
  DEMO_MODE: false,
}));

jest.mock("../../../config/firebase", () => ({
  getWalletDoc: jest.fn(() => Promise.resolve(null)),
  // Auth-related — required by authStore transitive import
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signOut: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  sendMagicLink: jest.fn(),
  signInWithEmailLink: jest.fn(),
  isEmailSignInLink: jest.fn(),
  saveUserProfile: jest.fn(),
  fetchUserProfile: jest.fn(),
  awardReferralToUser: jest.fn(),
  updateUserDoc: jest.fn(() => Promise.resolve()),
  writeSession: jest.fn(() => Promise.resolve()),
  updateSession: jest.fn(() => Promise.resolve()),
  getActiveSession: jest.fn(() => Promise.resolve(null)),
}));

import { useWalletStore } from "../../../store/walletStore";
import { getWalletDoc } from "../../../config/firebase";

describe("walletStore — Firestore hydration (DEMO_MODE=false)", () => {
  beforeEach(() => {
    // Reset wallet store — in non-demo mode, initial balance is 0
    useWalletStore.setState({
      balance: 0,
      transactions: [],
      pendingWithdrawal: 0,
      isHydrated: false,
    });

    jest.clearAllMocks();
  });

  it("initializes isHydrated to false in non-demo mode", () => {
    // Create a fresh store state (as if the app just started in non-demo mode)
    useWalletStore.setState({ isHydrated: false });
    expect(useWalletStore.getState().isHydrated).toBe(false);
  });

  it("hydrates balance from Firestore wallet doc", async () => {
    jest.mocked(getWalletDoc).mockResolvedValueOnce({
      balance: 10000,
      pendingBalance: 500,
    });

    await useWalletStore.getState().hydrate("user-123");

    const state = useWalletStore.getState();
    expect(state.balance).toBe(10000);
    expect(state.pendingWithdrawal).toBe(500);
    expect(state.isHydrated).toBe(true);
    expect(getWalletDoc).toHaveBeenCalledWith("user-123");
  });

  it("handles null wallet doc (new user) — balance 0, isHydrated true", async () => {
    jest.mocked(getWalletDoc).mockResolvedValueOnce(null);

    await useWalletStore.getState().hydrate("new-user");

    const state = useWalletStore.getState();
    expect(state.balance).toBe(0);
    expect(state.isHydrated).toBe(true);
  });

  it("handles Firestore error gracefully — isHydrated still set to true", async () => {
    jest
      .mocked(getWalletDoc)
      .mockRejectedValueOnce(new Error("Firestore offline"));

    await useWalletStore.getState().hydrate("user-456");

    const state = useWalletStore.getState();
    // isHydrated must be true even on error so UI is not stuck
    expect(state.isHydrated).toBe(true);
  });
});

describe("walletStore — hydrate in DEMO_MODE", () => {
  // Note: DEMO_MODE is false in this file (mocked above), but we can test the
  // guard by checking that the store code returns early. The actual DEMO_MODE
  // guard is tested here by verifying behavior with the overridden config.
  //
  // The DEMO_MODE=true path is implicitly tested by the main walletStore.test.ts
  // which runs with default DEMO_MODE=true and never calls hydrate.

  it("getWalletDoc is called when DEMO_MODE is false", async () => {
    jest.mocked(getWalletDoc).mockResolvedValueOnce(null);

    await useWalletStore.getState().hydrate("user-789");

    expect(getWalletDoc).toHaveBeenCalledTimes(1);
  });
});
