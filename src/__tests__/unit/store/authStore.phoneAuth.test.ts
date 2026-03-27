/**
 * Tests for phone auth methods added to authStore:
 *   - sendPhoneCode
 *   - verifyPhoneCode
 */

const mockSendPhoneVerification = jest.fn();
const mockConfirmPhoneCode = jest.fn();
const mockFetchUserProfile = jest.fn();
const mockSaveUserProfile = jest.fn();
const mockInitializeNotifications = jest
  .fn()
  .mockReturnValue(Promise.resolve(() => {}));
const mockRemoveFCMToken = jest
  .fn()
  .mockReturnValue(Promise.resolve());

jest.mock("../../../config/firebase", () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  sendMagicLink: jest.fn(),
  signInWithEmailLink: jest.fn(),
  isEmailSignInLink: jest.fn(),
  sendPhoneVerification: (...args: unknown[]) =>
    mockSendPhoneVerification(...args),
  confirmPhoneCode: (...args: unknown[]) => mockConfirmPhoneCode(...args),
  fetchUserProfile: (...args: unknown[]) => mockFetchUserProfile(...args),
  saveUserProfile: (...args: unknown[]) => mockSaveUserProfile(...args),
  updateUserDoc: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../../config/notifications", () => ({
  initializeNotifications: (...args: unknown[]) =>
    mockInitializeNotifications(...args),
  removeFCMToken: (...args: unknown[]) => mockRemoveFCMToken(...args),
}));

import { useAuthStore } from "../../../store/authStore";

const INITIAL_STATE = {
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  isSigningOut: false,
  profileComplete: false,
  isNewUser: false,
  hasAcceptedCurrentLegal: false,
  phoneConfirmation: null,
};

describe("authStore phone auth", () => {
  beforeEach(() => {
    useAuthStore.setState(INITIAL_STATE);
    mockSendPhoneVerification.mockReset();
    mockConfirmPhoneCode.mockReset();
    mockFetchUserProfile.mockReset();
    mockInitializeNotifications
      .mockReset()
      .mockReturnValue(Promise.resolve(() => {}));
    mockRemoveFCMToken.mockReset().mockReturnValue(Promise.resolve());
  });

  // ── sendPhoneCode ─────────────────────────────────────────────────────────

  describe("sendPhoneCode", () => {
    it("stores confirmation result on success", async () => {
      const mockConfirmation = { verificationId: "abc123", confirm: jest.fn() };
      mockSendPhoneVerification.mockResolvedValue(mockConfirmation);

      await useAuthStore.getState().sendPhoneCode("+12025551234");

      expect(mockSendPhoneVerification).toHaveBeenCalledWith("+12025551234");
      expect(useAuthStore.getState().phoneConfirmation).toBe(mockConfirmation);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("sets isLoading true during the call", async () => {
      let resolvePromise: (v: unknown) => void;
      mockSendPhoneVerification.mockReturnValue(
        new Promise((r) => {
          resolvePromise = r;
        }),
      );

      const promise = useAuthStore.getState().sendPhoneCode("+12025551234");
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolvePromise!({ verificationId: "x", confirm: jest.fn() });
      await promise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("throws and resets isLoading on failure", async () => {
      mockSendPhoneVerification.mockRejectedValue(
        new Error("auth/too-many-requests"),
      );

      await expect(
        useAuthStore.getState().sendPhoneCode("+12025551234"),
      ).rejects.toThrow("auth/too-many-requests");

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().phoneConfirmation).toBeNull();
    });

    it("passes E.164 formatted number to firebase", async () => {
      mockSendPhoneVerification.mockResolvedValue({
        verificationId: "v1",
        confirm: jest.fn(),
      });

      await useAuthStore.getState().sendPhoneCode("+14155551234");
      expect(mockSendPhoneVerification).toHaveBeenCalledWith("+14155551234");
    });
  });

  // ── verifyPhoneCode ───────────────────────────────────────────────────────

  describe("verifyPhoneCode", () => {
    it("throws if no pending phone confirmation", async () => {
      await expect(
        useAuthStore.getState().verifyPhoneCode("123456"),
      ).rejects.toThrow("No pending phone verification");
    });

    it("signs in and sets user state on valid code", async () => {
      const mockConfirmation = { verificationId: "abc", confirm: jest.fn() };
      useAuthStore.setState({ phoneConfirmation: mockConfirmation as any });

      const firebaseUser = {
        uid: "phone-user-1",
        email: null,
        displayName: null,
        photoURL: null,
        phoneNumber: "+12025551234",
        providerId: "phone",
        isNewUser: true,
      };
      mockConfirmPhoneCode.mockResolvedValue(firebaseUser);
      mockFetchUserProfile.mockResolvedValue(null);

      await useAuthStore.getState().verifyPhoneCode("123456");

      expect(mockConfirmPhoneCode).toHaveBeenCalledWith(
        mockConfirmation,
        "123456",
      );
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().firebaseUser).toEqual(firebaseUser);
      expect(useAuthStore.getState().phoneConfirmation).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("sets isNewUser true when profile not found", async () => {
      const mockConfirmation = { verificationId: "abc", confirm: jest.fn() };
      useAuthStore.setState({ phoneConfirmation: mockConfirmation as any });

      mockConfirmPhoneCode.mockResolvedValue({
        uid: "new-phone-user",
        email: null,
        displayName: null,
        photoURL: null,
        phoneNumber: "+12025551234",
        providerId: "phone",
        isNewUser: true,
      });
      mockFetchUserProfile.mockResolvedValue(null);

      await useAuthStore.getState().verifyPhoneCode("999999");

      expect(useAuthStore.getState().isNewUser).toBe(true);
      expect(useAuthStore.getState().profileComplete).toBe(false);
    });

    it("throws and resets isLoading on invalid code", async () => {
      const mockConfirmation = { verificationId: "abc", confirm: jest.fn() };
      useAuthStore.setState({ phoneConfirmation: mockConfirmation as any });

      mockConfirmPhoneCode.mockRejectedValue(
        new Error("auth/invalid-verification-code"),
      );

      await expect(
        useAuthStore.getState().verifyPhoneCode("000000"),
      ).rejects.toThrow("auth/invalid-verification-code");

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("clears phoneConfirmation after successful verification", async () => {
      const mockConfirmation = { verificationId: "abc", confirm: jest.fn() };
      useAuthStore.setState({ phoneConfirmation: mockConfirmation as any });

      mockConfirmPhoneCode.mockResolvedValue({
        uid: "u1",
        email: null,
        displayName: null,
        photoURL: null,
        phoneNumber: "+1234",
        providerId: "phone",
        isNewUser: false,
      });
      mockFetchUserProfile.mockResolvedValue(null);

      await useAuthStore.getState().verifyPhoneCode("123456");
      expect(useAuthStore.getState().phoneConfirmation).toBeNull();
    });
  });
});
