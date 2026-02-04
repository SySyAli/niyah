/**
 * Unit Tests for authStore.ts
 *
 * Testing Strategy:
 * - WHITE BOX: Tests based on internal state management
 * - State transition testing
 * - Async operation testing
 * - Mock user creation testing
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "react";
import { useAuthStore } from "../../../store/authStore";
import { INITIAL_BALANCE } from "../../../constants/config";

describe("authStore", () => {
  // Reset store state before each test
  beforeEach(() => {
    const store = useAuthStore.getState();
    act(() => {
      store.logout();
    });
  });

  describe("initial state", () => {
    it("should have null user when not authenticated", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("login", () => {
    it("should set isLoading to true during login", async () => {
      const store = useAuthStore.getState();

      // Start login (don't await)
      const loginPromise = act(async () => {
        return store.login("test@example.com", "password123");
      });

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Complete login
      await loginPromise;
    });

    it("should create user with correct data after login", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.login("john@example.com", "password123");
      });

      const state = useAuthStore.getState();
      expect(state.user).not.toBeNull();
      expect(state.user?.email).toBe("john@example.com");
      expect(state.user?.name).toBe("john"); // Name derived from email
      expect(state.user?.balance).toBe(INITIAL_BALANCE);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("should initialize user stats to zero", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.login("test@example.com", "password");
      });

      const state = useAuthStore.getState();
      expect(state.user?.currentStreak).toBe(0);
      expect(state.user?.longestStreak).toBe(0);
      expect(state.user?.totalSessions).toBe(0);
      expect(state.user?.completedSessions).toBe(0);
      expect(state.user?.totalEarnings).toBe(0);
    });

    it("should set createdAt date", async () => {
      const beforeLogin = new Date();

      const store = useAuthStore.getState();
      await act(async () => {
        await store.login("test@example.com", "password");
      });

      const afterLogin = new Date();
      const state = useAuthStore.getState();

      expect(state.user?.createdAt).toBeInstanceOf(Date);
      expect(state.user?.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime(),
      );
      expect(state.user?.createdAt.getTime()).toBeLessThanOrEqual(
        afterLogin.getTime(),
      );
    });

    it("should generate unique user IDs", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.login("user1@example.com", "password");
      });
      const id1 = useAuthStore.getState().user?.id;

      act(() => {
        store.logout();
      });

      await act(async () => {
        await store.login("user2@example.com", "password");
      });
      const id2 = useAuthStore.getState().user?.id;

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe("signup", () => {
    it("should create user with provided name", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.signup("alice@example.com", "password123", "Alice Smith");
      });

      const state = useAuthStore.getState();
      expect(state.user?.name).toBe("Alice Smith");
      expect(state.user?.email).toBe("alice@example.com");
      expect(state.isAuthenticated).toBe(true);
    });

    it("should set isLoading during signup", async () => {
      const store = useAuthStore.getState();

      const signupPromise = act(async () => {
        return store.signup("test@example.com", "password", "Test User");
      });

      expect(useAuthStore.getState().isLoading).toBe(true);

      await signupPromise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("should initialize new user with INITIAL_BALANCE", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.signup("test@example.com", "password", "Test");
      });

      expect(useAuthStore.getState().user?.balance).toBe(INITIAL_BALANCE);
    });
  });

  describe("logout", () => {
    it("should clear user and set isAuthenticated to false", async () => {
      const store = useAuthStore.getState();

      // First login
      await act(async () => {
        await store.login("test@example.com", "password");
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        store.logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should be idempotent (safe to call multiple times)", () => {
      const store = useAuthStore.getState();

      act(() => {
        store.logout();
        store.logout();
        store.logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("updateUser", () => {
    it("should update user properties when logged in", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.login("test@example.com", "password");
      });

      act(() => {
        store.updateUser({ currentStreak: 5, totalSessions: 10 });
      });

      const state = useAuthStore.getState();
      expect(state.user?.currentStreak).toBe(5);
      expect(state.user?.totalSessions).toBe(10);
    });

    it("should preserve other user properties when updating", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.login("test@example.com", "password");
      });

      const originalEmail = useAuthStore.getState().user?.email;

      act(() => {
        store.updateUser({ balance: 10000 });
      });

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe(originalEmail);
      expect(state.user?.balance).toBe(10000);
    });

    it("should do nothing when not logged in", () => {
      const store = useAuthStore.getState();

      // Not logged in
      act(() => {
        store.updateUser({ currentStreak: 5 });
      });

      expect(useAuthStore.getState().user).toBeNull();
    });

    it("should allow updating multiple properties at once", async () => {
      const store = useAuthStore.getState();

      await act(async () => {
        await store.login("test@example.com", "password");
      });

      act(() => {
        store.updateUser({
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

  describe("state consistency", () => {
    it("should maintain consistent state through login/logout cycles", async () => {
      const store = useAuthStore.getState();

      // Login
      await act(async () => {
        await store.login("test@example.com", "password");
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Logout
      act(() => {
        store.logout();
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();

      // Login again
      await act(async () => {
        await store.login("another@example.com", "password");
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe("another@example.com");
    });
  });
});
