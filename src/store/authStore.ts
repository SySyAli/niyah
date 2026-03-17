import { create } from "zustand";
import { User, UserReputation } from "../types";
import {
  onAuthStateChanged,
  signOut,
  signInWithGoogle,
  signInWithApple,
  sendMagicLink,
  signInWithEmailLink,
  isEmailSignInLink,
  saveUserProfile,
  fetchUserProfile,
  updateUserDoc,
  type FirebaseUser,
} from "../config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { REFERRAL_REPUTATION_BOOST } from "../constants/config";

// Lazy import to break circular dependency (walletStore imports authStore)
const hydrateWallet = (uid: string) => {
  const { useWalletStore } = require("./walletStore") as {
    useWalletStore: { getState: () => { hydrate: (uid: string) => void } };
  };
  useWalletStore.getState().hydrate(uid);
};

// Lazy import for session recovery on login
const recoverSession = (uid: string) => {
  const { useSessionStore } = require("./sessionStore") as {
    useSessionStore: {
      getState: () => { recoverActiveSession: (uid: string) => void };
    };
  };
  useSessionStore.getState().recoverActiveSession(uid);
};

const MAGIC_LINK_EMAIL_KEY = "@niyah/magic_link_email";

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // true once first onAuthStateChanged fires
  profileComplete: boolean;
  isNewUser: boolean;

  initialize: () => () => void; // returns unsubscribe function
  loginWithGoogle: () => Promise<void>;
  loginWithApple: (
    identityToken: string,
    rawNonce: string,
    name?: string,
    email?: string,
  ) => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  completeEmailLink: (url: string) => Promise<void>;
  completeProfile: (data: {
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateReputation: (updates: Partial<UserReputation>) => void;
  setVenmoHandle: (handle: string) => void;
  setZelleHandle: (handle: string) => void;
}

const createInitialReputation = (): UserReputation => ({
  score: 50,
  level: "sapling",
  paymentsCompleted: 0,
  paymentsMissed: 0,
  totalOwedPaid: 0,
  totalOwedMissed: 0,
  lastUpdated: new Date(),
  referralCount: 0,
});

const getReputationLevel = (score: number): UserReputation["level"] => {
  if (score <= 20) return "seed";
  if (score <= 40) return "sprout";
  if (score <= 60) return "sapling";
  if (score <= 80) return "tree";
  return "oak";
};

const buildUser = (
  firebaseUser: FirebaseUser,
  firestoreData: Record<string, unknown> | null,
): User => {
  if (firestoreData) {
    const rep = (firestoreData.reputation as Partial<UserReputation>) || {};
    const stats = (firestoreData.stats as Record<string, number>) || {};
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: (firestoreData.name as string) || firebaseUser.displayName || "",
      firstName: firestoreData.firstName as string | undefined,
      lastName: firestoreData.lastName as string | undefined,
      profileImage:
        (firestoreData.profileImage as string) ||
        firebaseUser.photoURL ||
        undefined,
      balance: 0, // Wallet is separate (walletStore)
      currentStreak: stats.currentStreak || 0,
      longestStreak: stats.longestStreak || 0,
      totalSessions: stats.totalSessions || 0,
      completedSessions: stats.completedSessions || 0,
      totalEarnings: stats.totalEarnings || 0,
      createdAt: firestoreData.createdAt
        ? new Date(firestoreData.createdAt as string | number)
        : new Date(),
      reputation: {
        score: rep.score ?? 50,
        level: rep.level || "sapling",
        paymentsCompleted: rep.paymentsCompleted || 0,
        paymentsMissed: rep.paymentsMissed || 0,
        totalOwedPaid: rep.totalOwedPaid || 0,
        totalOwedMissed: rep.totalOwedMissed || 0,
        lastUpdated: new Date(),
        referralCount: rep.referralCount || 0,
      },
      venmoHandle: firestoreData.venmoHandle as string | undefined,
      zelleHandle: firestoreData.zelleHandle as string | undefined,
      phoneNumber: firestoreData.phone as string | undefined,
      authProvider: firestoreData.authProvider as
        | "email"
        | "google"
        | "apple"
        | undefined,
      profileComplete: firestoreData.profileComplete === true,
      stripeAccountId: firestoreData.stripeAccountId as string | undefined,
      stripeCustomerId: firestoreData.stripeCustomerId as string | undefined,
      stripeAccountStatus: firestoreData.stripeAccountStatus as
        | "pending"
        | "active"
        | "restricted"
        | undefined,
    };
  }

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    name: firebaseUser.displayName || "",
    profileImage: firebaseUser.photoURL || undefined,
    balance: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalSessions: 0,
    completedSessions: 0,
    totalEarnings: 0,
    createdAt: new Date(),
    reputation: createInitialReputation(),
    authProvider: "email",
    profileComplete: false,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  profileComplete: false,
  isNewUser: false,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const firestoreData = await fetchUserProfile(firebaseUser.uid);
          const user = buildUser(firebaseUser, firestoreData);
          const profileComplete = user.profileComplete === true;

          set({
            firebaseUser,
            user,
            isAuthenticated: true,
            isInitialized: true,
            profileComplete,
            isLoading: false,
          });

          // Hydrate wallet and recover any active session (non-blocking)
          hydrateWallet(firebaseUser.uid);
          recoverSession(firebaseUser.uid);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Still mark as authenticated even if Firestore fetch fails
          const user = buildUser(firebaseUser, null);
          set({
            firebaseUser,
            user,
            isAuthenticated: true,
            isInitialized: true,
            profileComplete: false,
            isLoading: false,
          });

          // Still try to hydrate wallet even if profile fetch failed
          hydrateWallet(firebaseUser.uid);
          recoverSession(firebaseUser.uid);
        }
      } else {
        set({
          firebaseUser: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          profileComplete: false,
          isNewUser: false,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });

    try {
      const firebaseUser = await signInWithGoogle();

      // Fetch Firestore profile and build user state immediately,
      // rather than waiting for onAuthStateChanged (which races).
      const firestoreData = await fetchUserProfile(firebaseUser.uid).catch(
        () => null,
      );
      const user = buildUser(firebaseUser, firestoreData);
      const profileComplete = user.profileComplete === true;

      set({
        firebaseUser,
        user,
        isAuthenticated: true,
        profileComplete,
        isNewUser: !profileComplete,
        isLoading: false,
      });

      // Hydrate wallet and recover session (non-blocking)
      hydrateWallet(firebaseUser.uid);
      recoverSession(firebaseUser.uid);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithApple: async (
    identityToken: string,
    rawNonce: string,
    _name?: string,
    _email?: string,
  ) => {
    set({ isLoading: true });

    try {
      const firebaseUser = await signInWithApple(identityToken, rawNonce);

      // Fetch Firestore profile and build user state immediately,
      // rather than waiting for onAuthStateChanged (which races).
      const firestoreData = await fetchUserProfile(firebaseUser.uid).catch(
        () => null,
      );
      const user = buildUser(firebaseUser, firestoreData);
      const profileComplete = user.profileComplete === true;

      set({
        firebaseUser,
        user,
        isAuthenticated: true,
        profileComplete,
        isNewUser: !profileComplete,
        isLoading: false,
      });

      // Hydrate wallet and recover session (non-blocking)
      hydrateWallet(firebaseUser.uid);
      recoverSession(firebaseUser.uid);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  sendEmailLink: async (email: string) => {
    set({ isLoading: true });

    try {
      await sendMagicLink(email);
      await AsyncStorage.setItem(MAGIC_LINK_EMAIL_KEY, email);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  completeEmailLink: async (url: string) => {
    if (!(await isEmailSignInLink(url))) {
      throw new Error("Invalid email sign-in link");
    }

    set({ isLoading: true });

    try {
      const email = await AsyncStorage.getItem(MAGIC_LINK_EMAIL_KEY);
      if (!email) {
        throw new Error("Email not found. Please try signing in again.");
      }

      const firebaseUser = await signInWithEmailLink(email, url);
      await AsyncStorage.removeItem(MAGIC_LINK_EMAIL_KEY);

      // Fetch Firestore profile and build user state immediately,
      // rather than waiting for onAuthStateChanged (which races).
      const firestoreData = await fetchUserProfile(firebaseUser.uid).catch(
        () => null,
      );
      const user = buildUser(firebaseUser, firestoreData);
      const profileComplete = user.profileComplete === true;

      set({
        firebaseUser,
        user,
        isAuthenticated: true,
        profileComplete,
        isNewUser: !profileComplete,
        isLoading: false,
      });

      // Hydrate wallet and recover session (non-blocking)
      hydrateWallet(firebaseUser.uid);
      recoverSession(firebaseUser.uid);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  completeProfile: async (data) => {
    const { firebaseUser } = get();
    if (!firebaseUser) throw new Error("Not authenticated");

    set({ isLoading: true });

    try {
      const providerId = firebaseUser.providerId;
      let authProvider: "google" | "apple" | "email" = "email";
      if (providerId === "google.com") authProvider = "google";
      else if (providerId === "apple.com") authProvider = "apple";

      await saveUserProfile(firebaseUser.uid, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: firebaseUser.email || "",
        phone: data.phone,
        profileImage: firebaseUser.photoURL || undefined,
        authProvider,
      });

      const firestoreData = await fetchUserProfile(firebaseUser.uid);
      const user = buildUser(firebaseUser, firestoreData);

      set({
        user,
        profileComplete: true,
        isNewUser: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear local state after signOut so state stays consistent if signOut fails
    set({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      profileComplete: false,
      isNewUser: false,
    });
  },

  updateUser: (updates: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });

      // Sync stat fields to Firestore (fire-and-forget).
      // Only syncs recognized stat/profile fields to avoid writing transient UI state.
      const statsFields = [
        "currentStreak",
        "longestStreak",
        "totalSessions",
        "completedSessions",
        "totalEarnings",
      ] as const;
      const statsUpdate: Record<string, number> = {};
      for (const key of statsFields) {
        if (key in updates && typeof updates[key] === "number") {
          statsUpdate[key] = updates[key];
        }
      }
      if (Object.keys(statsUpdate).length > 0) {
        updateUserDoc(user.id, { stats: statsUpdate }).catch((err) =>
          console.error("Failed to sync stats to Firestore:", err),
        );
      }
    }
  },

  updateReputation: (updates: Partial<UserReputation>) => {
    const { user } = get();
    if (user) {
      const newReputation = {
        ...user.reputation,
        ...updates,
        lastUpdated: new Date(),
      };

      const totalPayments =
        newReputation.paymentsCompleted + newReputation.paymentsMissed;
      if (totalPayments > 0) {
        const successRate = newReputation.paymentsCompleted / totalPayments;
        newReputation.score = Math.round(50 + (successRate - 0.5) * 100);
        newReputation.score = Math.max(0, Math.min(100, newReputation.score));
      }

      // Referral boost: permanently additive on top of the payment-based score.
      // Re-applied every recalculation so the boost persists through payment events.
      const referralBoost =
        (newReputation.referralCount ?? 0) * REFERRAL_REPUTATION_BOOST;
      newReputation.score = Math.min(100, newReputation.score + referralBoost);

      newReputation.level = getReputationLevel(newReputation.score);
      set({ user: { ...user, reputation: newReputation } });

      // Sync reputation to Firestore (fire-and-forget)
      updateUserDoc(user.id, { reputation: newReputation }).catch((err) =>
        console.error("Failed to sync reputation to Firestore:", err),
      );
    }
  },

  setVenmoHandle: (handle: string) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, venmoHandle: handle } });

      // Sync to Firestore (fire-and-forget)
      updateUserDoc(user.id, { venmoHandle: handle }).catch((err) =>
        console.error("Failed to sync venmoHandle to Firestore:", err),
      );
    }
  },

  setZelleHandle: (handle: string) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, zelleHandle: handle } });

      // Sync to Firestore (fire-and-forget)
      updateUserDoc(user.id, { zelleHandle: handle }).catch((err) =>
        console.error("Failed to sync zelleHandle to Firestore:", err),
      );
    }
  },
}));
