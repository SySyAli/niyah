import { create } from "zustand";
import { User, UserReputation } from "../types";
import { INITIAL_BALANCE } from "../constants/config";
import {
  signInWithGoogle,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  configureGoogleSignIn,
} from "../config/firebase";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateReputation: (updates: Partial<UserReputation>) => void;
  setVenmoHandle: (handle: string) => void;
}

// Create initial reputation for new users
const createInitialReputation = (): UserReputation => ({
  score: 50, // Start in the middle
  level: "sapling",
  paymentsCompleted: 0,
  paymentsMissed: 0,
  totalOwedPaid: 0,
  totalOwedMissed: 0,
  lastUpdated: new Date(),
});

// Calculate reputation level based on score
const getReputationLevel = (score: number): UserReputation["level"] => {
  if (score <= 20) return "seed";
  if (score <= 40) return "sprout";
  if (score <= 60) return "sapling";
  if (score <= 80) return "tree";
  return "oak";
};

// Create user from Firebase user
const createUserFromFirebase = (
  firebaseUser: FirebaseAuthTypes.User,
): User => ({
  id: firebaseUser.uid,
  email: firebaseUser.email || "",
  name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
  profileImage: firebaseUser.photoURL || undefined,
  balance: INITIAL_BALANCE,
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  completedSessions: 0,
  totalEarnings: 0,
  createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
  reputation: createInitialReputation(),
});

// Mock user for demo (email/password)
const createMockUser = (email: string, name: string): User => ({
  id: Math.random().toString(36).substr(2, 9),
  email,
  name,
  balance: INITIAL_BALANCE,
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  completedSessions: 0,
  totalEarnings: 0,
  createdAt: new Date(),
  reputation: createInitialReputation(),
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: () => {
    // Configure Google Sign-In
    configureGoogleSignIn();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        const user = createUserFromFirebase(firebaseUser);
        set({
          user,
          firebaseUser,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      }
    });

    return unsubscribe;
  },

  login: async (email: string, _password: string) => {
    set({ isLoading: true });

    // Simulate API call (for demo without Firebase email/password)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = createMockUser(email, email.split("@")[0]);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  signup: async (email: string, _password: string, name: string) => {
    set({ isLoading: true });

    // Simulate API call (for demo without Firebase email/password)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = createMockUser(email, name);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });

    try {
      await signInWithGoogle();
      // Auth state listener will update the user
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      const { firebaseUser } = get();
      if (firebaseUser) {
        await firebaseSignOut();
      }
      set({
        user: null,
        firebaseUser: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateUser: (updates: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
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

      // Recalculate score based on payment history
      const totalPayments =
        newReputation.paymentsCompleted + newReputation.paymentsMissed;
      if (totalPayments > 0) {
        const successRate = newReputation.paymentsCompleted / totalPayments;
        // Score formula: base 50 + (successRate - 0.5) * 100
        // Perfect record = 100, 50% = 50, 0% = 0
        newReputation.score = Math.round(50 + (successRate - 0.5) * 100);
        newReputation.score = Math.max(0, Math.min(100, newReputation.score)); // Clamp 0-100
      }

      // Update level based on new score
      newReputation.level = getReputationLevel(newReputation.score);

      set({ user: { ...user, reputation: newReputation } });
    }
  },

  setVenmoHandle: (handle: string) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, venmoHandle: handle } });
    }
  },
}));
