import { create } from "zustand";
import { Partner, DuoSession, CadenceType, UserReputation } from "../types";
import { CADENCES, DEMO_MODE } from "../constants/config";
import { useAuthStore } from "./authStore";
import { useWalletStore } from "./walletStore";

interface PartnerState {
  // Current partner for duo sessions
  currentPartner: Partner | null;
  // All partners (for money plant visualization)
  partners: Partner[];
  // Active duo session
  activeDuoSession: DuoSession | null;
  // History of duo sessions
  duoSessionHistory: DuoSession[];
  // Pending partner invites
  pendingInvites: PartnerInvite[];

  // Actions
  addPartner: (
    partner: Omit<
      Partner,
      "id" | "connectedAt" | "totalSessionsTogether" | "isActive"
    >,
  ) => void;
  removePartner: (oderId: string) => void;
  selectPartner: (oderId: string) => void;
  startDuoSession: (cadence: CadenceType) => void;
  completeDuoSession: (
    userCompleted: boolean,
    partnerCompleted: boolean,
  ) => void;
  markSettlementPaid: (sessionId: string) => void;
  markSettlementReceived: (sessionId: string) => void;
  sendInvite: (email: string, name: string) => void;
  acceptInvite: (inviteId: string) => void;
  getVenmoPayLink: (
    amount: number,
    recipientHandle: string,
    note: string,
  ) => string;
}

interface PartnerInvite {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toEmail: string;
  toName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
}

// Demo partner for testing
const DEMO_PARTNER: Partner = {
  id: "demo-partner-1",
  oderId: "partner-user-1",
  name: "Fardeen Bablu",
  email: "fardeen@example.com",
  venmoHandle: "@fardeen-demo",
  reputation: {
    score: 72,
    level: "tree",
    paymentsCompleted: 8,
    paymentsMissed: 1,
    totalOwedPaid: 4500, // $45 paid
    totalOwedMissed: 500, // $5 missed once
    lastUpdated: new Date(),
  },
  connectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  totalSessionsTogether: 5,
  isActive: false,
};

export const usePartnerStore = create<PartnerState>((set, get) => ({
  currentPartner: null,
  partners: DEMO_MODE ? [DEMO_PARTNER] : [],
  activeDuoSession: null,
  duoSessionHistory: [],
  pendingInvites: [],

  addPartner: (partnerData) => {
    const partner: Partner = {
      ...partnerData,
      id: Math.random().toString(36).substr(2, 9),
      connectedAt: new Date(),
      totalSessionsTogether: 0,
      isActive: false,
    };

    set((state) => ({
      partners: [...state.partners, partner],
    }));
  },

  removePartner: (oderId: string) => {
    set((state) => ({
      partners: state.partners.filter((p) => p.oderId !== oderId),
      currentPartner:
        state.currentPartner?.oderId === oderId ? null : state.currentPartner,
    }));
  },

  selectPartner: (oderId: string) => {
    const { partners } = get();
    const partner = partners.find((p) => p.oderId === oderId);
    set({ currentPartner: partner || null });
  },

  startDuoSession: (cadence: CadenceType) => {
    const { currentPartner, partners } = get();
    if (!currentPartner) return;

    const config = CADENCES[cadence];
    const duration = DEMO_MODE ? config.demoDuration : config.duration;

    const duoSession: DuoSession = {
      id: Math.random().toString(36).substr(2, 9),
      cadence,
      stakeAmount: config.stake,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + duration),
      status: "active",
      partnerId: currentPartner.oderId,
      partnerName: currentPartner.name,
      partnerVenmo: currentPartner.venmoHandle,
    };

    // Deduct stake from wallet
    useWalletStore.getState().deductStake(config.stake, duoSession.id);

    // Mark partner as active
    const updatedPartners = partners.map((p) =>
      p.oderId === currentPartner.oderId ? { ...p, isActive: true } : p,
    );

    set({
      activeDuoSession: duoSession,
      partners: updatedPartners,
      currentPartner: { ...currentPartner, isActive: true },
    });
  },

  completeDuoSession: (userCompleted: boolean, partnerCompleted: boolean) => {
    const { activeDuoSession, duoSessionHistory, partners, currentPartner } =
      get();
    if (!activeDuoSession) return;

    // Determine outcome and settlement
    let settlementStatus: DuoSession["settlementStatus"] = undefined;
    let amountOwed = 0;

    if (userCompleted && !partnerCompleted) {
      // User wins - partner owes user
      amountOwed = -activeDuoSession.stakeAmount; // Negative = partner owes user
      settlementStatus = "pending";
    } else if (!userCompleted && partnerCompleted) {
      // Partner wins - user owes partner
      amountOwed = activeDuoSession.stakeAmount; // Positive = user owes partner
      settlementStatus = "pending";
    } else if (userCompleted && partnerCompleted) {
      // Both completed - no settlement needed, both keep stakes
      amountOwed = 0;
      // Return stake to wallet
      useWalletStore
        .getState()
        .creditPayout(activeDuoSession.stakeAmount, activeDuoSession.id);
    } else {
      // Both failed - both lose stakes (to the house/charity)
      amountOwed = 0;
      useWalletStore
        .getState()
        .recordForfeit(activeDuoSession.stakeAmount, activeDuoSession.id);
    }

    const completedSession: DuoSession = {
      ...activeDuoSession,
      status: userCompleted ? "completed" : "surrendered",
      completedAt: new Date(),
      userCompleted,
      partnerCompleted,
      settlementStatus,
      amountOwed,
    };

    // Update partner stats
    const updatedPartners = partners.map((p) =>
      p.oderId === activeDuoSession.partnerId
        ? {
            ...p,
            isActive: false,
            totalSessionsTogether: p.totalSessionsTogether + 1,
          }
        : p,
    );

    // Update user stats
    const authStore = useAuthStore.getState();
    if (userCompleted) {
      const newStreak = (authStore.user?.currentStreak || 0) + 1;
      authStore.updateUser({
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, authStore.user?.longestStreak || 0),
        totalSessions: (authStore.user?.totalSessions || 0) + 1,
        completedSessions: (authStore.user?.completedSessions || 0) + 1,
      });
    } else {
      authStore.updateUser({
        currentStreak: 0,
        totalSessions: (authStore.user?.totalSessions || 0) + 1,
      });
    }

    set({
      activeDuoSession: null,
      duoSessionHistory: [completedSession, ...duoSessionHistory],
      partners: updatedPartners,
      currentPartner: currentPartner
        ? { ...currentPartner, isActive: false }
        : null,
    });

    return completedSession;
  },

  markSettlementPaid: (sessionId: string) => {
    const { duoSessionHistory } = get();

    // Update session
    const updatedHistory = duoSessionHistory.map((s) =>
      s.id === sessionId ? { ...s, settlementStatus: "paid" as const } : s,
    );

    // Update user reputation (they paid what they owed)
    const session = duoSessionHistory.find((s) => s.id === sessionId);
    if (session && session.amountOwed && session.amountOwed > 0) {
      const authStore = useAuthStore.getState();
      const currentRep = authStore.user?.reputation;
      if (currentRep) {
        authStore.updateReputation({
          paymentsCompleted: currentRep.paymentsCompleted + 1,
          totalOwedPaid: currentRep.totalOwedPaid + session.amountOwed,
        });
      }

      // Record in wallet
      useWalletStore
        .getState()
        .recordSettlement(
          -session.amountOwed,
          sessionId,
          session.partnerId,
          `Paid ${session.partnerName}`,
        );
    }

    set({ duoSessionHistory: updatedHistory });
  },

  markSettlementReceived: (sessionId: string) => {
    const { duoSessionHistory } = get();

    const updatedHistory = duoSessionHistory.map((s) =>
      s.id === sessionId ? { ...s, settlementStatus: "received" as const } : s,
    );

    // Record in wallet
    const session = duoSessionHistory.find((s) => s.id === sessionId);
    if (session && session.amountOwed && session.amountOwed < 0) {
      useWalletStore
        .getState()
        .recordSettlement(
          Math.abs(session.amountOwed),
          sessionId,
          session.partnerId,
          `Received from ${session.partnerName}`,
        );
    }

    set({ duoSessionHistory: updatedHistory });
  },

  sendInvite: (email: string, name: string) => {
    const authStore = useAuthStore.getState();
    const invite: PartnerInvite = {
      id: Math.random().toString(36).substr(2, 9),
      fromUserId: authStore.user?.id || "",
      fromUserName: authStore.user?.name || "",
      toEmail: email,
      toName: name,
      status: "pending",
      createdAt: new Date(),
    };

    set((state) => ({
      pendingInvites: [...state.pendingInvites, invite],
    }));
  },

  acceptInvite: (inviteId: string) => {
    const { pendingInvites, addPartner } = get();
    const invite = pendingInvites.find((i) => i.id === inviteId);

    if (invite) {
      // Create partner from invite
      addPartner({
        oderId: invite.fromUserId,
        name: invite.fromUserName,
        email: invite.toEmail,
        reputation: {
          score: 50, // New partner starts at 50
          level: "sapling",
          paymentsCompleted: 0,
          paymentsMissed: 0,
          totalOwedPaid: 0,
          totalOwedMissed: 0,
          lastUpdated: new Date(),
        },
      });

      // Update invite status
      set((state) => ({
        pendingInvites: state.pendingInvites.map((i) =>
          i.id === inviteId ? { ...i, status: "accepted" as const } : i,
        ),
      }));
    }
  },

  getVenmoPayLink: (amount: number, recipientHandle: string, note: string) => {
    // Remove @ from handle if present
    const handle = recipientHandle.replace("@", "");
    const amountInDollars = (amount / 100).toFixed(2);
    const encodedNote = encodeURIComponent(note);

    // Venmo deep link format
    return `venmo://paycharge?txn=pay&recipients=${handle}&amount=${amountInDollars}&note=${encodedNote}`;
  },
}));
