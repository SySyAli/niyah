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

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
});

// ---------------------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------------------

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

export const generateNonce = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const sha256 = async (input: string): Promise<string> => {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
};

// ---------------------------------------------------------------------------
// Apple Sign-In
// ---------------------------------------------------------------------------

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

const MAGIC_LINK_REDIRECT_URL = Linking.createURL("auth/email-callback");

export const sendMagicLink = async (email: string): Promise<void> => {
  await NiyahFirebaseAuth.sendSignInLinkToEmail(
    email,
    MAGIC_LINK_REDIRECT_URL,
    "com.niyah.app",
  );
};

export const isEmailSignInLink = (url: string): boolean => {
  return NiyahFirebaseAuth.isSignInWithEmailLink(url);
};

export const signInWithEmailLink = async (
  email: string,
  url: string,
): Promise<FirebaseUser> => {
  return NiyahFirebaseAuth.signInWithEmailLink(email, url);
};

// ---------------------------------------------------------------------------
// Firebase Auth helpers
// ---------------------------------------------------------------------------

export const signOut = async (): Promise<void> => {
  await signOutGoogle();
  await NiyahFirebaseAuth.signOut();
};

export const getCurrentUser = (): FirebaseUser | null => {
  return NiyahFirebaseAuth.getCurrentUser();
};

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

export const getUserDoc = async (
  uid: string,
): Promise<Record<string, unknown> | null> => {
  const doc = await NiyahFirestore.getDoc("users", uid);
  if (!doc) return null;
  return doc as Record<string, unknown>;
};

export const getWalletDoc = async (
  uid: string,
): Promise<Record<string, unknown> | null> => {
  const doc = await NiyahFirestore.getDoc("wallets", uid);
  if (!doc) return null;
  return doc as Record<string, unknown>;
};

export const checkProfileComplete = async (uid: string): Promise<boolean> => {
  const doc = await NiyahFirestore.getDoc("users", uid);
  if (!doc) return false;
  return doc.profileComplete === true;
};

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

export const fetchUserProfile = async (
  uid: string,
): Promise<Record<string, unknown> | null> => {
  return getUserDoc(uid);
};

// Fire-and-forget safe — errors are swallowed so the caller's flow is unaffected.
export const awardReferralToUser = async (
  referrerUid: string,
): Promise<void> => {
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
      score <= 20
        ? "seed"
        : score <= 40
          ? "sprout"
          : score <= 60
            ? "sapling"
            : score <= 80
              ? "tree"
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

// ---------------------------------------------------------------------------
// Social / follows helpers
// ---------------------------------------------------------------------------

interface FollowsDoc extends Record<string, unknown> {
  following: string[];
  followers: string[];
}

export const getFollowsDoc = async (uid: string): Promise<FollowsDoc> => {
  const doc = await NiyahFirestore.getDoc("userFollows", uid);
  if (!doc) return { following: [], followers: [] };
  return {
    following: (doc.following as string[]) ?? [],
    followers: (doc.followers as string[]) ?? [],
  };
};

export const followUser = async (
  myUid: string,
  targetUid: string,
): Promise<void> => {
  const [myDoc, targetDoc] = await Promise.all([
    getFollowsDoc(myUid),
    getFollowsDoc(targetUid),
  ]);

  if (!myDoc.following.includes(targetUid)) {
    myDoc.following = [...myDoc.following, targetUid];
  }
  if (!targetDoc.followers.includes(myUid)) {
    targetDoc.followers = [...targetDoc.followers, myUid];
  }

  await Promise.all([
    NiyahFirestore.setDoc("userFollows", myUid, myDoc, true),
    NiyahFirestore.setDoc("userFollows", targetUid, targetDoc, true),
  ]);
};

export const unfollowUser = async (
  myUid: string,
  targetUid: string,
): Promise<void> => {
  const [myDoc, targetDoc] = await Promise.all([
    getFollowsDoc(myUid),
    getFollowsDoc(targetUid),
  ]);

  myDoc.following = myDoc.following.filter((uid) => uid !== targetUid);
  targetDoc.followers = targetDoc.followers.filter((uid) => uid !== myUid);

  await Promise.all([
    NiyahFirestore.setDoc("userFollows", myUid, myDoc, true),
    NiyahFirestore.setDoc("userFollows", targetUid, targetDoc, true),
  ]);
};

export const getPublicProfile = async (
  uid: string,
): Promise<{
  uid: string;
  name: string;
  reputation: { score: number; level: string; referralCount: number };
  currentStreak: number;
  totalSessions: number;
  completedSessions: number;
} | null> => {
  const doc = await fetchUserProfile(uid);
  if (!doc) return null;

  const rep = (doc.reputation as Record<string, unknown>) ?? {};
  const stats = (doc.stats as Record<string, number>) ?? {};

  return {
    uid,
    name: (doc.name as string) || "",
    reputation: {
      score: (rep.score as number) ?? 50,
      level: (rep.level as string) ?? "sapling",
      referralCount: (rep.referralCount as number) ?? 0,
    },
    currentStreak: stats.currentStreak ?? 0,
    totalSessions: stats.totalSessions ?? 0,
    completedSessions: stats.completedSessions ?? 0,
  };
};

// Re-export for convenience
export { statusCodes };
export type { FirebaseUser };
