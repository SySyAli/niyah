/**
 * Unit Tests for src/config/firebase.ts
 *
 * Testing Strategy:
 * - Tests the Firebase config layer directly (auth + Firestore helpers)
 * - Uses the global mocks from jest.setup.ts for all Firebase/Google/Apple SDKs
 * - Verifies correct Firestore paths, data shapes, error handling,
 *   auth credential creation, and listener setup/unsubscribe
 */

import {
  getAuth,
  signInWithCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink as rnfbIsSignInWithEmailLink,
  signInWithEmailLink as rnfbSignInWithEmailLink,
  signOut as rnfbSignOut,
  onAuthStateChanged as rnfbOnAuthStateChanged,
  GoogleAuthProvider,
  AppleAuthProvider,
} from "@react-native-firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  collection,
  where,
  limit,
  serverTimestamp,
  Timestamp,
} from "@react-native-firebase/firestore";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import * as Crypto from "expo-crypto";

// Import everything from the module under test
import {
  signInWithGoogle,
  signOutGoogle,
  generateNonce,
  sha256,
  signInWithApple,
  sendMagicLink,
  isEmailSignInLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged,
  getUserDoc,
  saveUserProfile,
  fetchUserProfile,
  awardReferralToUser,
  getFollowsDoc,
  followUser,
  unfollowUser,
  getPublicProfile,
  updateUserDoc,
  getWalletDoc,
  writeSession,
  updateSession,
  getActiveSession,
  subscribeToGroupSession,
  subscribeToGroupInvites,
  subscribeToActiveGroupSessions,
  getGroupSession,
} from "../../../config/firebase";

// ---------------------------------------------------------------------------
// Mock for ./functions (lazy-required by followUser, unfollowUser, awardReferralToUser)
// ---------------------------------------------------------------------------

const mockFollowUserCF = jest.fn(() => Promise.resolve({ success: true }));
const mockUnfollowUserCF = jest.fn(() => Promise.resolve({ success: true }));
const mockAwardReferral = jest.fn(() => Promise.resolve({ success: true }));

jest.mock("../../../config/functions", () => ({
  followUserCF: mockFollowUserCF,
  unfollowUserCF: mockUnfollowUserCF,
  awardReferral: mockAwardReferral,
}));

// Cast mocks for type-safe assertions
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockQuery = query as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockWhere = where as jest.Mock;
const mockLimit = limit as jest.Mock;
const mockSignInWithCredential = signInWithCredential as jest.Mock;
const mockSendSignInLinkToEmail = sendSignInLinkToEmail as jest.Mock;
const mockRnfbIsSignInWithEmailLink = rnfbIsSignInWithEmailLink as jest.Mock;
const mockRnfbSignInWithEmailLink = rnfbSignInWithEmailLink as jest.Mock;
const mockRnfbSignOut = rnfbSignOut as jest.Mock;
const mockRnfbOnAuthStateChanged = rnfbOnAuthStateChanged as jest.Mock;
const mockGoogleAuthProviderCredential =
  GoogleAuthProvider.credential as jest.Mock;
const mockAppleAuthProviderCredential =
  AppleAuthProvider.credential as jest.Mock;
const mockGoogleSignIn = GoogleSignin.signIn as jest.Mock;
const mockGoogleSignOut = GoogleSignin.signOut as jest.Mock;
const mockHasPlayServices = GoogleSignin.hasPlayServices as jest.Mock;
const mockIsSuccessResponse = isSuccessResponse as unknown as jest.Mock;
const mockTimestampFromDate = Timestamp.fromDate as jest.Mock;
const mockServerTimestamp = serverTimestamp as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Firestore document snapshot */
const mockDocSnapshot = (
  exists: boolean,
  id: string,
  data: Record<string, unknown> | null = null,
) => ({
  exists,
  id,
  data: () => data,
});

/** Build a mock Firestore query snapshot */
const mockQuerySnapshot = (
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
) => ({
  empty: docs.length === 0,
  docs,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("firebase config layer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore defaults that the global setup sets
    mockGetDoc.mockResolvedValue({
      exists: false,
      id: "mock-id",
      data: () => null,
    });
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockOnSnapshot.mockReturnValue(jest.fn()); // unsubscribe
  });

  // =========================================================================
  // AUTH: Google Sign-In
  // =========================================================================

  describe("signInWithGoogle", () => {
    it("signs in successfully and returns mapped FirebaseUser", async () => {
      mockGoogleSignIn.mockResolvedValue({
        type: "success",
        data: { idToken: "google-id-token-123" },
      });
      mockIsSuccessResponse.mockReturnValue(true);
      mockGoogleAuthProviderCredential.mockReturnValue("google-cred");
      mockSignInWithCredential.mockResolvedValue({
        user: {
          uid: "uid-123",
          email: "user@gmail.com",
          displayName: "Test User",
          photoURL: "https://photo.url",
          phoneNumber: "+1234567890",
          providerId: "google.com",
        },
        additionalUserInfo: { isNewUser: true },
      });

      const user = await signInWithGoogle();

      expect(mockHasPlayServices).toHaveBeenCalledWith({
        showPlayServicesUpdateDialog: true,
      });
      expect(mockGoogleSignIn).toHaveBeenCalled();
      expect(mockGoogleAuthProviderCredential).toHaveBeenCalledWith(
        "google-id-token-123",
      );
      expect(mockSignInWithCredential).toHaveBeenCalledWith(
        expect.anything(), // authInstance
        "google-cred",
      );

      expect(user).toEqual({
        uid: "uid-123",
        email: "user@gmail.com",
        displayName: "Test User",
        photoURL: "https://photo.url",
        phoneNumber: "+1234567890",
        providerId: "google.com",
        isNewUser: true,
      });
    });

    it("throws when Google Sign-In is cancelled", async () => {
      mockGoogleSignIn.mockResolvedValue({ type: "cancelled" });
      mockIsSuccessResponse.mockReturnValue(false);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        message: "Google Sign-In was cancelled",
        code: "SIGN_IN_CANCELLED",
      });
    });

    it("throws when idToken is missing", async () => {
      mockGoogleSignIn.mockResolvedValue({
        type: "success",
        data: { idToken: null },
      });
      mockIsSuccessResponse.mockReturnValue(true);

      await expect(signInWithGoogle()).rejects.toThrow(
        "Failed to get ID token from Google",
      );
    });

    it("maps isNewUser as false when additionalUserInfo is missing", async () => {
      mockGoogleSignIn.mockResolvedValue({
        type: "success",
        data: { idToken: "token" },
      });
      mockIsSuccessResponse.mockReturnValue(true);
      mockGoogleAuthProviderCredential.mockReturnValue("cred");
      mockSignInWithCredential.mockResolvedValue({
        user: {
          uid: "uid-1",
          email: null,
          displayName: null,
          photoURL: null,
          phoneNumber: null,
          providerId: "google.com",
        },
        additionalUserInfo: undefined,
      });

      const user = await signInWithGoogle();
      expect(user.isNewUser).toBe(false);
    });
  });

  // =========================================================================
  // AUTH: signOutGoogle
  // =========================================================================

  describe("signOutGoogle", () => {
    it("calls GoogleSignin.signOut()", async () => {
      mockGoogleSignOut.mockResolvedValue(undefined);
      await signOutGoogle();
      expect(mockGoogleSignOut).toHaveBeenCalled();
    });

    it("swallows errors from GoogleSignin.signOut()", async () => {
      mockGoogleSignOut.mockRejectedValue(new Error("network error"));
      // Should not throw
      await expect(signOutGoogle()).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // AUTH: Nonce helpers
  // =========================================================================

  describe("generateNonce", () => {
    it("generates a hex string from random bytes", async () => {
      const nonce = await generateNonce();
      // The mock returns 32 bytes all filled with 0xab
      expect(nonce).toHaveLength(64); // 32 bytes * 2 hex chars
      expect(nonce).toMatch(/^[0-9a-f]+$/);
      expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
    });
  });

  describe("sha256", () => {
    it("delegates to Crypto.digestStringAsync with SHA256", async () => {
      const result = await sha256("test-input");
      expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
        Crypto.CryptoDigestAlgorithm.SHA256,
        "test-input",
      );
      expect(result).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      );
    });
  });

  // =========================================================================
  // AUTH: Apple Sign-In
  // =========================================================================

  describe("signInWithApple", () => {
    it("creates Apple credential and signs in with Firebase", async () => {
      mockAppleAuthProviderCredential.mockReturnValue("apple-cred");
      mockSignInWithCredential.mockResolvedValue({
        user: {
          uid: "apple-uid",
          email: "user@icloud.com",
          displayName: "Apple User",
          photoURL: null,
          phoneNumber: null,
          providerId: "apple.com",
        },
        additionalUserInfo: { isNewUser: false },
      });

      const user = await signInWithApple("identity-token-abc", "raw-nonce-xyz");

      expect(mockAppleAuthProviderCredential).toHaveBeenCalledWith(
        "identity-token-abc",
        "raw-nonce-xyz",
      );
      expect(mockSignInWithCredential).toHaveBeenCalledWith(
        expect.anything(),
        "apple-cred",
      );
      expect(user).toEqual({
        uid: "apple-uid",
        email: "user@icloud.com",
        displayName: "Apple User",
        photoURL: null,
        phoneNumber: null,
        providerId: "apple.com",
        isNewUser: false,
      });
    });

    it("maps isNewUser true when additionalUserInfo.isNewUser is true", async () => {
      mockAppleAuthProviderCredential.mockReturnValue("cred");
      mockSignInWithCredential.mockResolvedValue({
        user: {
          uid: "u",
          email: null,
          displayName: null,
          photoURL: null,
          phoneNumber: null,
          providerId: "apple.com",
        },
        additionalUserInfo: { isNewUser: true },
      });

      const user = await signInWithApple("tok", "nonce");
      expect(user.isNewUser).toBe(true);
    });
  });

  // =========================================================================
  // AUTH: Email magic link
  // =========================================================================

  describe("sendMagicLink", () => {
    it("calls sendSignInLinkToEmail with correct config", async () => {
      mockSendSignInLinkToEmail.mockResolvedValue(undefined);
      await sendMagicLink("user@example.com");

      expect(mockSendSignInLinkToEmail).toHaveBeenCalledWith(
        expect.anything(), // authInstance
        "user@example.com",
        expect.objectContaining({
          url: "niyah://auth/email-callback",
          handleCodeInApp: true,
          iOS: { bundleId: "com.niyah.app" },
          android: { packageName: "com.niyah.app", installApp: false },
        }),
      );
    });
  });

  describe("isEmailSignInLink", () => {
    it("delegates to rnfb isSignInWithEmailLink", async () => {
      mockRnfbIsSignInWithEmailLink.mockResolvedValue(true);
      const result = await isEmailSignInLink("https://link.example.com");

      expect(mockRnfbIsSignInWithEmailLink).toHaveBeenCalledWith(
        expect.anything(),
        "https://link.example.com",
      );
      expect(result).toBe(true);
    });

    it("returns false for non-sign-in links", async () => {
      mockRnfbIsSignInWithEmailLink.mockResolvedValue(false);
      const result = await isEmailSignInLink("https://random.url");
      expect(result).toBe(false);
    });
  });

  describe("signInWithEmailLink", () => {
    it("signs in and returns mapped FirebaseUser", async () => {
      mockRnfbSignInWithEmailLink.mockResolvedValue({
        user: {
          uid: "email-uid",
          email: "user@example.com",
          displayName: null,
          photoURL: null,
          phoneNumber: null,
          providerId: "password",
        },
        additionalUserInfo: { isNewUser: true },
      });

      const user = await signInWithEmailLink(
        "user@example.com",
        "https://link.example.com?oobCode=abc",
      );

      expect(mockRnfbSignInWithEmailLink).toHaveBeenCalledWith(
        expect.anything(),
        "user@example.com",
        "https://link.example.com?oobCode=abc",
      );
      expect(user).toEqual({
        uid: "email-uid",
        email: "user@example.com",
        displayName: null,
        photoURL: null,
        phoneNumber: null,
        providerId: "password",
        isNewUser: true,
      });
    });
  });

  // =========================================================================
  // AUTH: signOut
  // =========================================================================

  describe("signOut", () => {
    it("signs out from both Google and Firebase", async () => {
      mockGoogleSignOut.mockResolvedValue(undefined);
      mockRnfbSignOut.mockResolvedValue(undefined);

      await signOut();

      expect(mockGoogleSignOut).toHaveBeenCalled();
      expect(mockRnfbSignOut).toHaveBeenCalledWith(expect.anything());
    });

    it("still signs out from Firebase even if Google signOut fails", async () => {
      mockGoogleSignOut.mockRejectedValue(new Error("google error"));
      mockRnfbSignOut.mockResolvedValue(undefined);

      await signOut();

      // signOutGoogle swallows the error, so rnfbSignOut should still be called
      expect(mockRnfbSignOut).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // AUTH: onAuthStateChanged
  // =========================================================================

  describe("onAuthStateChanged", () => {
    it("registers listener and maps non-null user", () => {
      const mockUnsubscribe = jest.fn();
      mockRnfbOnAuthStateChanged.mockImplementation(
        (_auth: unknown, cb: (u: unknown) => void) => {
          // Simulate Firebase calling back with a user
          cb({
            uid: "auth-uid",
            email: "auth@test.com",
            displayName: "Auth User",
            photoURL: "https://photo",
            phoneNumber: null,
            providerId: "google.com",
          });
          return mockUnsubscribe;
        },
      );

      const callback = jest.fn();
      const unsub = onAuthStateChanged(callback);

      expect(mockRnfbOnAuthStateChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalledWith({
        uid: "auth-uid",
        email: "auth@test.com",
        displayName: "Auth User",
        photoURL: "https://photo",
        phoneNumber: null,
        providerId: "google.com",
        isNewUser: false,
      });
      expect(unsub).toBe(mockUnsubscribe);
    });

    it("passes null to callback when user is null", () => {
      mockRnfbOnAuthStateChanged.mockImplementation(
        (_auth: unknown, cb: (u: unknown) => void) => {
          cb(null);
          return jest.fn();
        },
      );

      const callback = jest.fn();
      onAuthStateChanged(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  // =========================================================================
  // FIRESTORE: getUserDoc
  // =========================================================================

  describe("getUserDoc", () => {
    it("returns null when document does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "uid-1"));

      const result = await getUserDoc("uid-1");

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "users", "uid-1");
      expect(result).toBeNull();
    });

    it("returns doc data with __id when document exists", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "uid-2", {
          name: "Test User",
          email: "test@test.com",
        }),
      );

      const result = await getUserDoc("uid-2");

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "users", "uid-2");
      expect(result).toEqual({
        __id: "uid-2",
        name: "Test User",
        email: "test@test.com",
      });
    });
  });

  // =========================================================================
  // FIRESTORE: saveUserProfile
  // =========================================================================

  describe("saveUserProfile", () => {
    const profileData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1234567890",
      profileImage: "https://img.url/pic.jpg",
      authProvider: "google" as const,
    };

    it("writes user doc with merged profile data, reputation, and stats", async () => {
      // wallet doc does not exist -> should create it
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "uid-save"));

      await saveUserProfile("uid-save", profileData);

      // First call to setDoc = user doc
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(), // doc ref
        expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "+1234567890",
          profileImage: "https://img.url/pic.jpg",
          authProvider: "google",
          name: "John Doe",
          profileComplete: true,
          createdAt: "mock-server-timestamp",
          updatedAt: "mock-server-timestamp",
          reputation: {
            score: 50,
            level: "sapling",
            paymentsCompleted: 0,
            paymentsMissed: 0,
            totalOwedPaid: 0,
            totalOwedMissed: 0,
          },
          stats: {
            currentStreak: 0,
            longestStreak: 0,
            totalSessions: 0,
            completedSessions: 0,
            totalEarnings: 0,
          },
        }),
        { merge: true },
      );

      // doc() should be called for users and wallets collections
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "users",
        "uid-save",
      );
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "wallets",
        "uid-save",
      );
    });

    it("creates wallet doc when it does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "uid-w"));

      await saveUserProfile("uid-w", profileData);

      // Second setDoc call = wallet doc creation
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          balance: 0,
          pendingBalance: 0,
          lastUpdated: "mock-server-timestamp",
        }),
      );
    });

    it("does not create wallet doc when it already exists", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "uid-w", { balance: 100 }),
      );

      await saveUserProfile("uid-w", profileData);

      // Only one setDoc call for the user doc
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    it("trims the generated name field", async () => {
      const dataNoLastName = {
        ...profileData,
        firstName: "Solo",
        lastName: "",
      };

      mockGetDoc.mockResolvedValue(mockDocSnapshot(true, "uid-n"));

      await saveUserProfile("uid-n", dataNoLastName);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: "Solo",
        }),
        { merge: true },
      );
    });
  });

  // =========================================================================
  // FIRESTORE: fetchUserProfile
  // =========================================================================

  describe("fetchUserProfile", () => {
    it("delegates to getUserDoc", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "uid-fp", { name: "FP User" }),
      );

      const result = await fetchUserProfile("uid-fp");

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "users",
        "uid-fp",
      );
      expect(result).toEqual({ __id: "uid-fp", name: "FP User" });
    });

    it("returns null when user does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "uid-none"));

      const result = await fetchUserProfile("uid-none");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // FIRESTORE: awardReferralToUser
  // =========================================================================

  describe("awardReferralToUser", () => {
    it("calls the awardReferral Cloud Function", async () => {
      await awardReferralToUser("referrer-uid");
      expect(mockAwardReferral).toHaveBeenCalledWith("referrer-uid");
    });

    it("swallows errors (fire-and-forget)", async () => {
      const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockAwardReferral.mockRejectedValue(new Error("CF error"));
      // Should not throw
      await expect(awardReferralToUser("uid")).resolves.toBeUndefined();
      spy.mockRestore();
    });
  });

  // =========================================================================
  // FIRESTORE: getFollowsDoc
  // =========================================================================

  describe("getFollowsDoc", () => {
    it("returns empty arrays when doc does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "uid-f"));

      const result = await getFollowsDoc("uid-f");

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "userFollows",
        "uid-f",
      );
      expect(result).toEqual({ following: [], followers: [] });
    });

    it("returns following and followers from existing doc", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "uid-f2", {
          following: ["a", "b"],
          followers: ["c"],
        }),
      );

      const result = await getFollowsDoc("uid-f2");
      expect(result).toEqual({
        following: ["a", "b"],
        followers: ["c"],
      });
    });

    it("defaults missing arrays to empty", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(true, "uid-f3", {}));

      const result = await getFollowsDoc("uid-f3");
      expect(result).toEqual({ following: [], followers: [] });
    });

    it("handles data() returning null on existing doc", async () => {
      mockGetDoc.mockResolvedValue({
        exists: true,
        id: "uid-f4",
        data: () => null,
      });

      const result = await getFollowsDoc("uid-f4");
      expect(result).toEqual({ following: [], followers: [] });
    });
  });

  // =========================================================================
  // FIRESTORE: followUser / unfollowUser
  // =========================================================================

  describe("followUser", () => {
    it("delegates to followUserCF Cloud Function", async () => {
      await followUser("my-uid", "target-uid");
      expect(mockFollowUserCF).toHaveBeenCalledWith("target-uid");
    });
  });

  describe("unfollowUser", () => {
    it("delegates to unfollowUserCF Cloud Function", async () => {
      await unfollowUser("my-uid", "target-uid");
      expect(mockUnfollowUserCF).toHaveBeenCalledWith("target-uid");
    });
  });

  // =========================================================================
  // FIRESTORE: getPublicProfile
  // =========================================================================

  describe("getPublicProfile", () => {
    it("returns null when user does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "uid-pp"));

      const result = await getPublicProfile("uid-pp");
      expect(result).toBeNull();
    });

    it("returns public-only fields from existing user", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "uid-pp2", {
          name: "Public User",
          email: "private@example.com", // should not appear in output
          reputation: {
            score: 80,
            level: "oak",
            referralCount: 5,
            paymentsCompleted: 10, // not in public shape
          },
          stats: {
            currentStreak: 7,
            totalSessions: 20,
            completedSessions: 18,
            totalEarnings: 500, // not in public shape
          },
        }),
      );

      const result = await getPublicProfile("uid-pp2");

      expect(result).toEqual({
        uid: "uid-pp2",
        name: "Public User",
        reputation: {
          score: 80,
          level: "oak",
          referralCount: 5,
        },
        currentStreak: 7,
        totalSessions: 20,
        completedSessions: 18,
      });
    });

    it("defaults missing reputation and stats fields", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "uid-pp3", {
          name: "Minimal User",
        }),
      );

      const result = await getPublicProfile("uid-pp3");

      expect(result).toEqual({
        uid: "uid-pp3",
        name: "Minimal User",
        reputation: {
          score: 50,
          level: "sapling",
          referralCount: 0,
        },
        currentStreak: 0,
        totalSessions: 0,
        completedSessions: 0,
      });
    });

    it("defaults name to empty string when missing", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(true, "uid-pp4", {}));

      const result = await getPublicProfile("uid-pp4");

      expect(result!.name).toBe("");
    });
  });

  // =========================================================================
  // FIRESTORE: updateUserDoc
  // =========================================================================

  describe("updateUserDoc", () => {
    it("calls setDoc with merge and adds updatedAt timestamp", async () => {
      await updateUserDoc("uid-u", { handle: "@newhandle", level: "oak" });

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "users", "uid-u");
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          handle: "@newhandle",
          level: "oak",
          updatedAt: "mock-server-timestamp",
        }),
        { merge: true },
      );
    });
  });

  // =========================================================================
  // FIRESTORE: getWalletDoc
  // =========================================================================

  describe("getWalletDoc", () => {
    it("returns null when wallet does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "uid-w"));

      const result = await getWalletDoc("uid-w");

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "wallets",
        "uid-w",
      );
      expect(result).toBeNull();
    });

    it("returns balance and pendingBalance from existing wallet", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "uid-w2", {
          balance: 5000,
          pendingBalance: 250,
          lastUpdated: "some-timestamp",
        }),
      );

      const result = await getWalletDoc("uid-w2");

      expect(result).toEqual({
        balance: 5000,
        pendingBalance: 250,
      });
    });

    it("defaults missing fields to 0", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(true, "uid-w3", {}));

      const result = await getWalletDoc("uid-w3");

      expect(result).toEqual({ balance: 0, pendingBalance: 0 });
    });

    it("handles data() returning null on existing doc", async () => {
      mockGetDoc.mockResolvedValue({
        exists: true,
        id: "uid-w4",
        data: () => null,
      });

      const result = await getWalletDoc("uid-w4");

      expect(result).toEqual({ balance: 0, pendingBalance: 0 });
    });
  });

  // =========================================================================
  // FIRESTORE: writeSession
  // =========================================================================

  describe("writeSession", () => {
    it("writes session doc with Timestamps and correct collection", async () => {
      const startedAt = new Date("2025-01-15T10:00:00Z");
      const endsAt = new Date("2025-01-15T10:30:00Z");

      mockTimestampFromDate.mockImplementation((d: Date) => ({
        toDate: () => d,
        seconds: Math.floor(d.getTime() / 1000),
      }));

      await writeSession("session-1", {
        userId: "uid-s",
        cadence: "30min",
        stakeAmount: 500,
        potentialPayout: 600,
        startedAt,
        endsAt,
        status: "active",
      });

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "sessions",
        "session-1",
      );
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "uid-s",
          cadence: "30min",
          stakeAmount: 500,
          potentialPayout: 600,
          status: "active",
          createdAt: "mock-server-timestamp",
        }),
      );

      // Verify Timestamp.fromDate was called for both dates
      expect(mockTimestampFromDate).toHaveBeenCalledWith(startedAt);
      expect(mockTimestampFromDate).toHaveBeenCalledWith(endsAt);
    });
  });

  // =========================================================================
  // FIRESTORE: updateSession
  // =========================================================================

  describe("updateSession", () => {
    it("updates session status with updatedAt timestamp", async () => {
      await updateSession("session-2", { status: "completed" });

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "sessions",
        "session-2",
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: "completed",
          updatedAt: "mock-server-timestamp",
        }),
      );
    });

    it("adds completedAt Timestamp when completedAt date is provided", async () => {
      const completedAt = new Date("2025-01-15T10:30:00Z");
      mockTimestampFromDate.mockImplementation((d: Date) => ({
        toDate: () => d,
        seconds: Math.floor(d.getTime() / 1000),
      }));

      await updateSession("session-3", {
        status: "completed",
        completedAt,
      });

      expect(mockTimestampFromDate).toHaveBeenCalledWith(completedAt);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: "completed",
          updatedAt: "mock-server-timestamp",
          completedAt: expect.objectContaining({
            seconds: Math.floor(completedAt.getTime() / 1000),
          }),
        }),
      );
    });

    it("does not include completedAt when not provided", async () => {
      await updateSession("session-4", { status: "forfeited" });

      const updateData = mockUpdateDoc.mock.calls[0][1];
      expect(updateData).not.toHaveProperty("completedAt");
    });
  });

  // =========================================================================
  // FIRESTORE: getActiveSession
  // =========================================================================

  describe("getActiveSession", () => {
    it("returns null when no active session exists", async () => {
      mockGetDocs.mockResolvedValue(mockQuerySnapshot([]));

      const result = await getActiveSession("uid-as");

      expect(mockQuery).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        "sessions",
      );
      expect(mockWhere).toHaveBeenCalledWith("userId", "==", "uid-as");
      expect(mockWhere).toHaveBeenCalledWith("status", "==", "active");
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toBeNull();
    });

    it("returns active session with Timestamps converted to Dates", async () => {
      const startDate = new Date("2025-01-15T10:00:00Z");
      const endDate = new Date("2025-01-15T10:30:00Z");

      mockGetDocs.mockResolvedValue(
        mockQuerySnapshot([
          {
            id: "active-session-1",
            data: () => ({
              cadence: "30min",
              stakeAmount: 500,
              potentialPayout: 600,
              startedAt: { toDate: () => startDate },
              endsAt: { toDate: () => endDate },
              status: "active",
            }),
          },
        ]),
      );

      const result = await getActiveSession("uid-as2");

      expect(result).toEqual({
        id: "active-session-1",
        cadence: "30min",
        stakeAmount: 500,
        potentialPayout: 600,
        startedAt: startDate,
        endsAt: endDate,
        status: "active",
      });
    });
  });

  // =========================================================================
  // GROUP: subscribeToGroupSession
  // =========================================================================

  describe("subscribeToGroupSession", () => {
    it("sets up onSnapshot listener on correct doc path", () => {
      const mockUnsub = jest.fn();
      mockOnSnapshot.mockReturnValue(mockUnsub);

      const callback = jest.fn();
      const unsub = subscribeToGroupSession("gs-1", callback);

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "groupSessions",
        "gs-1",
      );
      expect(mockOnSnapshot).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Function),
      );
      expect(unsub).toBe(mockUnsub);
    });

    it("invokes callback with null when doc does not exist", () => {
      mockOnSnapshot.mockImplementation((_ref: unknown, cb: Function) => {
        cb({ exists: false, id: "gs-2", data: () => null });
        return jest.fn();
      });

      const callback = jest.fn();
      subscribeToGroupSession("gs-2", callback);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it("invokes callback with doc data and __id when doc exists", () => {
      mockOnSnapshot.mockImplementation((_ref: unknown, cb: Function) => {
        cb({
          exists: true,
          id: "gs-3",
          data: () => ({ status: "active", hostId: "host-1" }),
        });
        return jest.fn();
      });

      const callback = jest.fn();
      subscribeToGroupSession("gs-3", callback);

      expect(callback).toHaveBeenCalledWith({
        __id: "gs-3",
        status: "active",
        hostId: "host-1",
      });
    });
  });

  // =========================================================================
  // GROUP: subscribeToGroupInvites
  // =========================================================================

  describe("subscribeToGroupInvites", () => {
    it("sets up query with correct filters", () => {
      const mockUnsub = jest.fn();
      mockOnSnapshot.mockReturnValue(mockUnsub);

      const callback = jest.fn();
      const unsub = subscribeToGroupInvites("uid-gi", callback);

      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        "groupInvites",
      );
      expect(mockWhere).toHaveBeenCalledWith("toUserId", "==", "uid-gi");
      expect(mockWhere).toHaveBeenCalledWith("status", "==", "pending");
      expect(mockQuery).toHaveBeenCalled();
      expect(unsub).toBe(mockUnsub);
    });

    it("invokes callback with mapped invite docs", () => {
      mockOnSnapshot.mockImplementation((_ref: unknown, cb: Function) => {
        cb({
          docs: [
            {
              id: "invite-1",
              data: () => ({
                fromUserId: "sender-1",
                toUserId: "uid-gi",
                status: "pending",
              }),
            },
            {
              id: "invite-2",
              data: () => ({
                fromUserId: "sender-2",
                toUserId: "uid-gi",
                status: "pending",
              }),
            },
          ],
        });
        return jest.fn();
      });

      const callback = jest.fn();
      subscribeToGroupInvites("uid-gi", callback);

      expect(callback).toHaveBeenCalledWith([
        {
          __id: "invite-1",
          fromUserId: "sender-1",
          toUserId: "uid-gi",
          status: "pending",
        },
        {
          __id: "invite-2",
          fromUserId: "sender-2",
          toUserId: "uid-gi",
          status: "pending",
        },
      ]);
    });

    it("invokes callback with empty array when snap is null", () => {
      mockOnSnapshot.mockImplementation((_ref: unknown, cb: Function) => {
        cb(null);
        return jest.fn();
      });

      const callback = jest.fn();
      subscribeToGroupInvites("uid-gi", callback);

      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  // =========================================================================
  // GROUP: subscribeToActiveGroupSessions
  // =========================================================================

  describe("subscribeToActiveGroupSessions", () => {
    it("sets up query with array-contains and in filters", () => {
      const mockUnsub = jest.fn();
      mockOnSnapshot.mockReturnValue(mockUnsub);

      const callback = jest.fn();
      const unsub = subscribeToActiveGroupSessions("uid-ags", callback);

      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        "groupSessions",
      );
      expect(mockWhere).toHaveBeenCalledWith(
        "participantIds",
        "array-contains",
        "uid-ags",
      );
      expect(mockWhere).toHaveBeenCalledWith("status", "in", [
        "pending",
        "ready",
        "active",
      ]);
      expect(unsub).toBe(mockUnsub);
    });

    it("invokes callback with mapped session docs", () => {
      mockOnSnapshot.mockImplementation((_ref: unknown, cb: Function) => {
        cb({
          docs: [
            {
              id: "gs-active-1",
              data: () => ({
                status: "active",
                participantIds: ["uid-ags", "uid-2"],
              }),
            },
          ],
        });
        return jest.fn();
      });

      const callback = jest.fn();
      subscribeToActiveGroupSessions("uid-ags", callback);

      expect(callback).toHaveBeenCalledWith([
        {
          __id: "gs-active-1",
          status: "active",
          participantIds: ["uid-ags", "uid-2"],
        },
      ]);
    });

    it("invokes callback with empty array when snap is null", () => {
      mockOnSnapshot.mockImplementation((_ref: unknown, cb: Function) => {
        cb(null);
        return jest.fn();
      });

      const callback = jest.fn();
      subscribeToActiveGroupSessions("uid-ags", callback);

      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  // =========================================================================
  // GROUP: getGroupSession
  // =========================================================================

  describe("getGroupSession", () => {
    it("returns null when group session does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockDocSnapshot(false, "gs-none"));

      const result = await getGroupSession("gs-none");

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "groupSessions",
        "gs-none",
      );
      expect(result).toBeNull();
    });

    it("returns doc data with __id when group session exists", async () => {
      mockGetDoc.mockResolvedValue(
        mockDocSnapshot(true, "gs-exist", {
          status: "pending",
          hostId: "host-uid",
          participantIds: ["host-uid", "p2"],
        }),
      );

      const result = await getGroupSession("gs-exist");

      expect(result).toEqual({
        __id: "gs-exist",
        status: "pending",
        hostId: "host-uid",
        participantIds: ["host-uid", "p2"],
      });
    });
  });
});
