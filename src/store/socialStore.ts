import { create } from "zustand";
import { PublicProfile } from "../types";
import {
  getFollowsDoc,
  followUser as firebaseFollowUser,
  unfollowUser as firebaseUnfollowUser,
  getPublicProfile,
} from "../config/firebase";
import { type ContactMatch } from "../config/functions";
import { logger } from "../utils/logger";

interface SocialState {
  following: string[];
  followers: string[];
  profiles: Record<string, PublicProfile>;
  isLoading: boolean;

  // Contact discovery cache
  contactMatches: ContactMatch[];
  lastContactSyncAt: number | null;

  loadMyFollows: (uid: string) => Promise<void>;
  followUser: (myUid: string, targetUid: string) => Promise<void>;
  unfollowUser: (myUid: string, targetUid: string) => Promise<void>;
  loadProfile: (uid: string) => Promise<void>;
  isFollowing: (uid: string) => boolean;
  setContactMatches: (matches: ContactMatch[]) => void;
  clearContactMatches: () => void;
  isContactSyncStale: () => boolean;
  reset: () => void;
}

const CONTACT_SYNC_STALE_MS = 5 * 60 * 1000; // 5 minutes

export const useSocialStore = create<SocialState>((set, get) => ({
  following: [],
  followers: [],
  profiles: {},
  isLoading: false,
  contactMatches: [],
  lastContactSyncAt: null,

  loadMyFollows: async (uid: string) => {
    set({ isLoading: true });
    try {
      const doc = await getFollowsDoc(uid);
      set({ following: doc.following, followers: doc.followers });
    } catch (error) {
      logger.error("loadMyFollows error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  followUser: async (myUid: string, targetUid: string) => {
    try {
      await firebaseFollowUser(myUid, targetUid);
      set((state) => ({
        following: state.following.includes(targetUid)
          ? state.following
          : [...state.following, targetUid],
      }));
    } catch (error) {
      logger.error("followUser error:", error);
      throw error;
    }
  },

  unfollowUser: async (myUid: string, targetUid: string) => {
    try {
      await firebaseUnfollowUser(myUid, targetUid);
      set((state) => ({
        following: state.following.filter((uid) => uid !== targetUid),
      }));
    } catch (error) {
      logger.error("unfollowUser error:", error);
      throw error;
    }
  },

  loadProfile: async (uid: string) => {
    const existing = get().profiles[uid];
    if (existing) return;
    try {
      const profile = await getPublicProfile(uid);
      if (profile) {
        set((state) => ({
          profiles: { ...state.profiles, [uid]: profile },
        }));
      }
    } catch (error) {
      logger.error("loadProfile error:", error);
      throw error;
    }
  },

  isFollowing: (uid: string) => {
    return get().following.includes(uid);
  },

  setContactMatches: (matches: ContactMatch[]) => {
    set({ contactMatches: matches, lastContactSyncAt: Date.now() });
  },

  clearContactMatches: () => {
    set({ contactMatches: [] });
  },

  isContactSyncStale: () => {
    const { lastContactSyncAt } = get();
    if (!lastContactSyncAt) return true;
    return Date.now() - lastContactSyncAt > CONTACT_SYNC_STALE_MS;
  },

  reset: () => {
    set({
      following: [],
      followers: [],
      profiles: {},
      isLoading: false,
      contactMatches: [],
      lastContactSyncAt: null,
    });
  },
}));
