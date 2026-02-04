import { create } from "zustand";
import { User, UserReputation } from "../types";
import { INITIAL_BALANCE } from "../constants/config";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
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

// Mock user for demo
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
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, _password: string) => {
    set({ isLoading: true });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = createMockUser(email, email.split("@")[0]);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  signup: async (email: string, _password: string, name: string) => {
    set({ isLoading: true });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = createMockUser(email, name);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
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
