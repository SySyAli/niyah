/**
 * Unit Tests for socialStore.ts
 *
 * Testing Strategy:
 * - All 5 actions: loadMyFollows, followUser, unfollowUser, loadProfile, isFollowing
 * - Security focus: idempotency (no duplicate follows), error propagation,
 *   profile caching (no redundant Firebase reads), loading state correctness
 */

import { act } from "react";
import { useSocialStore } from "../../../store/socialStore";
import type { PublicProfile } from "../../../types";

jest.mock("../../../config/firebase", () => ({
  getFollowsDoc: jest.fn(),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getPublicProfile: jest.fn(),
}));

import {
  getFollowsDoc,
  followUser as firebaseFollowUser,
  unfollowUser as firebaseUnfollowUser,
  getPublicProfile,
} from "../../../config/firebase";

const makeProfile = (
  uid: string,
  overrides: Partial<PublicProfile> = {},
): PublicProfile => ({
  uid,
  name: `User ${uid}`,
  currentStreak: 0,
  completedSessions: 0,
  totalSessions: 0,
  reputation: { score: 50, level: "sapling", referralCount: 0 },
  ...overrides,
});

describe("socialStore", () => {
  beforeEach(() => {
    useSocialStore.setState({
      following: [],
      followers: [],
      profiles: {},
      isLoading: false,
    });
  });

  // ─── loadMyFollows ───────────────────────────────────────────────────────────

  describe("loadMyFollows", () => {
    it("populates following and followers from Firebase", async () => {
      jest.mocked(getFollowsDoc).mockResolvedValueOnce({
        following: ["uid-a", "uid-b"],
        followers: ["uid-c"],
      });

      await act(async () => {
        await useSocialStore.getState().loadMyFollows("my-uid");
      });

      const { following, followers } = useSocialStore.getState();
      expect(following).toEqual(["uid-a", "uid-b"]);
      expect(followers).toEqual(["uid-c"]);
    });

    it("resets isLoading to false after success", async () => {
      jest
        .mocked(getFollowsDoc)
        .mockResolvedValueOnce({ following: [], followers: [] });

      await act(async () => {
        await useSocialStore.getState().loadMyFollows("my-uid");
      });

      expect(useSocialStore.getState().isLoading).toBe(false);
    });

    it("resets isLoading to false even when Firebase throws", async () => {
      jest
        .mocked(getFollowsDoc)
        .mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useSocialStore.getState().loadMyFollows("my-uid");
      });

      expect(useSocialStore.getState().isLoading).toBe(false);
    });

    it("does not throw on Firebase error — leaves lists empty", async () => {
      jest
        .mocked(getFollowsDoc)
        .mockRejectedValueOnce(new Error("Firestore offline"));

      await expect(
        act(async () => {
          await useSocialStore.getState().loadMyFollows("my-uid");
        }),
      ).resolves.not.toThrow();

      const { following, followers } = useSocialStore.getState();
      expect(following).toEqual([]);
      expect(followers).toEqual([]);
    });

    it("passes the correct uid to Firebase", async () => {
      jest
        .mocked(getFollowsDoc)
        .mockResolvedValueOnce({ following: [], followers: [] });

      await act(async () => {
        await useSocialStore.getState().loadMyFollows("specific-uid-123");
      });

      expect(getFollowsDoc).toHaveBeenCalledWith("specific-uid-123");
    });
  });

  // ─── followUser ──────────────────────────────────────────────────────────────

  describe("followUser", () => {
    it("adds targetUid to following list on success", async () => {
      jest.mocked(firebaseFollowUser).mockResolvedValueOnce(undefined);

      await act(async () => {
        await useSocialStore.getState().followUser("my-uid", "target-uid");
      });

      expect(useSocialStore.getState().following).toContain("target-uid");
    });

    it("is idempotent — does not duplicate an already-followed user", async () => {
      useSocialStore.setState({ following: ["target-uid"] });
      jest.mocked(firebaseFollowUser).mockResolvedValueOnce(undefined);

      await act(async () => {
        await useSocialStore.getState().followUser("my-uid", "target-uid");
      });

      // Must not be duplicated even if Firebase call succeeds
      expect(
        useSocialStore.getState().following.filter((u) => u === "target-uid"),
      ).toHaveLength(1);
    });

    it("can follow multiple distinct users", async () => {
      jest.mocked(firebaseFollowUser).mockResolvedValue(undefined);

      await act(async () => {
        await useSocialStore.getState().followUser("me", "uid-1");
        await useSocialStore.getState().followUser("me", "uid-2");
      });

      const { following } = useSocialStore.getState();
      expect(following).toContain("uid-1");
      expect(following).toContain("uid-2");
      expect(following).toHaveLength(2);
    });

    it("propagates Firebase errors so the UI can surface them", async () => {
      jest
        .mocked(firebaseFollowUser)
        .mockRejectedValueOnce(new Error("Permission denied"));

      await expect(
        act(async () => {
          await useSocialStore.getState().followUser("my-uid", "target-uid");
        }),
      ).rejects.toThrow("Permission denied");

      // State must not have been mutated on error
      expect(useSocialStore.getState().following).not.toContain("target-uid");
    });
  });

  // ─── unfollowUser ────────────────────────────────────────────────────────────

  describe("unfollowUser", () => {
    it("removes targetUid from following list", async () => {
      useSocialStore.setState({ following: ["uid-1", "uid-2"] });
      jest.mocked(firebaseUnfollowUser).mockResolvedValueOnce(undefined);

      await act(async () => {
        await useSocialStore.getState().unfollowUser("my-uid", "uid-1");
      });

      const { following } = useSocialStore.getState();
      expect(following).not.toContain("uid-1");
      expect(following).toContain("uid-2"); // others must remain
    });

    it("is a no-op when the user is not being followed", async () => {
      useSocialStore.setState({ following: ["uid-2"] });
      jest.mocked(firebaseUnfollowUser).mockResolvedValueOnce(undefined);

      await act(async () => {
        await useSocialStore.getState().unfollowUser("my-uid", "uid-9");
      });

      expect(useSocialStore.getState().following).toEqual(["uid-2"]);
    });

    it("propagates Firebase errors", async () => {
      useSocialStore.setState({ following: ["uid-1"] });
      jest
        .mocked(firebaseUnfollowUser)
        .mockRejectedValueOnce(new Error("Not found"));

      await expect(
        act(async () => {
          await useSocialStore.getState().unfollowUser("my-uid", "uid-1");
        }),
      ).rejects.toThrow("Not found");

      // State must be unchanged on error
      expect(useSocialStore.getState().following).toContain("uid-1");
    });
  });

  // ─── loadProfile ─────────────────────────────────────────────────────────────

  describe("loadProfile", () => {
    it("fetches and stores a public profile", async () => {
      jest
        .mocked(getPublicProfile)
        .mockResolvedValueOnce(makeProfile("uid-1", { name: "Alice" }));

      await act(async () => {
        await useSocialStore.getState().loadProfile("uid-1");
      });

      const profile = useSocialStore.getState().profiles["uid-1"];
      expect(profile).toBeDefined();
      expect(profile.name).toBe("Alice");
    });

    it("does NOT re-fetch if the profile is already cached", async () => {
      useSocialStore.setState({
        profiles: { "uid-1": makeProfile("uid-1", { name: "Cached Alice" }) },
      });

      await act(async () => {
        await useSocialStore.getState().loadProfile("uid-1");
      });

      // Firebase must not have been called — prevents unnecessary reads
      expect(getPublicProfile).not.toHaveBeenCalled();
      expect(useSocialStore.getState().profiles["uid-1"].name).toBe(
        "Cached Alice",
      );
    });

    it("does not write to profiles if Firebase returns null", async () => {
      jest.mocked(getPublicProfile).mockResolvedValueOnce(null);

      await act(async () => {
        await useSocialStore.getState().loadProfile("ghost-uid");
      });

      expect(useSocialStore.getState().profiles["ghost-uid"]).toBeUndefined();
    });

    it("propagates Firebase errors", async () => {
      jest
        .mocked(getPublicProfile)
        .mockRejectedValueOnce(new Error("Firestore error"));

      await expect(
        act(async () => {
          await useSocialStore.getState().loadProfile("uid-bad");
        }),
      ).rejects.toThrow("Firestore error");
    });

    it("caches multiple profiles independently", async () => {
      jest
        .mocked(getPublicProfile)
        .mockResolvedValueOnce(makeProfile("uid-1", { name: "Alice" }))
        .mockResolvedValueOnce(makeProfile("uid-2", { name: "Bob" }));

      await act(async () => {
        await useSocialStore.getState().loadProfile("uid-1");
        await useSocialStore.getState().loadProfile("uid-2");
      });

      expect(useSocialStore.getState().profiles["uid-1"].name).toBe("Alice");
      expect(useSocialStore.getState().profiles["uid-2"].name).toBe("Bob");
    });
  });

  // ─── isFollowing ─────────────────────────────────────────────────────────────

  describe("isFollowing", () => {
    it("returns true when the uid is in the following list", () => {
      useSocialStore.setState({ following: ["uid-1", "uid-2"] });
      expect(useSocialStore.getState().isFollowing("uid-1")).toBe(true);
    });

    it("returns false when the uid is not in the following list", () => {
      useSocialStore.setState({ following: ["uid-1"] });
      expect(useSocialStore.getState().isFollowing("uid-9")).toBe(false);
    });

    it("returns false when the following list is empty", () => {
      expect(useSocialStore.getState().isFollowing("anyone")).toBe(false);
    });

    it("reflects additions from followUser in real-time", async () => {
      jest.mocked(firebaseFollowUser).mockResolvedValueOnce(undefined);
      expect(useSocialStore.getState().isFollowing("new-uid")).toBe(false);

      await act(async () => {
        await useSocialStore.getState().followUser("me", "new-uid");
      });

      expect(useSocialStore.getState().isFollowing("new-uid")).toBe(true);
    });

    it("reflects removals from unfollowUser in real-time", async () => {
      useSocialStore.setState({ following: ["target"] });
      jest.mocked(firebaseUnfollowUser).mockResolvedValueOnce(undefined);
      expect(useSocialStore.getState().isFollowing("target")).toBe(true);

      await act(async () => {
        await useSocialStore.getState().unfollowUser("me", "target");
      });

      expect(useSocialStore.getState().isFollowing("target")).toBe(false);
    });
  });
});
