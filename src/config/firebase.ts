import {
  NiyahFirebaseAuth,
  NiyahFirestore,
  type FirebaseUser,
} from "../../modules/niyah-firebase";
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";

// ---------------------------------------------------------------------------
// Google Sign-In configuration
// ---------------------------------------------------------------------------
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
});

// ---------------------------------------------------------------------------
// Google Sign-In → Firebase credential
// ---------------------------------------------------------------------------

/**
 * Triggers native Google Sign-In dialog and returns a Firebase user.
 * The Swift module handles signInWithCredential internally.
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    throw new Error("Google Sign-In was cancelled");
  }

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error("Failed to get ID token from Google");
  }

  return NiyahFirebaseAuth.signInWithCredential("google", idToken, null);
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Google Sign-Out error:", error);
  }
};

// ---------------------------------------------------------------------------
// Nonce helpers (required for Apple Sign-In with Firebase)
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random nonce string.
 * Returns a hex-encoded 32-byte random string (64 characters).
 */
export const generateNonce = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * SHA-256 hash a string. Returns the hex-encoded digest.
 * Used to hash the nonce before sending to Apple's signInAsync.
 */
export const sha256 = async (input: string): Promise<string> => {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
};

// ---------------------------------------------------------------------------
// Apple Sign-In → Firebase credential
// ---------------------------------------------------------------------------

/**
 * Signs in to Firebase with Apple identity token + raw nonce.
 * The Swift module calls OAuthProvider.appleCredential() internally.
 */
export const signInWithApple = async (
  identityToken: string,
  rawNonce: string,
): Promise<FirebaseUser> => {
  return NiyahFirebaseAuth.signInWithCredential(
    "apple",
    identityToken,
    rawNonce,
  );
};

// ---------------------------------------------------------------------------
// Email magic link (passwordless)
// ---------------------------------------------------------------------------

// The deep link URL the magic link will redirect to.
const MAGIC_LINK_REDIRECT_URL = Linking.createURL("auth/email-callback");

/**
 * Sends a sign-in link to the given email address.
 */
export const sendMagicLink = async (email: string): Promise<void> => {
  await NiyahFirebaseAuth.sendSignInLinkToEmail(
    email,
    MAGIC_LINK_REDIRECT_URL,
    "com.niyah.app",
  );
};

/**
 * Checks if a URL is a Firebase email sign-in link.
 */
export const isEmailSignInLink = (url: string): boolean => {
  return NiyahFirebaseAuth.isSignInWithEmailLink(url);
};

/**
 * Completes sign-in using the magic link URL and the stored email.
 */
export const signInWithEmailLink = async (
  email: string,
  url: string,
): Promise<FirebaseUser> => {
  return NiyahFirebaseAuth.signInWithEmailLink(email, url);
};

// ---------------------------------------------------------------------------
// Firebase Auth helpers
// ---------------------------------------------------------------------------

/**
 * Sign out from Firebase Auth (and Google if applicable).
 */
export const signOut = async (): Promise<void> => {
  await signOutGoogle();
  await NiyahFirebaseAuth.signOut();
};

/**
 * Get the current Firebase user (null if not signed in).
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return NiyahFirebaseAuth.getCurrentUser();
};

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export const onAuthStateChanged = (
  callback: (user: FirebaseUser | null) => void,
): (() => void) => {
  const subscription = NiyahFirebaseAuth.addListener(
    "onAuthStateChanged",
    (event) => {
      callback(event.user);
    },
  );

  return () => subscription.remove();
};

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

/**
 * Get a user's Firestore document.
 */
export const getUserDoc = async (
  uid: string,
): Promise<Record<string, unknown> | null> => {
  const doc = await NiyahFirestore.getDoc("users", uid);
  if (!doc) return null;
  return doc as Record<string, unknown>;
};

/**
 * Get a user's wallet document.
 */
export const getWalletDoc = async (
  uid: string,
): Promise<Record<string, unknown> | null> => {
  const doc = await NiyahFirestore.getDoc("wallets", uid);
  if (!doc) return null;
  return doc as Record<string, unknown>;
};

/**
 * Check if a user has completed their profile setup.
 */
export const checkProfileComplete = async (uid: string): Promise<boolean> => {
  const doc = await NiyahFirestore.getDoc("users", uid);
  if (!doc) return false;
  return doc.profileComplete === true;
};

/**
 * Save a user's profile to Firestore.
 */
export const saveUserProfile = async (
  uid: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profileImage?: string;
    authProvider: "google" | "apple" | "email";
  },
): Promise<void> => {
  const serverTs = NiyahFirestore.serverTimestamp();

  await NiyahFirestore.setDoc(
    "users",
    uid,
    {
      ...data,
      name: `${data.firstName} ${data.lastName}`.trim(),
      profileComplete: true,
      createdAt: serverTs,
      updatedAt: serverTs,
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
    },
    true, // merge
  );

  // Initialize wallet if it doesn't exist
  const wallet = await NiyahFirestore.getDoc("wallets", uid);
  if (!wallet) {
    await NiyahFirestore.setDoc(
      "wallets",
      uid,
      {
        balance: 0,
        pendingBalance: 0,
        lastUpdated: serverTs,
      },
      false,
    );
  }
};

/**
 * Fetch a user's profile from Firestore.
 */
export const fetchUserProfile = async (
  uid: string,
): Promise<Record<string, unknown> | null> => {
  return getUserDoc(uid);
};

/**
 * Increment a referrer's referralCount in Firestore and recalculate their
 * reputation score so the boost is visible the next time they open the app.
 * Fire-and-forget safe — errors are swallowed so the caller's flow is unaffected.
 */
export const awardReferralToUser = async (referrerUid: string): Promise<void> => {
  try {
    const doc = await NiyahFirestore.getDoc("users", referrerUid);
    const rep = (doc?.reputation as Record<string, number>) ?? {};

    const referralCount = (rep.referralCount ?? 0) + 1;
    const paymentsCompleted = rep.paymentsCompleted ?? 0;
    const paymentsMissed = rep.paymentsMissed ?? 0;
    const totalPayments = paymentsCompleted + paymentsMissed;

    let score = 50;
    if (totalPayments > 0) {
      const successRate = paymentsCompleted / totalPayments;
      score = Math.round(50 + (successRate - 0.5) * 100);
      score = Math.max(0, Math.min(100, score));
    }
    score = Math.min(100, score + referralCount * 10);

    const level =
      score <= 20 ? "seed"
      : score <= 40 ? "sprout"
      : score <= 60 ? "sapling"
      : score <= 80 ? "tree"
      : "oak";

    await NiyahFirestore.setDoc(
      "users",
      referrerUid,
      { reputation: { ...rep, referralCount, score, level } },
      true,
    );
  } catch (error) {
    console.warn("awardReferralToUser failed (non-critical):", error);
  }
};

// Re-export for convenience
export { statusCodes };
export type { FirebaseUser };
