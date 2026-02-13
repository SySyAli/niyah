/**
 * Unit Tests for authStore.ts (Firebase-backed)
 *
 * Testing Strategy:
 * - Tests state management and store actions
 * - Firebase calls are mocked at the module level (vitest.setup.ts)
 * - Focus on state transitions and consistency
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "react";
import { useAuthStore } from "../../../store/authStore";

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
});
