export type CadenceType = "daily" | "weekly" | "monthly";

export interface PublicProfile {
  uid: string;
  name: string;
  reputation: { score: number; level: string; referralCount: number };
  currentStreak: number;
  totalSessions: number;
  completedSessions: number;
}

export type SessionStatus = "active" | "completed" | "surrendered";

// Reputation levels based on payment reliability
export type ReputationLevel = "seed" | "sprout" | "sapling" | "tree" | "oak";

export interface User {
  id: string; // Firebase UID
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  balance: number; // in cents
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  completedSessions: number;
  totalEarnings: number; // in cents
  createdAt: Date;
  // Reputation/Social Credit
  reputation: UserReputation;
  venmoHandle?: string; // For settlements
  zelleHandle?: string; // Email or phone for Zelle settlements
  profileImage?: string;
  blobAvatar?: {
    colorPreset: "sunset" | "ocean" | "forest" | "berry" | "lemon" | "coral";
    shapePreset: "peach" | "wave" | "petal";
    eyesPreset: "classic" | "happy" | "wink" | "sleepy" | "surprised";
  };
  phoneNumber?: string;
  authProvider?: "email" | "google" | "apple" | "phone";
  // Firebase-backed profile
  profileComplete?: boolean;
  // Stripe
  stripeAccountId?: string;
  stripeCustomerId?: string;
  stripeAccountStatus?: "pending" | "active" | "restricted";
  // Plaid bank connection
  linkedBank?: {
    institutionName: string;
    bankName: string;
    mask: string;
  };
  // Legal acceptance
  legalAcceptanceVersion?: string;
  legalAcceptedAt?: Date;
}

// Social credit system - tracks payment reliability
export interface UserReputation {
  score: number; // 0-100, starts at 50
  level: ReputationLevel;
  paymentsCompleted: number; // Times user paid when they lost
  paymentsMissed: number; // Times user didn't pay (flaky)
  totalOwedPaid: number; // Total amount user has paid when losing (cents)
  totalOwedMissed: number; // Total amount user failed to pay (cents)
  lastUpdated: Date;
  referralCount?: number; // Successful referrals; each adds a persistent score boost
}

// Partner relationship
export interface Partner {
  id: string;
  oderId: string; // The other user's ID
  name: string;
  email: string;
  venmoHandle?: string;
  profileImage?: string;
  reputation: UserReputation;
  connectedAt: Date;
  totalSessionsTogether: number;
  // For the money plant visualization
  isActive: boolean; // Currently in a session together
  tag?: string; // Optional label e.g. "Your Referrer"
}

// Duo session - both partners stake, loser pays winner
export interface DuoSession {
  id: string;
  cadence: CadenceType;
  stakeAmount: number; // in cents - what each person stakes
  startedAt: Date;
  endsAt: Date;
  status: SessionStatus;
  completedAt?: Date;
  // Partner info
  partnerId: string;
  partnerName: string;
  partnerVenmo?: string;
  // Outcomes
  userCompleted?: boolean; // Did current user complete?
  partnerCompleted?: boolean; // Did partner complete?
  // Settlement
  settlementStatus?: "pending" | "paid" | "received" | "disputed";
  amountOwed?: number; // Positive = user owes partner, negative = partner owes user
}

// Solo session (Phase 2 — stickK model for now; will use SOLO_COMPLETION_MULTIPLIER later)
export interface Session {
  id: string;
  cadence: CadenceType;
  stakeAmount: number; // in cents
  potentialPayout: number; // in cents — currently equals stake (stickK); Phase 2: stake × multiplier
  startedAt: Date;
  endsAt: Date;
  status: SessionStatus;
  completedAt?: Date;
  actualPayout?: number; // in cents
}

export interface Transaction {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "stake"
    | "payout"
    | "forfeit"
    | "settlement_paid"
    | "settlement_received";
  amount: number; // in cents (positive for credit, negative for debit)
  description: string;
  sessionId?: string;
  duoSessionId?: string;
  partnerId?: string; // For settlement transactions
  createdAt: Date;
}

// ─── Group Session (N-person generalization of DuoSession) ──────────────────

export type TransferStatus =
  | "none" // no transfer needed (all participants broke even)
  | "pending" // transfer required; payer has not acted
  | "payment_indicated" // payer marked as paid; awaiting recipient confirmation
  | "settled" // recipient confirmed receipt
  | "overdue" // grace period elapsed without payment
  | "disputed";

export interface SessionParticipant {
  userId: string;
  name: string;
  venmoHandle?: string;
  profileImage?: string;
  reputation: UserReputation;
  stakeAmount: number; // in cents — set from cadence config when session starts
  // Populated on completion
  completed?: boolean;
  screenTime?: number; // ms of usage during session (input to payout algorithm)
  payout?: number; // in cents — share of pool from algorithm
}

export interface SessionTransfer {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number; // in cents, always positive
  status: TransferStatus;
  createdAt: Date;
  paidAt?: Date;
  confirmedAt?: Date;
}

export interface GroupSession {
  id: string;
  cadence: CadenceType;
  stakePerParticipant: number; // in cents
  poolTotal: number; // stakePerParticipant × participants.length
  startedAt: Date;
  endsAt: Date;
  status: SessionStatus; // from current user's perspective
  completedAt?: Date;
  participants: SessionParticipant[];
  transfers: SessionTransfer[]; // empty while active; populated on completion
}

// ─── Group Session (Firestore-backed, server-authoritative) ─────────────────

export type GroupSessionStatus =
  | "pending" // invites sent, waiting for accepts
  | "ready" // all accepted, waiting for everyone to go online
  | "active" // timer running
  | "completed" // all participants reported, payouts distributed
  | "cancelled"; // proposer cancelled or auto-timeout

export interface GroupSessionParticipant {
  name: string;
  venmoHandle?: string;
  profileImage?: string;
  reputation: UserReputation;
  accepted: boolean;
  online: boolean;
  completed?: boolean;
  surrendered?: boolean;
  surrenderedAt?: Date;
}

// The Firestore document shape for group sessions
export interface GroupSessionDoc {
  id: string;
  proposerId: string;
  status: GroupSessionStatus;
  cadence: CadenceType;
  stakePerParticipant: number; // cents
  customStake: boolean;
  duration: number; // ms
  participantIds: string[]; // for security rules / queries
  participants: Record<string, GroupSessionParticipant>;
  poolTotal: number;
  startedAt?: Date;
  endsAt?: Date;
  completedAt?: Date;
  payouts?: Record<string, number>; // userId -> payout in cents
  transfers?: SessionTransfer[];
  createdAt: Date;
  updatedAt: Date;
  autoTimeoutAt?: Date; // 30 min after all accept; null while pending
}

export type GroupInviteStatus = "pending" | "accepted" | "declined" | "expired";

export interface GroupInvite {
  id: string;
  sessionId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  toUserId: string;
  stake: number; // cents
  cadence: CadenceType;
  duration: number; // ms
  status: GroupInviteStatus;
  createdAt: Date;
  respondedAt?: Date;
}
