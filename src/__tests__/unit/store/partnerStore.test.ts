/**
 * Unit Tests for partnerStore
 *
 * Tests partner management, duo sessions, settlements, invites, and Venmo links.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePartnerStore } from "../../../store/partnerStore";
import { useWalletStore } from "../../../store/walletStore";
import { useAuthStore } from "../../../store/authStore";
import { CADENCES, INITIAL_BALANCE } from "../../../constants/config";
import type { UserReputation } from "../../../types";

// Helper to create a fresh reputation object
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
  ...overrides,
});

describe("partnerStore", () => {
  beforeEach(() => {
    // Reset all stores
    usePartnerStore.setState({
      currentPartner: null,
      partners: [],
      activeDuoSession: null,
      duoSessionHistory: [],
      pendingInvites: [],
    });

    useWalletStore.setState({
      balance: INITIAL_BALANCE,
      transactions: [],
      pendingWithdrawal: 0,
    });

    useAuthStore.setState({
      user: {
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
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
  });

  describe("addPartner", () => {
    it("adds a partner with generated id and defaults", () => {
      const { addPartner } = usePartnerStore.getState();

      addPartner({
        oderId: "user-123",
        name: "Alice",
        email: "alice@example.com",
        reputation: makeReputation(),
      });

      const { partners } = usePartnerStore.getState();
      expect(partners).toHaveLength(1);
      expect(partners[0].name).toBe("Alice");
      expect(partners[0].oderId).toBe("user-123");
      expect(partners[0].totalSessionsTogether).toBe(0);
      expect(partners[0].isActive).toBe(false);
      expect(partners[0].id).toBeDefined();
      expect(partners[0].connectedAt).toBeDefined();
    });

    it("can add multiple partners", () => {
      const { addPartner } = usePartnerStore.getState();

      addPartner({
        oderId: "user-1",
        name: "Alice",
        email: "a@test.com",
        reputation: makeReputation(),
      });
      addPartner({
        oderId: "user-2",
        name: "Bob",
        email: "b@test.com",
        reputation: makeReputation(),
      });

      expect(usePartnerStore.getState().partners).toHaveLength(2);
    });
  });

  describe("removePartner", () => {
    it("removes a partner by oderId", () => {
      usePartnerStore.setState({
        partners: [
          {
            id: "p1",
            oderId: "user-1",
            name: "Alice",
            email: "a@test.com",
            reputation: makeReputation(),
            connectedAt: new Date(),
            totalSessionsTogether: 0,
            isActive: false,
          },
        ],
      });

      usePartnerStore.getState().removePartner("user-1");
      expect(usePartnerStore.getState().partners).toHaveLength(0);
    });

    it("clears currentPartner if the removed partner is selected", () => {
      const partner = {
        id: "p1",
        oderId: "user-1",
        name: "Alice",
        email: "a@test.com",
        reputation: makeReputation(),
        connectedAt: new Date(),
        totalSessionsTogether: 0,
        isActive: false,
      };

      usePartnerStore.setState({
        partners: [partner],
        currentPartner: partner,
      });

      usePartnerStore.getState().removePartner("user-1");
      expect(usePartnerStore.getState().currentPartner).toBeNull();
    });
  });

  describe("selectPartner", () => {
    it("sets currentPartner by oderId", () => {
      const partner = {
        id: "p1",
        oderId: "user-1",
        name: "Alice",
        email: "a@test.com",
        reputation: makeReputation(),
        connectedAt: new Date(),
        totalSessionsTogether: 0,
        isActive: false,
      };

      usePartnerStore.setState({ partners: [partner] });
      usePartnerStore.getState().selectPartner("user-1");

      expect(usePartnerStore.getState().currentPartner?.name).toBe("Alice");
    });

    it("sets null if oderId not found", () => {
      usePartnerStore.getState().selectPartner("nonexistent");
      expect(usePartnerStore.getState().currentPartner).toBeNull();
    });
  });

  describe("startDuoSession", () => {
    it("creates an active duo session and deducts stake", () => {
      const partner = {
        id: "p1",
        oderId: "user-1",
        name: "Alice",
        email: "a@test.com",
        venmoHandle: "@alice",
        reputation: makeReputation(),
        connectedAt: new Date(),
        totalSessionsTogether: 0,
        isActive: false,
      };

      usePartnerStore.setState({
        partners: [partner],
        currentPartner: partner,
      });

      usePartnerStore.getState().startDuoSession("daily");

      const { activeDuoSession } = usePartnerStore.getState();
      expect(activeDuoSession).not.toBeNull();
      expect(activeDuoSession!.cadence).toBe("daily");
      expect(activeDuoSession!.stakeAmount).toBe(CADENCES.daily.stake);
      expect(activeDuoSession!.status).toBe("active");
      expect(activeDuoSession!.partnerId).toBe("user-1");

      // Wallet should be debited
      const wallet = useWalletStore.getState();
      expect(wallet.balance).toBe(INITIAL_BALANCE - CADENCES.daily.stake);
    });

    it("marks partner as active", () => {
      const partner = {
        id: "p1",
        oderId: "user-1",
        name: "Alice",
        email: "a@test.com",
        reputation: makeReputation(),
        connectedAt: new Date(),
        totalSessionsTogether: 0,
        isActive: false,
      };

      usePartnerStore.setState({
        partners: [partner],
        currentPartner: partner,
      });

      usePartnerStore.getState().startDuoSession("daily");

      const { partners, currentPartner } = usePartnerStore.getState();
      expect(partners[0].isActive).toBe(true);
      expect(currentPartner!.isActive).toBe(true);
    });

    it("does nothing if no currentPartner selected", () => {
      usePartnerStore.getState().startDuoSession("daily");
      expect(usePartnerStore.getState().activeDuoSession).toBeNull();
    });
  });

  describe("completeDuoSession", () => {
    const setupActiveSession = () => {
      const partner = {
        id: "p1",
        oderId: "user-1",
        name: "Alice",
        email: "a@test.com",
        venmoHandle: "@alice",
        reputation: makeReputation(),
        connectedAt: new Date(),
        totalSessionsTogether: 3,
        isActive: false,
      };

      usePartnerStore.setState({
        partners: [partner],
        currentPartner: partner,
      });

      usePartnerStore.getState().startDuoSession("daily");
    };

    it("both complete: returns stakes, no settlement needed", () => {
      setupActiveSession();
      usePartnerStore.getState().completeDuoSession(true, true);

      const { activeDuoSession, duoSessionHistory } =
        usePartnerStore.getState();
      expect(activeDuoSession).toBeNull();
      expect(duoSessionHistory).toHaveLength(1);
      expect(duoSessionHistory[0].status).toBe("completed");
      expect(duoSessionHistory[0].amountOwed).toBe(0);

      // Wallet should be back to original (stake returned)
      expect(useWalletStore.getState().balance).toBe(INITIAL_BALANCE);
    });

    it("user wins, partner fails: settlement pending (partner owes user)", () => {
      setupActiveSession();
      usePartnerStore.getState().completeDuoSession(true, false);

      const session = usePartnerStore.getState().duoSessionHistory[0];
      expect(session.status).toBe("completed");
      expect(session.settlementStatus).toBe("pending");
      expect(session.amountOwed).toBeLessThan(0); // Negative = partner owes user
    });

    it("user fails, partner wins: user owes partner", () => {
      setupActiveSession();
      usePartnerStore.getState().completeDuoSession(false, true);

      const session = usePartnerStore.getState().duoSessionHistory[0];
      expect(session.status).toBe("surrendered");
      expect(session.settlementStatus).toBe("pending");
      expect(session.amountOwed).toBeGreaterThan(0); // Positive = user owes
    });

    it("both fail: both lose stakes (forfeit)", () => {
      setupActiveSession();
      usePartnerStore.getState().completeDuoSession(false, false);

      const session = usePartnerStore.getState().duoSessionHistory[0];
      expect(session.status).toBe("surrendered");
      expect(session.amountOwed).toBe(0);
    });

    it("increments partner session count", () => {
      setupActiveSession();
      usePartnerStore.getState().completeDuoSession(true, true);

      const { partners } = usePartnerStore.getState();
      expect(partners[0].totalSessionsTogether).toBe(4); // Was 3, now 4
    });

    it("updates user streak on completion", () => {
      setupActiveSession();
      usePartnerStore.getState().completeDuoSession(true, true);

      const user = useAuthStore.getState().user;
      expect(user!.currentStreak).toBe(1);
      expect(user!.completedSessions).toBe(1);
    });

    it("resets user streak on failure", () => {
      // Set an existing streak
      useAuthStore.getState().updateUser({ currentStreak: 5 });

      setupActiveSession();
      usePartnerStore.getState().completeDuoSession(false, true);

      expect(useAuthStore.getState().user!.currentStreak).toBe(0);
    });
  });

  describe("settlements", () => {
    it("markSettlementPaid updates session and reputation", () => {
      // Set up a completed session where user owes partner
      const session = {
        id: "session-1",
        cadence: "daily" as const,
        stakeAmount: 500,
        startedAt: new Date(),
        endsAt: new Date(),
        status: "surrendered" as const,
        partnerId: "user-1",
        partnerName: "Alice",
        settlementStatus: "pending" as const,
        amountOwed: 500, // User owes partner $5
      };

      usePartnerStore.setState({ duoSessionHistory: [session] });
      usePartnerStore.getState().markSettlementPaid("session-1");

      const updated = usePartnerStore.getState().duoSessionHistory[0];
      expect(updated.settlementStatus).toBe("paid");
    });

    it("markSettlementReceived updates session", () => {
      const session = {
        id: "session-2",
        cadence: "daily" as const,
        stakeAmount: 500,
        startedAt: new Date(),
        endsAt: new Date(),
        status: "completed" as const,
        partnerId: "user-1",
        partnerName: "Alice",
        settlementStatus: "pending" as const,
        amountOwed: -500, // Partner owes user
      };

      usePartnerStore.setState({ duoSessionHistory: [session] });
      usePartnerStore.getState().markSettlementReceived("session-2");

      const updated = usePartnerStore.getState().duoSessionHistory[0];
      expect(updated.settlementStatus).toBe("received");
    });
  });

  describe("invites", () => {
    it("sendInvite creates a pending invite", () => {
      usePartnerStore.getState().sendInvite("alice@test.com", "Alice");

      const { pendingInvites } = usePartnerStore.getState();
      expect(pendingInvites).toHaveLength(1);
      expect(pendingInvites[0].toEmail).toBe("alice@test.com");
      expect(pendingInvites[0].toName).toBe("Alice");
      expect(pendingInvites[0].status).toBe("pending");
    });

    it("acceptInvite creates partner and updates invite status", () => {
      usePartnerStore.setState({
        pendingInvites: [
          {
            id: "inv-1",
            fromUserId: "user-alice",
            fromUserName: "Alice",
            toEmail: "me@test.com",
            toName: "Me",
            status: "pending",
            createdAt: new Date(),
          },
        ],
      });

      usePartnerStore.getState().acceptInvite("inv-1");

      const { partners, pendingInvites } = usePartnerStore.getState();
      expect(partners).toHaveLength(1);
      expect(partners[0].name).toBe("Alice");
      expect(pendingInvites[0].status).toBe("accepted");
    });
  });

  describe("getVenmoPayLink", () => {
    it("generates correct Venmo deep link", () => {
      const link = usePartnerStore
        .getState()
        .getVenmoPayLink(500, "@alice", "NIYAH session payout");

      expect(link).toContain("venmo://paycharge");
      expect(link).toContain("recipients=alice");
      expect(link).toContain("amount=5.00");
      expect(link).toContain("note=NIYAH");
    });

    it("strips @ from handle", () => {
      const link = usePartnerStore
        .getState()
        .getVenmoPayLink(1000, "@bob-test", "Payment");

      expect(link).toContain("recipients=bob-test");
      expect(link).not.toContain("recipients=@");
    });
  });
});
