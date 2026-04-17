/**
 * groupSessionStore — Parsing helpers, subscription management, Cloud Function
 * actions, and settlement edge cases.
 *
 * Covers the previously-uncovered lines in groupSessionStore.ts:
 * - Lines 50-115: parseTimestamp, parseParticipants, parseGroupSessionDoc, parseGroupInvite
 * - Lines 218-270: subscription management (subscribeToSession, subscribeToInvites, subscribeToActiveSessions)
 * - Lines 282-334: Cloud Function actions (proposeSession, acceptInvite, declineInvite, etc.)
 * - Lines 465-469: completeGroupSession cloudDistributePayouts edge case
 * - Line 611: markTransferDisputed settlement edge case (settled/none guard)
 *
 * The parsing functions are not exported, so we test them indirectly via
 * subscriptions that invoke them, and verify the parsed state in the store.
 */

// Ensure DEMO_MODE is true so startGroupSession legacy path works
jest.mock("../../../constants/config", () => ({
  ...jest.requireActual("../../../constants/config"),
  DEMO_MODE: true,
}));

// Mock Cloud Functions — typed to accept any args so TS doesn't complain about spread
const mockCreateGroupSession: jest.Mock = jest.fn(() =>
  Promise.resolve({ sessionId: "new-session-123" }),
);
const mockRespondToGroupInvite: jest.Mock = jest.fn(() =>
  Promise.resolve({ success: true, sessionStatus: "ready" }),
);
const mockMarkOnline: jest.Mock = jest.fn(() =>
  Promise.resolve({ success: true, allOnline: true }),
);
const mockStartSession: jest.Mock = jest.fn(() =>
  Promise.resolve({ success: true, endsAt: Date.now() + 60000 }),
);
const mockReportStatus: jest.Mock = jest.fn(() =>
  Promise.resolve({ success: true, sessionComplete: false }),
);
const mockCancelSession: jest.Mock = jest.fn(() =>
  Promise.resolve({ success: true, refundedCount: 3 }),
);
const mockDistributePayouts: jest.Mock = jest.fn(() =>
  Promise.resolve({ success: true }),
);

jest.mock("../../../config/functions", () => ({
  createGroupSession: (...a: unknown[]) =>
    mockCreateGroupSession(...(a as [any])),
  respondToGroupInvite: (...a: unknown[]) =>
    mockRespondToGroupInvite(...(a as [any])),
  markOnlineForSession: (...a: unknown[]) => mockMarkOnline(...(a as [any])),
  startGroupSessionCF: (...a: unknown[]) => mockStartSession(...(a as [any])),
  reportSessionStatus: (...a: unknown[]) => mockReportStatus(...(a as [any])),
  cancelGroupSession: (...a: unknown[]) => mockCancelSession(...(a as [any])),
  distributeGroupPayouts: (...a: unknown[]) =>
    mockDistributePayouts(...(a as [any])),
}));

// Mock Firebase subscription functions — capture the callback so tests can invoke it
let sessionCallback: ((data: Record<string, unknown> | null) => void) | null =
  null;
let invitesCallback:
  | ((invites: Array<Record<string, unknown>>) => void)
  | null = null;
let activeSessionsCallback:
  | ((sessions: Array<Record<string, unknown>>) => void)
  | null = null;

const mockUnsubSession = jest.fn();
const mockUnsubInvites = jest.fn();
const mockUnsubActiveSessions = jest.fn();

jest.mock("../../../config/firebase", () => ({
  subscribeToGroupSession: jest.fn(
    (
      _sessionId: string,
      cb: (data: Record<string, unknown> | null) => void,
    ) => {
      sessionCallback = cb;
      return mockUnsubSession;
    },
  ),
  subscribeToGroupInvites: jest.fn(
    (
      _userId: string,
      cb: (invites: Array<Record<string, unknown>>) => void,
    ) => {
      invitesCallback = cb;
      return mockUnsubInvites;
    },
  ),
  subscribeToActiveGroupSessions: jest.fn(
    (
      _userId: string,
      cb: (sessions: Array<Record<string, unknown>>) => void,
    ) => {
      activeSessionsCallback = cb;
      return mockUnsubActiveSessions;
    },
  ),
  // Required by transitive imports
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signOut: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  sendMagicLink: jest.fn(),
  signInWithEmailLink: jest.fn(),
  isEmailSignInLink: jest.fn(),
  saveUserProfile: jest.fn(),
  fetchUserProfile: jest.fn(),
  awardReferralToUser: jest.fn(),
  getWalletDoc: jest.fn(() => Promise.resolve(null)),
  subscribeToWallet: jest.fn(() => jest.fn()),
  writeSession: jest.fn(() => Promise.resolve()),
  updateSession: jest.fn(() => Promise.resolve()),
  getActiveSession: jest.fn(() => Promise.resolve(null)),
  updateUserDoc: jest.fn(() => Promise.resolve()),
}));

import { useGroupSessionStore } from "../../../store/groupSessionStore";
import { useAuthStore } from "../../../store/authStore";
import { useWalletStore } from "../../../store/walletStore";
import { INITIAL_BALANCE } from "../../../constants/config";
import {
  subscribeToGroupSession,
  subscribeToGroupInvites,
  subscribeToActiveGroupSessions,
} from "../../../config/firebase";
import type {
  GroupSession,
  SessionTransfer,
  UserReputation,
} from "../../../types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeReputation = (
  overrides: Partial<UserReputation> = {},
): UserReputation => ({
  score: 50,
  level: "sapling",
  paymentsCompleted: 0,
  paymentsMissed: 0,
  totalOwedPaid: 0,
  totalOwedMissed: 0,
  lastUpdated: new Date(),
  referralCount: 0,
  ...overrides,
});

const resetStores = () => {
  // Tear down module-level subscription references before clearing mocks,
  // so the next test starts with a clean slate for _unsubSession etc.
  useGroupSessionStore.getState().unsubscribeAll();

  useGroupSessionStore.setState({
    activeSession: null,
    pendingInvites: [],
    activeGroupSessions: [],
    activeGroupSession: null,
    groupSessionHistory: [],
  });
  useWalletStore.setState({
    balance: INITIAL_BALANCE,
    transactions: [],
    pendingWithdrawal: 0,
  });
  useAuthStore.setState({
    user: {
      id: "user-a",
      email: "alice@test.com",
      name: "Alice",
      balance: INITIAL_BALANCE,
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      completedSessions: 0,
      totalEarnings: 0,
      createdAt: new Date(),
      reputation: makeReputation(),
    },
    isAuthenticated: true,
    isLoading: false,
  });
  sessionCallback = null;
  invitesCallback = null;
  activeSessionsCallback = null;
  jest.clearAllMocks();
};

/** Wait for fire-and-forget promises to settle */
const flush = () => new Promise((r) => setTimeout(r, 0));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("groupSessionStore — parsing, subscriptions, Cloud Function actions", () => {
  beforeEach(resetStores);

  // ─── Parsing helpers (tested indirectly via subscriptions) ───────────────

  describe("parseTimestamp (via subscribeToSession)", () => {
    it("converts Firestore Timestamp objects (toDate method)", () => {
      const realDate = new Date("2025-06-15T12:00:00Z");
      const firestoreTimestamp = { toDate: () => realDate };

      useGroupSessionStore.getState().subscribeToSession("sess-1");
      expect(sessionCallback).not.toBeNull();

      sessionCallback!({
        __id: "sess-1",
        proposerId: "user-a",
        status: "active",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: ["user-a"],
        participants: {},
        poolTotal: 500,
        startedAt: firestoreTimestamp,
        createdAt: firestoreTimestamp,
        updatedAt: firestoreTimestamp,
        transfers: [],
      });

      const session = useGroupSessionStore.getState().activeSession;
      expect(session).not.toBeNull();
      expect(session!.startedAt).toEqual(realDate);
      expect(session!.createdAt).toEqual(realDate);
    });

    it("converts numeric timestamps (epoch ms)", () => {
      const epoch = 1718448000000; // 2024-06-15T12:00:00Z
      useGroupSessionStore.getState().subscribeToSession("sess-2");

      sessionCallback!({
        __id: "sess-2",
        proposerId: "user-a",
        status: "pending",
        cadence: "weekly",
        stakePerParticipant: 2500,
        customStake: false,
        duration: 300000,
        participantIds: [],
        participants: {},
        poolTotal: 5000,
        startedAt: epoch,
        createdAt: epoch,
        updatedAt: epoch,
        transfers: [],
      });

      const session = useGroupSessionStore.getState().activeSession;
      expect(session!.startedAt).toEqual(new Date(epoch));
    });

    it("passes through Date objects unchanged", () => {
      const date = new Date("2025-01-01T00:00:00Z");
      useGroupSessionStore.getState().subscribeToSession("sess-3");

      sessionCallback!({
        __id: "sess-3",
        proposerId: "user-a",
        status: "active",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: [],
        participants: {},
        poolTotal: 500,
        startedAt: date,
        createdAt: date,
        updatedAt: date,
        transfers: [],
      });

      expect(useGroupSessionStore.getState().activeSession!.startedAt).toBe(
        date,
      );
    });

    it("returns undefined for null/undefined timestamps", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-4");

      sessionCallback!({
        __id: "sess-4",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: [],
        participants: {},
        poolTotal: 500,
        startedAt: null,
        endsAt: undefined,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      const session = useGroupSessionStore.getState().activeSession;
      expect(session!.startedAt).toBeUndefined();
      expect(session!.endsAt).toBeUndefined();
      expect(session!.completedAt).toBeUndefined();
    });

    it("returns undefined for non-timestamp types (string)", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-5");

      sessionCallback!({
        __id: "sess-5",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: [],
        participants: {},
        poolTotal: 500,
        startedAt: "not-a-date",
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      // Strings don't match any parseTimestamp branch, so should be undefined
      expect(
        useGroupSessionStore.getState().activeSession!.startedAt,
      ).toBeUndefined();
    });
  });

  describe("parseParticipants (via subscribeToSession)", () => {
    it("parses participant fields correctly", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-p1");

      sessionCallback!({
        __id: "sess-p1",
        proposerId: "user-a",
        status: "active",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: ["user-a", "user-b"],
        participants: {
          "user-a": {
            name: "Alice",
            venmoHandle: "@alice",
            profileImage: "https://example.com/alice.jpg",
            accepted: true,
            online: true,
            completed: true,
            surrendered: false,
          },
          "user-b": {
            name: "Bob",
            accepted: true,
            online: false,
            completed: false,
          },
        },
        poolTotal: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      const session = useGroupSessionStore.getState().activeSession!;
      const alice = session.participants["user-a"];
      expect(alice.name).toBe("Alice");
      expect(alice.venmoHandle).toBe("@alice");
      expect(alice.profileImage).toBe("https://example.com/alice.jpg");
      expect(alice.accepted).toBe(true);
      expect(alice.online).toBe(true);
      expect(alice.completed).toBe(true);
      expect(alice.surrendered).toBe(false);

      const bob = session.participants["user-b"];
      expect(bob.name).toBe("Bob");
      expect(bob.venmoHandle).toBeUndefined();
      expect(bob.profileImage).toBeUndefined();
      expect(bob.accepted).toBe(true);
      expect(bob.online).toBe(false);
      expect(bob.completed).toBe(false);
    });

    it("uses default reputation when not provided", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-p2");

      sessionCallback!({
        __id: "sess-p2",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: ["user-a"],
        participants: {
          "user-a": {
            name: "Alice",
            accepted: false,
            online: false,
            // no reputation provided
          },
        },
        poolTotal: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      const alice =
        useGroupSessionStore.getState().activeSession!.participants["user-a"];
      expect(alice.reputation).toBeDefined();
      expect(alice.reputation.score).toBe(50);
      expect(alice.reputation.level).toBe("sapling");
    });

    it("parses custom reputation when provided", () => {
      const customRep = {
        score: 85,
        level: "oak",
        paymentsCompleted: 10,
        paymentsMissed: 1,
        totalOwedPaid: 5000,
        totalOwedMissed: 200,
        lastUpdated: new Date(),
      };

      useGroupSessionStore.getState().subscribeToSession("sess-p3");

      sessionCallback!({
        __id: "sess-p3",
        proposerId: "user-a",
        status: "active",
        cadence: "weekly",
        stakePerParticipant: 2500,
        customStake: true,
        duration: 300000,
        participantIds: ["user-a"],
        participants: {
          "user-a": {
            name: "Alice",
            reputation: customRep,
            accepted: true,
            online: true,
          },
        },
        poolTotal: 2500,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      const alice =
        useGroupSessionStore.getState().activeSession!.participants["user-a"];
      expect(alice.reputation.score).toBe(85);
      expect(alice.reputation.level).toBe("oak");
      expect(alice.reputation.paymentsCompleted).toBe(10);
    });

    it("handles empty/undefined participants map", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-p4");

      sessionCallback!({
        __id: "sess-p4",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: [],
        participants: undefined,
        poolTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      expect(
        Object.keys(
          useGroupSessionStore.getState().activeSession!.participants,
        ),
      ).toHaveLength(0);
    });

    it("parses surrenderedAt timestamp on participant", () => {
      const surrenderTime = new Date("2025-06-15T14:30:00Z");
      useGroupSessionStore.getState().subscribeToSession("sess-p5");

      sessionCallback!({
        __id: "sess-p5",
        proposerId: "user-a",
        status: "active",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: ["user-b"],
        participants: {
          "user-b": {
            name: "Bob",
            accepted: true,
            online: true,
            surrendered: true,
            surrenderedAt: { toDate: () => surrenderTime },
          },
        },
        poolTotal: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      const bob =
        useGroupSessionStore.getState().activeSession!.participants["user-b"];
      expect(bob.surrendered).toBe(true);
      expect(bob.surrenderedAt).toEqual(surrenderTime);
    });
  });

  describe("parseGroupSessionDoc (via subscribeToSession)", () => {
    it("parses all GroupSessionDoc fields", () => {
      const now = new Date();
      const later = new Date(now.getTime() + 60000);

      useGroupSessionStore.getState().subscribeToSession("sess-doc-1");

      sessionCallback!({
        __id: "sess-doc-1",
        proposerId: "user-a",
        status: "active",
        cadence: "monthly",
        stakePerParticipant: 10000,
        customStake: true,
        duration: 3600000,
        participantIds: ["user-a", "user-b"],
        participants: {},
        poolTotal: 20000,
        startedAt: now,
        endsAt: later,
        payouts: { "user-a": 15000, "user-b": 5000 },
        transfers: [
          {
            id: "t1",
            fromUserId: "user-b",
            toUserId: "user-a",
            amount: 5000,
            status: "pending",
          },
        ],
        createdAt: now,
        updatedAt: now,
        autoTimeoutAt: { toDate: () => later },
      });

      const session = useGroupSessionStore.getState().activeSession!;
      expect(session.id).toBe("sess-doc-1");
      expect(session.proposerId).toBe("user-a");
      expect(session.status).toBe("active");
      expect(session.cadence).toBe("monthly");
      expect(session.stakePerParticipant).toBe(10000);
      expect(session.customStake).toBe(true);
      expect(session.duration).toBe(3600000);
      expect(session.participantIds).toEqual(["user-a", "user-b"]);
      expect(session.poolTotal).toBe(20000);
      expect(session.startedAt).toEqual(now);
      expect(session.endsAt).toEqual(later);
      expect(session.payouts).toEqual({ "user-a": 15000, "user-b": 5000 });
      expect(session.transfers).toHaveLength(1);
      expect(session.autoTimeoutAt).toEqual(later);
    });

    it("uses data.id when __id is not present", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-doc-2");

      sessionCallback!({
        id: "fallback-id",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: [],
        participants: {},
        poolTotal: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      expect(useGroupSessionStore.getState().activeSession!.id).toBe(
        "fallback-id",
      );
    });

    it("defaults customStake to false when not provided", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-doc-3");

      sessionCallback!({
        __id: "sess-doc-3",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        duration: 60000,
        participantIds: [],
        participants: {},
        poolTotal: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      expect(useGroupSessionStore.getState().activeSession!.customStake).toBe(
        false,
      );
    });

    it("defaults participantIds to empty array when not provided", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-doc-4");

      sessionCallback!({
        __id: "sess-doc-4",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participants: {},
        poolTotal: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
        transfers: [],
      });

      expect(
        useGroupSessionStore.getState().activeSession!.participantIds,
      ).toEqual([]);
    });

    it("defaults transfers to empty array when not provided", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-doc-5");

      sessionCallback!({
        __id: "sess-doc-5",
        proposerId: "user-a",
        status: "pending",
        cadence: "daily",
        stakePerParticipant: 500,
        customStake: false,
        duration: 60000,
        participantIds: [],
        participants: {},
        poolTotal: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(useGroupSessionStore.getState().activeSession!.transfers).toEqual(
        [],
      );
    });

    it("sets activeSession to null when callback receives null", () => {
      useGroupSessionStore.setState({
        activeSession: {
          id: "existing",
          proposerId: "user-a",
          status: "active",
          cadence: "daily",
          stakePerParticipant: 500,
          customStake: false,
          duration: 60000,
          participantIds: [],
          participants: {},
          poolTotal: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
          transfers: [],
        },
      });

      useGroupSessionStore.getState().subscribeToSession("sess-6");
      sessionCallback!(null);

      expect(useGroupSessionStore.getState().activeSession).toBeNull();
    });
  });

  describe("parseGroupInvite (via subscribeToInvites)", () => {
    it("parses invite fields correctly", () => {
      const createdAt = new Date("2025-06-15T10:00:00Z");
      const respondedAt = new Date("2025-06-15T10:05:00Z");

      useGroupSessionStore.getState().subscribeToInvites("user-a");

      invitesCallback!([
        {
          __id: "invite-1",
          sessionId: "sess-1",
          fromUserId: "user-b",
          fromUserName: "Bob",
          fromUserImage: "https://example.com/bob.jpg",
          toUserId: "user-a",
          stake: 500,
          cadence: "daily",
          duration: 60000,
          status: "pending",
          createdAt: { toDate: () => createdAt },
          respondedAt: { toDate: () => respondedAt },
        },
      ]);

      const invites = useGroupSessionStore.getState().pendingInvites;
      expect(invites).toHaveLength(1);
      expect(invites[0].id).toBe("invite-1");
      expect(invites[0].sessionId).toBe("sess-1");
      expect(invites[0].fromUserId).toBe("user-b");
      expect(invites[0].fromUserName).toBe("Bob");
      expect(invites[0].fromUserImage).toBe("https://example.com/bob.jpg");
      expect(invites[0].toUserId).toBe("user-a");
      expect(invites[0].stake).toBe(500);
      expect(invites[0].cadence).toBe("daily");
      expect(invites[0].duration).toBe(60000);
      expect(invites[0].status).toBe("pending");
      expect(invites[0].createdAt).toEqual(createdAt);
      expect(invites[0].respondedAt).toEqual(respondedAt);
    });

    it("parses multiple invites", () => {
      useGroupSessionStore.getState().subscribeToInvites("user-a");

      invitesCallback!([
        {
          __id: "inv-1",
          sessionId: "s1",
          fromUserId: "user-b",
          fromUserName: "Bob",
          toUserId: "user-a",
          stake: 500,
          cadence: "daily",
          duration: 60000,
          status: "pending",
          createdAt: new Date(),
        },
        {
          __id: "inv-2",
          sessionId: "s2",
          fromUserId: "user-c",
          fromUserName: "Charlie",
          toUserId: "user-a",
          stake: 2500,
          cadence: "weekly",
          duration: 300000,
          status: "pending",
          createdAt: new Date(),
        },
      ]);

      expect(useGroupSessionStore.getState().pendingInvites).toHaveLength(2);
    });

    it("uses data.id when __id is not present", () => {
      useGroupSessionStore.getState().subscribeToInvites("user-a");

      invitesCallback!([
        {
          id: "fallback-invite-id",
          sessionId: "s1",
          fromUserId: "user-b",
          fromUserName: "Bob",
          toUserId: "user-a",
          stake: 500,
          cadence: "daily",
          duration: 60000,
          status: "pending",
          createdAt: new Date(),
        },
      ]);

      expect(useGroupSessionStore.getState().pendingInvites[0].id).toBe(
        "fallback-invite-id",
      );
    });

    it("defaults createdAt to current Date when not provided", () => {
      const before = Date.now();
      useGroupSessionStore.getState().subscribeToInvites("user-a");

      invitesCallback!([
        {
          __id: "inv-3",
          sessionId: "s1",
          fromUserId: "user-b",
          fromUserName: "Bob",
          toUserId: "user-a",
          stake: 500,
          cadence: "daily",
          duration: 60000,
          status: "pending",
          // createdAt intentionally omitted
        },
      ]);

      const after = Date.now();
      const createdAt =
        useGroupSessionStore.getState().pendingInvites[0].createdAt;
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe("parseGroupSessionDoc (via subscribeToActiveSessions)", () => {
    it("parses multiple active sessions", () => {
      useGroupSessionStore.getState().subscribeToActiveSessions("user-a");

      activeSessionsCallback!([
        {
          __id: "active-1",
          proposerId: "user-a",
          status: "active",
          cadence: "daily",
          stakePerParticipant: 500,
          customStake: false,
          duration: 60000,
          participantIds: ["user-a"],
          participants: {},
          poolTotal: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
          transfers: [],
        },
        {
          __id: "active-2",
          proposerId: "user-b",
          status: "pending",
          cadence: "weekly",
          stakePerParticipant: 2500,
          customStake: false,
          duration: 300000,
          participantIds: ["user-a", "user-b"],
          participants: {},
          poolTotal: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
          transfers: [],
        },
      ]);

      const sessions = useGroupSessionStore.getState().activeGroupSessions;
      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe("active-1");
      expect(sessions[1].id).toBe("active-2");
      expect(sessions[1].cadence).toBe("weekly");
    });
  });

  // ─── Subscription management ─────────────────────────────────────────────

  describe("subscribeToSession", () => {
    it("calls subscribeToGroupSession with the session ID", () => {
      useGroupSessionStore.getState().subscribeToSession("my-session");
      expect(subscribeToGroupSession).toHaveBeenCalledWith(
        "my-session",
        expect.any(Function),
      );
    });

    it("tears down previous subscription when called again", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-1");
      expect(mockUnsubSession).not.toHaveBeenCalled();

      useGroupSessionStore.getState().subscribeToSession("sess-2");
      expect(mockUnsubSession).toHaveBeenCalledTimes(1);
    });

    it("sets up new subscription after teardown", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-1");
      useGroupSessionStore.getState().subscribeToSession("sess-2");

      expect(subscribeToGroupSession).toHaveBeenCalledTimes(2);
      expect(subscribeToGroupSession).toHaveBeenLastCalledWith(
        "sess-2",
        expect.any(Function),
      );
    });
  });

  describe("subscribeToInvites", () => {
    it("calls subscribeToGroupInvites with the user ID", () => {
      useGroupSessionStore.getState().subscribeToInvites("user-a");
      expect(subscribeToGroupInvites).toHaveBeenCalledWith(
        "user-a",
        expect.any(Function),
      );
    });

    it("tears down previous subscription when called again", () => {
      useGroupSessionStore.getState().subscribeToInvites("user-a");
      expect(mockUnsubInvites).not.toHaveBeenCalled();

      useGroupSessionStore.getState().subscribeToInvites("user-b");
      expect(mockUnsubInvites).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscribeToActiveSessions", () => {
    it("calls subscribeToActiveGroupSessions with the user ID", () => {
      useGroupSessionStore.getState().subscribeToActiveSessions("user-a");
      expect(subscribeToActiveGroupSessions).toHaveBeenCalledWith(
        "user-a",
        expect.any(Function),
      );
    });

    it("tears down previous subscription when called again", () => {
      useGroupSessionStore.getState().subscribeToActiveSessions("user-a");
      expect(mockUnsubActiveSessions).not.toHaveBeenCalled();

      useGroupSessionStore.getState().subscribeToActiveSessions("user-b");
      expect(mockUnsubActiveSessions).toHaveBeenCalledTimes(1);
    });
  });

  describe("unsubscribeAll", () => {
    it("tears down all active subscriptions", () => {
      useGroupSessionStore.getState().subscribeToSession("sess-1");
      useGroupSessionStore.getState().subscribeToInvites("user-a");
      useGroupSessionStore.getState().subscribeToActiveSessions("user-a");

      useGroupSessionStore.getState().unsubscribeAll();

      expect(mockUnsubSession).toHaveBeenCalledTimes(1);
      expect(mockUnsubInvites).toHaveBeenCalledTimes(1);
      expect(mockUnsubActiveSessions).toHaveBeenCalledTimes(1);
    });

    it("resets all real-time state", () => {
      // Set some state first
      useGroupSessionStore.setState({
        activeSession: {
          id: "sess",
          proposerId: "user-a",
          status: "active",
          cadence: "daily",
          stakePerParticipant: 500,
          customStake: false,
          duration: 60000,
          participantIds: [],
          participants: {},
          poolTotal: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
          transfers: [],
        },
        pendingInvites: [
          {
            id: "inv-1",
            sessionId: "s1",
            fromUserId: "user-b",
            fromUserName: "Bob",
            toUserId: "user-a",
            stake: 500,
            cadence: "daily",
            duration: 60000,
            status: "pending",
            createdAt: new Date(),
          },
        ],
        activeGroupSessions: [],
      });

      useGroupSessionStore.getState().unsubscribeAll();

      const state = useGroupSessionStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.pendingInvites).toEqual([]);
      expect(state.activeGroupSessions).toEqual([]);
    });

    it("is safe to call when no subscriptions exist", () => {
      expect(() =>
        useGroupSessionStore.getState().unsubscribeAll(),
      ).not.toThrow();
    });
  });

  // ─── Cloud Function actions ──────────────────────────────────────────────

  describe("proposeSession", () => {
    it("calls cloudCreateGroupSession with correct parameters", async () => {
      await useGroupSessionStore.getState().proposeSession({
        cadence: "daily",
        stakePerParticipant: 500,
        duration: 60000,
        inviteeIds: ["user-b", "user-c"],
        customStake: false,
      });

      expect(mockCreateGroupSession).toHaveBeenCalledWith(
        "daily",
        500,
        60000,
        ["user-b", "user-c"],
        false,
      );
    });

    it("returns the sessionId from the cloud function result", async () => {
      const sessionId = await useGroupSessionStore.getState().proposeSession({
        cadence: "weekly",
        stakePerParticipant: 2500,
        duration: 300000,
        inviteeIds: ["user-b"],
      });

      expect(sessionId).toBe("new-session-123");
    });

    it("propagates errors from the cloud function", async () => {
      mockCreateGroupSession.mockRejectedValueOnce(
        new Error("Insufficient balance"),
      );

      await expect(
        useGroupSessionStore.getState().proposeSession({
          cadence: "daily",
          stakePerParticipant: 500,
          duration: 60000,
          inviteeIds: ["user-b"],
        }),
      ).rejects.toThrow("Insufficient balance");
    });
  });

  describe("acceptInvite", () => {
    it("calls cloudRespondToGroupInvite with accept=true", async () => {
      await useGroupSessionStore.getState().acceptInvite("invite-123");

      expect(mockRespondToGroupInvite).toHaveBeenCalledWith("invite-123", true);
    });

    it("propagates errors from the cloud function", async () => {
      mockRespondToGroupInvite.mockRejectedValueOnce(
        new Error("Invite expired"),
      );

      await expect(
        useGroupSessionStore.getState().acceptInvite("invite-123"),
      ).rejects.toThrow("Invite expired");
    });
  });

  describe("declineInvite", () => {
    it("calls cloudRespondToGroupInvite with accept=false", async () => {
      await useGroupSessionStore.getState().declineInvite("invite-456");

      expect(mockRespondToGroupInvite).toHaveBeenCalledWith(
        "invite-456",
        false,
      );
    });
  });

  describe("markOnline", () => {
    it("calls cloudMarkOnline and returns allOnline value", async () => {
      const result = await useGroupSessionStore
        .getState()
        .markOnline("sess-123");

      expect(mockMarkOnline).toHaveBeenCalledWith("sess-123");
      expect(result).toBe(true);
    });

    it("returns false when not all online", async () => {
      mockMarkOnline.mockResolvedValueOnce({
        success: true,
        allOnline: false,
      });

      const result = await useGroupSessionStore
        .getState()
        .markOnline("sess-123");
      expect(result).toBe(false);
    });
  });

  describe("startSession", () => {
    it("calls cloudStartSession with session ID", async () => {
      await useGroupSessionStore.getState().startSession("sess-123");
      expect(mockStartSession).toHaveBeenCalledWith("sess-123");
    });
  });

  describe("reportCompletion", () => {
    it("calls cloudReportStatus with 'complete' action", async () => {
      await useGroupSessionStore.getState().reportCompletion("sess-123");
      expect(mockReportStatus).toHaveBeenCalledWith("sess-123", "complete");
    });
  });

  describe("reportSurrender", () => {
    it("calls cloudReportStatus with 'surrender' action", async () => {
      await useGroupSessionStore.getState().reportSurrender("sess-123");
      expect(mockReportStatus).toHaveBeenCalledWith("sess-123", "surrender");
    });
  });

  describe("cancelSession", () => {
    it("calls cloudCancelSession with session ID", async () => {
      await useGroupSessionStore.getState().cancelSession("sess-123");
      expect(mockCancelSession).toHaveBeenCalledWith("sess-123");
    });
  });

  // ─── Settlement edge cases ─────────────────────────────────────────────────

  describe("markTransferDisputed — settlement guards", () => {
    const seedSessionWithTransfer = (
      transferOverrides: Partial<SessionTransfer> = {},
    ): void => {
      const transfer: SessionTransfer = {
        id: "t1",
        fromUserId: "user-a",
        fromUserName: "Alice",
        toUserId: "user-b",
        toUserName: "Bob",
        amount: 500,
        status: "pending",
        createdAt: new Date(),
        ...transferOverrides,
      };
      const session: GroupSession = {
        id: "session-1",
        cadence: "daily",
        stakePerParticipant: 500,
        poolTotal: 1000,
        startedAt: new Date(),
        endsAt: new Date(),
        status: "surrendered",
        completedAt: new Date(),
        participants: [],
        transfers: [transfer],
      };
      useGroupSessionStore.setState({ groupSessionHistory: [session] });
    };

    it("is no-op when transfer status is 'settled'", () => {
      seedSessionWithTransfer({ status: "settled" });
      useGroupSessionStore.getState().markTransferDisputed("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("settled"); // unchanged
    });

    it("is no-op when transfer status is 'none'", () => {
      seedSessionWithTransfer({ status: "none" });
      useGroupSessionStore.getState().markTransferDisputed("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("none"); // unchanged
    });

    it("allows dispute from 'overdue' status", () => {
      seedSessionWithTransfer({ status: "overdue" });
      useGroupSessionStore.getState().markTransferDisputed("session-1", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("disputed");
    });

    it("is no-op when transfer is not found", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore
        .getState()
        .markTransferDisputed("session-1", "nonexistent");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("pending"); // unchanged
    });

    it("is no-op when session is not found", () => {
      seedSessionWithTransfer({ status: "pending" });
      useGroupSessionStore
        .getState()
        .markTransferDisputed("wrong-session", "t1");

      const t =
        useGroupSessionStore.getState().groupSessionHistory[0].transfers[0];
      expect(t.status).toBe("pending"); // unchanged
    });
  });

  // ─── completeGroupSession edge case: no auth user ─────────────────────────

  describe("completeGroupSession — edge cases", () => {
    it("does not call cloudDistributePayouts in DEMO_MODE", async () => {
      // Default config has DEMO_MODE = true
      useGroupSessionStore.getState().startGroupSession("daily", [
        {
          userId: "user-a",
          name: "Alice",
          venmoHandle: "@alice",
          reputation: makeReputation(),
        },
        {
          userId: "user-b",
          name: "Bob",
          venmoHandle: "@bob",
          reputation: makeReputation(),
        },
      ]);

      useGroupSessionStore.getState().completeGroupSession([
        { userId: "user-a", completed: true },
        { userId: "user-b", completed: false },
      ]);

      await flush();

      // In DEMO_MODE, cloudDistributePayouts should NOT be called
      expect(mockDistributePayouts).not.toHaveBeenCalled();
    });

    it("handles completeGroupSession when current user is not in results", () => {
      useGroupSessionStore.getState().startGroupSession("daily", [
        {
          userId: "user-a",
          name: "Alice",
          venmoHandle: "@alice",
          reputation: makeReputation(),
        },
        {
          userId: "user-b",
          name: "Bob",
          venmoHandle: "@bob",
          reputation: makeReputation(),
        },
      ]);

      // user-a is the current user but is not in the results
      const result = useGroupSessionStore
        .getState()
        .completeGroupSession([{ userId: "user-b", completed: true }]);

      // Should mark the session status as surrendered since current user
      // defaults to completed: false
      expect(result).toBeDefined();
      expect(result!.status).toBe("surrendered");
    });
  });

  // ─── Query helpers with more complex scenarios ─────────────────────────────

  describe("getSessionsWithPendingTransfers — multi-transfer scenarios", () => {
    it("returns session when one of multiple transfers is actionable", () => {
      const session: GroupSession = {
        id: "multi-t",
        cadence: "daily",
        stakePerParticipant: 500,
        poolTotal: 1500,
        startedAt: new Date(),
        endsAt: new Date(),
        status: "surrendered",
        completedAt: new Date(),
        participants: [],
        transfers: [
          {
            id: "t1",
            fromUserId: "user-a",
            fromUserName: "Alice",
            toUserId: "user-b",
            toUserName: "Bob",
            amount: 500,
            status: "settled",
            createdAt: new Date(),
          },
          {
            id: "t2",
            fromUserId: "user-a",
            fromUserName: "Alice",
            toUserId: "user-c",
            toUserName: "Charlie",
            amount: 300,
            status: "pending",
            createdAt: new Date(),
          },
        ],
      };

      useGroupSessionStore.setState({ groupSessionHistory: [session] });

      const result = useGroupSessionStore
        .getState()
        .getSessionsWithPendingTransfers("user-a");
      expect(result).toHaveLength(1);
    });

    it("excludes sessions with only 'none' status transfers", () => {
      const session: GroupSession = {
        id: "none-t",
        cadence: "daily",
        stakePerParticipant: 500,
        poolTotal: 1000,
        startedAt: new Date(),
        endsAt: new Date(),
        status: "completed",
        completedAt: new Date(),
        participants: [],
        transfers: [
          {
            id: "t1",
            fromUserId: "user-a",
            fromUserName: "Alice",
            toUserId: "user-b",
            toUserName: "Bob",
            amount: 0,
            status: "none",
            createdAt: new Date(),
          },
        ],
      };

      useGroupSessionStore.setState({ groupSessionHistory: [session] });

      expect(
        useGroupSessionStore
          .getState()
          .getSessionsWithPendingTransfers("user-a"),
      ).toHaveLength(0);
    });
  });

  describe("getPendingTransfersForUser — multi-session scenarios", () => {
    it("returns transfers across multiple sessions", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [
          {
            id: "s1",
            cadence: "daily",
            stakePerParticipant: 500,
            poolTotal: 1000,
            startedAt: new Date(),
            endsAt: new Date(),
            status: "surrendered",
            completedAt: new Date(),
            participants: [],
            transfers: [
              {
                id: "t1",
                fromUserId: "user-a",
                fromUserName: "Alice",
                toUserId: "user-b",
                toUserName: "Bob",
                amount: 500,
                status: "pending",
                createdAt: new Date(),
              },
            ],
          },
          {
            id: "s2",
            cadence: "weekly",
            stakePerParticipant: 2500,
            poolTotal: 5000,
            startedAt: new Date(),
            endsAt: new Date(),
            status: "completed",
            completedAt: new Date(),
            participants: [],
            transfers: [
              {
                id: "t2",
                fromUserId: "user-c",
                fromUserName: "Charlie",
                toUserId: "user-a",
                toUserName: "Alice",
                amount: 1000,
                status: "payment_indicated",
                createdAt: new Date(),
              },
            ],
          },
        ],
      });

      const result = useGroupSessionStore
        .getState()
        .getPendingTransfersForUser("user-a");
      expect(result).toHaveLength(2);
      expect(result[0].transfer.id).toBe("t1");
      expect(result[1].transfer.id).toBe("t2");
    });

    it("includes multiple actionable transfers from the same session", () => {
      useGroupSessionStore.setState({
        groupSessionHistory: [
          {
            id: "s1",
            cadence: "daily",
            stakePerParticipant: 500,
            poolTotal: 1500,
            startedAt: new Date(),
            endsAt: new Date(),
            status: "surrendered",
            completedAt: new Date(),
            participants: [],
            transfers: [
              {
                id: "t1",
                fromUserId: "user-a",
                fromUserName: "Alice",
                toUserId: "user-b",
                toUserName: "Bob",
                amount: 300,
                status: "pending",
                createdAt: new Date(),
              },
              {
                id: "t2",
                fromUserId: "user-a",
                fromUserName: "Alice",
                toUserId: "user-c",
                toUserName: "Charlie",
                amount: 200,
                status: "overdue",
                createdAt: new Date(),
              },
            ],
          },
        ],
      });

      const result = useGroupSessionStore
        .getState()
        .getPendingTransfersForUser("user-a");
      expect(result).toHaveLength(2);
    });
  });
});
