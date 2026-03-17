/**
 * Firebase configuration layer.
 *
 * Uses the RNFB **modular API** (v22+ compatible) to avoid deprecation
 * warnings from the namespaced API. See:
 * https://rnfirebase.io/migrating-to-v22
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
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc as firestoreUpdateDoc,
  writeBatch,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";

// ---------------------------------------------------------------------------
// Firestore collection name constants
// ---------------------------------------------------------------------------

const COLLECTIONS = {
  USERS: "users",
  WALLETS: "wallets",
  USER_FOLLOWS: "userFollows",
  SESSIONS: "sessions",
} as const;

// ---------------------------------------------------------------------------
// FirebaseUser type — compatible interface used by the rest of the app.
// Maps from RNFB's FirebaseAuthTypes.User / UserCredential.
// ---------------------------------------------------------------------------

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  providerId: string | null;
  isNewUser: boolean;
}

const mapUser = (
  rnfbUser: FirebaseAuthTypes.User,
  isNewUser: boolean = false,
): FirebaseUser => ({
  uid: rnfbUser.uid,
  email: rnfbUser.email,
  displayName: rnfbUser.displayName,
  photoURL: rnfbUser.photoURL,
  phoneNumber: rnfbUser.phoneNumber,
  providerId: rnfbUser.providerId,
  isNewUser,
});

// ---------------------------------------------------------------------------
// Singleton instances (modular API)
// ---------------------------------------------------------------------------

const authInstance = getAuth();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Google Sign-In configuration
// ---------------------------------------------------------------------------

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

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(authInstance, credential);
  return mapUser(result.user, result.additionalUserInfo?.isNewUser ?? false);
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
  const credential = AppleAuthProvider.credential(identityToken, rawNonce);
  const result = await signInWithCredential(authInstance, credential);
  return mapUser(result.user, result.additionalUserInfo?.isNewUser ?? false);
};

// ---------------------------------------------------------------------------
// Email magic link (passwordless)
// ---------------------------------------------------------------------------

const MAGIC_LINK_REDIRECT_URL = Linking.createURL("auth/email-callback");

export const sendMagicLink = async (email: string): Promise<void> => {
  await sendSignInLinkToEmail(authInstance, email, {
    url: MAGIC_LINK_REDIRECT_URL,
    handleCodeInApp: true,
    iOS: { bundleId: "com.niyah.app" },
    android: { packageName: "com.niyah.app", installApp: false },
  });
};

export const isEmailSignInLink = (url: string): Promise<boolean> => {
  return rnfbIsSignInWithEmailLink(authInstance, url);
};

export const signInWithEmailLink = async (
  email: string,
  url: string,
): Promise<FirebaseUser> => {
  const result = await rnfbSignInWithEmailLink(authInstance, email, url);
  return mapUser(result.user, result.additionalUserInfo?.isNewUser ?? false);
};

// ---------------------------------------------------------------------------
// Firebase Auth helpers
// ---------------------------------------------------------------------------

export const signOut = async (): Promise<void> => {
  await signOutGoogle();
  await rnfbSignOut(authInstance);
};

export const onAuthStateChanged = (
  callback: (user: FirebaseUser | null) => void,
): (() => void) => {
  return rnfbOnAuthStateChanged(authInstance, (rnfbUser) => {
    callback(rnfbUser ? mapUser(rnfbUser) : null);
  });
};

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

export const getUserDoc = async (
  uid: string,
): Promise<Record<string, unknown> | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists) return null;
  return { __id: snap.id, ...snap.data() } as Record<string, unknown>;
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
  const serverTs = serverTimestamp();

  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
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
    { merge: true },
  );

  const walletSnap = await getDoc(doc(db, COLLECTIONS.WALLETS, uid));

  if (!walletSnap.exists) {
    await setDoc(doc(db, COLLECTIONS.WALLETS, uid), {
      balance: 0,
      pendingBalance: 0,
      lastUpdated: serverTs,
    });
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
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, referrerUid));
    if (!snap.exists) return;

    const docData = snap.data() ?? {};
    const rep = (docData.reputation as Record<string, number>) ?? {};

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

    await setDoc(
      doc(db, COLLECTIONS.USERS, referrerUid),
      { reputation: { ...rep, referralCount, score, level } },
      { merge: true },
    );
  } catch (error) {
    console.warn("awardReferralToUser failed (non-critical):", error);
  }
};

// ---------------------------------------------------------------------------
// Social / follows helpers — uses batch writes for atomicity
// ---------------------------------------------------------------------------

interface FollowsDoc {
  following: string[];
  followers: string[];
}

export const getFollowsDoc = async (uid: string): Promise<FollowsDoc> => {
  const snap = await getDoc(doc(db, COLLECTIONS.USER_FOLLOWS, uid));
  if (!snap.exists) return { following: [], followers: [] };
  const data = snap.data() ?? {};
  return {
    following: (data.following as string[]) ?? [],
    followers: (data.followers as string[]) ?? [],
  };
};

export const followUser = async (
  myUid: string,
  targetUid: string,
): Promise<void> => {
  const batch = writeBatch(db);
  const myRef = doc(db, COLLECTIONS.USER_FOLLOWS, myUid);
  const targetRef = doc(db, COLLECTIONS.USER_FOLLOWS, targetUid);

  batch.set(myRef, { following: arrayUnion(targetUid) }, { merge: true });
  batch.set(targetRef, { followers: arrayUnion(myUid) }, { merge: true });

  await batch.commit();
};

export const unfollowUser = async (
  myUid: string,
  targetUid: string,
): Promise<void> => {
  const batch = writeBatch(db);
  const myRef = doc(db, COLLECTIONS.USER_FOLLOWS, myUid);
  const targetRef = doc(db, COLLECTIONS.USER_FOLLOWS, targetUid);

  batch.set(myRef, { following: arrayRemove(targetUid) }, { merge: true });
  batch.set(targetRef, { followers: arrayRemove(myUid) }, { merge: true });

  await batch.commit();
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
  const docData = await fetchUserProfile(uid);
  if (!docData) return null;

  const rep = (docData.reputation as Record<string, unknown>) ?? {};
  const stats = (docData.stats as Record<string, number>) ?? {};

  return {
    uid,
    name: (docData.name as string) || "",
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

// ---------------------------------------------------------------------------
// Partial user doc update — for syncing stats, reputation, handles, etc.
// Uses set+merge so missing fields are not deleted.
// ---------------------------------------------------------------------------

export const updateUserDoc = async (
  uid: string,
  data: Record<string, unknown>,
): Promise<void> => {
  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

// ---------------------------------------------------------------------------
// Wallet — read server-authoritative balance
// ---------------------------------------------------------------------------

export const getWalletDoc = async (
  uid: string,
): Promise<{ balance: number; pendingBalance: number } | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.WALLETS, uid));
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return {
    balance: (data.balance as number) ?? 0,
    pendingBalance: (data.pendingBalance as number) ?? 0,
  };
};

// ---------------------------------------------------------------------------
// Session persistence — write/read solo session documents
// ---------------------------------------------------------------------------

export interface SessionDoc {
  userId: string;
  cadence: string;
  stakeAmount: number;
  potentialPayout: number;
  startedAt: FirebaseFirestoreTypes.Timestamp;
  endsAt: FirebaseFirestoreTypes.Timestamp;
  status: string;
  completedAt?: FirebaseFirestoreTypes.Timestamp;
  actualPayout?: number;
}

export const writeSession = async (
  sessionId: string,
  data: {
    userId: string;
    cadence: string;
    stakeAmount: number;
    potentialPayout: number;
    startedAt: Date;
    endsAt: Date;
    status: string;
  },
): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), {
    ...data,
    startedAt: Timestamp.fromDate(data.startedAt),
    endsAt: Timestamp.fromDate(data.endsAt),
    createdAt: serverTimestamp(),
  });
};

export const updateSession = async (
  sessionId: string,
  data: {
    status: string;
    completedAt?: Date;
    actualPayout?: number;
  },
): Promise<void> => {
  const updateData: Record<string, unknown> = {
    status: data.status,
    updatedAt: serverTimestamp(),
  };
  if (data.completedAt) {
    updateData.completedAt = Timestamp.fromDate(data.completedAt);
  }
  if (data.actualPayout !== undefined) {
    updateData.actualPayout = data.actualPayout;
  }
  await firestoreUpdateDoc(
    doc(db, COLLECTIONS.SESSIONS, sessionId),
    updateData,
  );
};

/** Fetch the active session for a user (crash recovery). Returns null if none. */
export const getActiveSession = async (
  userId: string,
): Promise<{
  id: string;
  cadence: string;
  stakeAmount: number;
  potentialPayout: number;
  startedAt: Date;
  endsAt: Date;
  status: string;
} | null> => {
  const q = query(
    collection(db, COLLECTIONS.SESSIONS),
    where("userId", "==", userId),
    where("status", "==", "active"),
    limit(1),
  );
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    cadence: data.cadence as string,
    stakeAmount: data.stakeAmount as number,
    potentialPayout: data.potentialPayout as number,
    startedAt: (data.startedAt as FirebaseFirestoreTypes.Timestamp).toDate(),
    endsAt: (data.endsAt as FirebaseFirestoreTypes.Timestamp).toDate(),
    status: data.status as string,
  };
};
