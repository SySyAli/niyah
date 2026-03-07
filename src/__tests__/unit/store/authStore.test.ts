/**
 * Unit Tests for authStore.ts (Firebase-backed)
 *
 * Testing Strategy:
 * - Tests state management and store actions
 * - Firebase calls are mocked at the module level (jest.setup.ts)
 * - Focus on state transitions and consistency
 * - Login flows (Google, Apple, Email) test that state is set synchronously
 *   before returning, avoiding race conditions with onAuthStateChanged
 */

import { act } from "react";
import { useAuthStore } from "../../../store/authStore";

// We mock the firebase config module (what authStore actually imports)
// rather than the low-level native modules.
// Note: jest.mock is hoisted by babel-jest to run before imports.
jest.mock("../../../config/firebase", () => ({
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithEmailLink: jest.fn(),
  isEmailSignInLink: jest.fn(),
  sendMagicLink: jest.fn(),
  checkProfileComplete: jest.fn(),
  fetchUserProfile: jest.fn(),
  saveUserProfile: jest.fn(),
  awardReferralToUser: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()), // returns unsubscribe
}));

import {
  signInWithGoogle,
  signInWithApple,
  signInWithEmailLink,
  isEmailSignInLink,
  checkProfileComplete,
  fetchUserProfile,
  saveUserProfile,
  sendMagicLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "../../../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper: simulate an authenticated user by directly setting state
// (since actual Firebase auth is mocked)
const simulateAuthenticated = (overrides: Record<string, unknown> = {}) => {
  useAuthStore.setState({
    user: {
      id: "test-uid",
      email: "test@example.com",
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      balance: 0,
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
      authProvider: "email",
      profileComplete: true,
      ...overrides,
    },
    isAuthenticated: true,
    isInitialized: true,
    profileComplete: true,
    isLoading: false,
  });
};

describe("authStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      profileComplete: false,
      isNewUser: false,
    });
  });

  describe("initial state", () => {
    it("should have null user when not authenticated", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear user and set isAuthenticated to false", async () => {
      simulateAuthenticated();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should be safe to call when not authenticated", async () => {
      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("updateUser", () => {
    it("should update user properties when logged in", () => {
      simulateAuthenticated();

      act(() => {
        useAuthStore.getState().updateUser({
          currentStreak: 5,
          totalSessions: 10,
        });
      });

      const state = useAuthStore.getState();
      expect(state.user?.currentStreak).toBe(5);
      expect(state.user?.totalSessions).toBe(10);
    });

    it("should preserve other user properties when updating", () => {
      simulateAuthenticated({ email: "test@example.com" });

      act(() => {
        useAuthStore.getState().updateUser({ balance: 10000 });
      });

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe("test@example.com");
      expect(state.user?.balance).toBe(10000);
    });

    it("should do nothing when not logged in", () => {
      act(() => {
        useAuthStore.getState().updateUser({ currentStreak: 5 });
      });

      expect(useAuthStore.getState().user).toBeNull();
    });

    it("should allow updating multiple properties at once", () => {
      simulateAuthenticated();

      act(() => {
        useAuthStore.getState().updateUser({
          currentStreak: 7,
          longestStreak: 10,
          totalEarnings: 50000,
          completedSessions: 15,
        });
      });

      const state = useAuthStore.getState();
      expect(state.user?.currentStreak).toBe(7);
      expect(state.user?.longestStreak).toBe(10);
      expect(state.user?.totalEarnings).toBe(50000);
      expect(state.user?.completedSessions).toBe(15);
    });
  });

  describe("updateReputation", () => {
    it("should update reputation with correct score calculation", () => {
      simulateAuthenticated();

      act(() => {
        useAuthStore.getState().updateReputation({
          paymentsCompleted: 8,
          paymentsMissed: 2,
        });
      });

      const rep = useAuthStore.getState().user?.reputation;
      expect(rep?.paymentsCompleted).toBe(8);
      expect(rep?.paymentsMissed).toBe(2);
      // successRate = 8/10 = 0.8, score = 50 + (0.8 - 0.5) * 100 = 80
      expect(rep?.score).toBe(80);
      expect(rep?.level).toBe("tree");
    });

    it("should clamp score between 0 and 100", () => {
      simulateAuthenticated();

      act(() => {
        useAuthStore.getState().updateReputation({
          paymentsCompleted: 10,
          paymentsMissed: 0,
        });
      });

      const rep = useAuthStore.getState().user?.reputation;
      // successRate = 1.0, score = 50 + (1.0 - 0.5) * 100 = 100
      expect(rep?.score).toBe(100);
      expect(rep?.level).toBe("oak");
    });
  });

  describe("setVenmoHandle", () => {
    it("should set venmo handle on user", () => {
      simulateAuthenticated();

      act(() => {
        useAuthStore.getState().setVenmoHandle("@test-user");
      });

      expect(useAuthStore.getState().user?.venmoHandle).toBe("@test-user");
    });

    it("should do nothing when not logged in", () => {
      act(() => {
        useAuthStore.getState().setVenmoHandle("@test-user");
      });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe("state consistency", () => {
    it("should maintain consistent state through auth cycles", async () => {
      // Simulate login
      simulateAuthenticated({ email: "test@example.com" });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await useAuthStore.getState().logout();
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();

      // Login again
      simulateAuthenticated({ email: "another@example.com" });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe("another@example.com");
    });
  });

  // ==========================================================================
  // Login flow tests — verify state is set synchronously before returning,
  // so routing decisions in auth-entry.tsx read correct values.
  // ==========================================================================

  describe("loginWithGoogle", () => {
    const mockFirebaseUser = {
      uid: "google-uid-123",
      email: "user@gmail.com",
      displayName: "Google User",
      photoURL: "https://photo.url/pic.jpg",
      phoneNumber: null,
      providerId: "google.com",
      isNewUser: false,
    };

    it("should set firebaseUser, user, and isAuthenticated before returning", async () => {
      jest.mocked(signInWithGoogle).mockResolvedValueOnce(mockFirebaseUser);
      // No Firestore profile → new user
      jest.mocked(fetchUserProfile).mockResolvedValueOnce(null);

      await act(async () => {
        await useAuthStore.getState().loginWithGoogle();
      });

      const state = useAuthStore.getState();
      expect(state.firebaseUser).toEqual(mockFirebaseUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).not.toBeNull();
      expect(state.user?.email).toBe("user@gmail.com");
      expect(state.isLoading).toBe(false);
    });

    it("should set profileComplete=true for returning user with Firestore profile", async () => {
      jest.mocked(signInWithGoogle).mockResolvedValueOnce(mockFirebaseUser);
      // Firestore has a complete profile
      jest.mocked(fetchUserProfile).mockResolvedValueOnce({
        __id: "google-uid-123",
        firstName: "Google",
        lastName: "User",
        email: "user@gmail.com",
        name: "Google User",
        profileComplete: true,
        authProvider: "google",
        reputation: { score: 50, level: "sapling" },
        stats: {},
      });

      await act(async () => {
        await useAuthStore.getState().loginWithGoogle();
      });

      const state = useAuthStore.getState();
      expect(state.profileComplete).toBe(true);
      expect(state.isNewUser).toBe(false);
      // Returning user should go to (tabs), not profile-setup
      expect(state.user?.profileComplete).toBe(true);
    });

    it("should set profileComplete=false and isNewUser=true for new user", async () => {
      jest.mocked(signInWithGoogle).mockResolvedValueOnce({
        ...mockFirebaseUser,
        isNewUser: true,
      });
      // No Firestore doc exists yet
      jest.mocked(fetchUserProfile).mockResolvedValueOnce(null);

      await act(async () => {
        await useAuthStore.getState().loginWithGoogle();
      });

      const state = useAuthStore.getState();
      expect(state.profileComplete).toBe(false);
      expect(state.isNewUser).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(state.firebaseUser?.email).toBe("user@gmail.com");
    });

    it("should still set auth state if Firestore fetch fails", async () => {
      jest.mocked(signInWithGoogle).mockResolvedValueOnce(mockFirebaseUser);
      // Firestore fails (e.g. offline)
      jest
        .mocked(fetchUserProfile)
        .mockRejectedValueOnce(
          new Error("Failed to get document because the client is offline."),
        );

      await act(async () => {
        await useAuthStore.getState().loginWithGoogle();
      });

      const state = useAuthStore.getState();
      // Should still be authenticated with firebaseUser populated
      expect(state.isAuthenticated).toBe(true);
      expect(state.firebaseUser).toEqual(mockFirebaseUser);
      expect(state.user?.email).toBe("user@gmail.com");
      // Profile treated as incomplete since Firestore was unreachable
      expect(state.profileComplete).toBe(false);
      expect(state.isNewUser).toBe(true);
    });

    it("should propagate errors from signInWithGoogle and reset isLoading", async () => {
      jest
        .mocked(signInWithGoogle)
        .mockRejectedValueOnce(new Error("Google Sign-In was cancelled"));

      await expect(
        act(async () => {
          await useAuthStore.getState().loginWithGoogle();
        }),
      ).rejects.toThrow("Google Sign-In was cancelled");

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("loginWithApple", () => {
    const mockFirebaseUser = {
      uid: "apple-uid-456",
      email: "user@icloud.com",
      displayName: "Apple User",
      photoURL: null,
      phoneNumber: null,
      providerId: "apple.com",
      isNewUser: false,
    };

    it("should set firebaseUser, user, and isAuthenticated before returning", async () => {
      jest.mocked(signInWithApple).mockResolvedValueOnce(mockFirebaseUser);
      jest.mocked(fetchUserProfile).mockResolvedValueOnce(null);

      await act(async () => {
        await useAuthStore
          .getState()
          .loginWithApple("mock-identity-token", "mock-raw-nonce");
      });

      const state = useAuthStore.getState();
      expect(state.firebaseUser).toEqual(mockFirebaseUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe("user@icloud.com");
      expect(state.isLoading).toBe(false);
    });

    it("should set profileComplete=true for returning user with Firestore profile", async () => {
      jest.mocked(signInWithApple).mockResolvedValueOnce(mockFirebaseUser);
      jest.mocked(fetchUserProfile).mockResolvedValueOnce({
        __id: "apple-uid-456",
        firstName: "Apple",
        lastName: "User",
        email: "user@icloud.com",
        name: "Apple User",
        profileComplete: true,
        authProvider: "apple",
        reputation: { score: 50, level: "sapling" },
        stats: {},
      });

      await act(async () => {
        await useAuthStore
          .getState()
          .loginWithApple("mock-identity-token", "mock-raw-nonce");
      });

      const state = useAuthStore.getState();
      expect(state.profileComplete).toBe(true);
      expect(state.isNewUser).toBe(false);
    });

    it("should handle Firestore failure gracefully", async () => {
      jest.mocked(signInWithApple).mockResolvedValueOnce(mockFirebaseUser);
      jest.mocked(fetchUserProfile).mockRejectedValueOnce(new Error("offline"));

      await act(async () => {
        await useAuthStore
          .getState()
          .loginWithApple("mock-identity-token", "mock-raw-nonce");
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.firebaseUser).toEqual(mockFirebaseUser);
      expect(state.profileComplete).toBe(false);
    });
  });

  describe("completeEmailLink", () => {
    const mockFirebaseUser = {
      uid: "email-uid-789",
      email: "user@email.com",
      displayName: null,
      photoURL: null,
      phoneNumber: null,
      providerId: "password",
      isNewUser: true,
    };

    it("should set full auth state before returning", async () => {
      jest.mocked(isEmailSignInLink).mockReturnValueOnce(true);
      jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce("user@email.com");
      jest.mocked(signInWithEmailLink).mockResolvedValueOnce(mockFirebaseUser);
      jest.mocked(fetchUserProfile).mockResolvedValueOnce(null);

      await act(async () => {
        await useAuthStore
          .getState()
          .completeEmailLink("https://example.com/signin?link=abc");
      });

      const state = useAuthStore.getState();
      expect(state.firebaseUser).toEqual(mockFirebaseUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe("user@email.com");
      expect(state.profileComplete).toBe(false);
      expect(state.isNewUser).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("should clean up stored email after successful sign-in", async () => {
      jest.mocked(isEmailSignInLink).mockReturnValueOnce(true);
      jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce("user@email.com");
      jest.mocked(signInWithEmailLink).mockResolvedValueOnce(mockFirebaseUser);
      jest.mocked(fetchUserProfile).mockResolvedValueOnce(null);

      await act(async () => {
        await useAuthStore
          .getState()
          .completeEmailLink("https://example.com/signin?link=abc");
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "@niyah/magic_link_email",
      );
    });

    it("should throw if link is not a valid sign-in link", async () => {
      jest.mocked(isEmailSignInLink).mockReturnValueOnce(false);

      await expect(
        act(async () => {
          await useAuthStore
            .getState()
            .completeEmailLink("https://example.com/not-a-link");
        }),
      ).rejects.toThrow("Invalid email sign-in link");
    });

    it("should throw if stored email is missing", async () => {
      jest.mocked(isEmailSignInLink).mockReturnValueOnce(true);
      jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

      await expect(
        act(async () => {
          await useAuthStore
            .getState()
            .completeEmailLink("https://example.com/signin?link=abc");
        }),
      ).rejects.toThrow("Email not found");
    });
  });

  describe("completeProfile", () => {
    it("should save profile to Firestore and set profileComplete=true", async () => {
      // Set up as authenticated but profile not complete
      useAuthStore.setState({
        firebaseUser: {
          uid: "test-uid",
          email: "user@gmail.com",
          displayName: "Test User",
          photoURL: null,
          phoneNumber: null,
          providerId: "google.com",
          isNewUser: false,
        },
        isAuthenticated: true,
        profileComplete: false,
      });

      // Mock saveUserProfile and subsequent fetchUserProfile
      jest.mocked(saveUserProfile).mockResolvedValueOnce(undefined);
      jest.mocked(fetchUserProfile).mockResolvedValueOnce({
        __id: "test-uid",
        firstName: "Test",
        lastName: "User",
        email: "user@gmail.com",
        name: "Test User",
        profileComplete: true,
        authProvider: "google",
        reputation: { score: 50, level: "sapling" },
        stats: {},
      });

      await act(async () => {
        await useAuthStore.getState().completeProfile({
          firstName: "Test",
          lastName: "User",
          phone: "5551234567",
        });
      });

      const state = useAuthStore.getState();
      expect(state.profileComplete).toBe(true);
      expect(state.isNewUser).toBe(false);
      expect(state.user?.firstName).toBe("Test");
      expect(state.user?.lastName).toBe("User");
      expect(state.isLoading).toBe(false);

      // Verify saveUserProfile was called with correct data
      expect(saveUserProfile).toHaveBeenCalledWith(
        "test-uid",
        expect.objectContaining({
          firstName: "Test",
          lastName: "User",
          email: "user@gmail.com",
          phone: "5551234567",
          authProvider: "google",
        }),
      );
    });

    it("should throw if not authenticated", async () => {
      await expect(
        act(async () => {
          await useAuthStore.getState().completeProfile({
            firstName: "Test",
            lastName: "User",
          });
        }),
      ).rejects.toThrow("Not authenticated");
    });
  });

  // ─── initialize ──────────────────────────────────────────────────────────────

  describe("initialize", () => {
    it("returns an unsubscribe function", () => {
      const unsubscribe = useAuthStore.getState().initialize();
      expect(typeof unsubscribe).toBe("function");
    });

    it("sets user and isAuthenticated when Firebase fires with a user", async () => {
      const mockFirebaseUser = {
        uid: "init-uid-1",
        email: "init@example.com",
        displayName: "Init User",
        photoURL: null,
        phoneNumber: null,
        providerId: "google.com",
        isNewUser: false,
      };

      jest.mocked(fetchUserProfile).mockResolvedValueOnce({
        __id: "init-uid-1",
        name: "Init User",
        firstName: "Init",
        lastName: "User",
        email: "init@example.com",
        profileComplete: true,
        authProvider: "google",
        reputation: { score: 50, level: "sapling" },
        stats: {},
      });

      let capturedCallback: (user: unknown) => Promise<void> = async () => {};
      jest.mocked(onAuthStateChanged).mockImplementationOnce((cb) => {
        capturedCallback = cb as (user: unknown) => Promise<void>;
        return jest.fn();
      });

      useAuthStore.getState().initialize();

      await act(async () => {
        await capturedCallback(mockFirebaseUser);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
      expect(state.user?.email).toBe("init@example.com");
      expect(state.profileComplete).toBe(true);
    });

    it("clears auth state when Firebase signals sign-out (null user)", async () => {
      // Pre-populate authenticated state
      useAuthStore.setState({
        user: { id: "test-uid" } as never,
        isAuthenticated: true,
        isInitialized: true,
      });

      let capturedCallback: (user: unknown) => Promise<void> = async () => {};
      jest.mocked(onAuthStateChanged).mockImplementationOnce((cb) => {
        capturedCallback = cb as (user: unknown) => Promise<void>;
        return jest.fn();
      });

      useAuthStore.getState().initialize();

      await act(async () => {
        await capturedCallback(null);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isInitialized).toBe(true);
    });

    it("still marks as authenticated if Firestore fetch fails during init", async () => {
      const mockFirebaseUser = {
        uid: "init-uid-2",
        email: "offline@example.com",
        displayName: null,
        photoURL: null,
        phoneNumber: null,
        providerId: "email",
        isNewUser: false,
      };

      jest
        .mocked(fetchUserProfile)
        .mockRejectedValueOnce(new Error("Firestore offline"));

      let capturedCallback: (user: unknown) => Promise<void> = async () => {};
      jest.mocked(onAuthStateChanged).mockImplementationOnce((cb) => {
        capturedCallback = cb as (user: unknown) => Promise<void>;
        return jest.fn();
      });

      useAuthStore.getState().initialize();

      await act(async () => {
        await capturedCallback(mockFirebaseUser);
      });

      const state = useAuthStore.getState();
      // Must still authenticate — Firestore failure is non-fatal
      expect(state.isAuthenticated).toBe(true);
      expect(state.isInitialized).toBe(true);
      expect(state.profileComplete).toBe(false);
    });
  });

  // ─── sendEmailLink ────────────────────────────────────────────────────────────

  describe("sendEmailLink", () => {
    it("calls sendMagicLink and stores email in AsyncStorage", async () => {
      jest.mocked(sendMagicLink).mockResolvedValueOnce(undefined);

      await act(async () => {
        await useAuthStore.getState().sendEmailLink("user@test.com");
      });

      expect(sendMagicLink).toHaveBeenCalledWith("user@test.com");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@niyah/magic_link_email",
        "user@test.com",
      );
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("throws and resets isLoading when Firebase rejects", async () => {
      jest
        .mocked(sendMagicLink)
        .mockRejectedValueOnce(new Error("Invalid email domain"));

      await expect(
        act(async () => {
          await useAuthStore.getState().sendEmailLink("bad@example.com");
        }),
      ).rejects.toThrow("Invalid email domain");

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("does not store email in AsyncStorage when Firebase fails", async () => {
      jest
        .mocked(sendMagicLink)
        .mockRejectedValueOnce(new Error("Network error"));

      await expect(
        act(async () => {
          await useAuthStore.getState().sendEmailLink("fail@test.com");
        }),
      ).rejects.toThrow();

      // Email must NOT be stored if the magic link was never sent
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        "@niyah/magic_link_email",
        "fail@test.com",
      );
    });
  });

  // ─── setZelleHandle ───────────────────────────────────────────────────────────

  describe("setZelleHandle", () => {
    it("sets the Zelle handle on the authenticated user", () => {
      simulateAuthenticated();

      act(() => {
        useAuthStore.getState().setZelleHandle("user@bank.com");
      });

      expect(useAuthStore.getState().user?.zelleHandle).toBe("user@bank.com");
    });

    it("preserves all other user fields when setting Zelle handle", () => {
      simulateAuthenticated({
        email: "original@test.com",
        venmoHandle: "@venmo-user",
      });

      act(() => {
        useAuthStore.getState().setZelleHandle("zelle@bank.com");
      });

      const user = useAuthStore.getState().user!;
      expect(user.email).toBe("original@test.com");
      expect(user.venmoHandle).toBe("@venmo-user");
      expect(user.zelleHandle).toBe("zelle@bank.com");
    });

    it("does nothing when not logged in", () => {
      act(() => {
        useAuthStore.getState().setZelleHandle("user@bank.com");
      });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});
