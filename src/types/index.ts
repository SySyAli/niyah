export type CadenceType = "daily" | "weekly" | "monthly";

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
  profileImage?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  authProvider?: "email" | "google" | "apple";
  // Firebase-backed profile
  profileComplete?: boolean;
  // Stripe
  stripeAccountId?: string;
  stripeCustomerId?: string;
  stripeAccountStatus?: "pending" | "active" | "restricted";
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

// Legacy solo session (keeping for backwards compatibility)
export interface Session {
  id: string;
  cadence: CadenceType;
  stakeAmount: number; // in cents
  potentialPayout: number; // in cents (deprecated - now equals stake)
  startedAt: Date;
  endsAt: Date;
  status: SessionStatus;
  completedAt?: Date;
  actualPayout?: number; // in cents
  // New: link to duo session if applicable
  duoSessionId?: string;
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

export interface WalletState {
  balance: number;
  transactions: Transaction[];
  pendingWithdrawal: number;
}

// Money Plant visualization data
export interface MoneyPlantData {
  growthStage: number; // 1-5 based on network size and reputation
  totalLeaves: number; // Number of coin leaves (completed sessions)
  partners: Partner[];
  totalEarned: number; // Lifetime earnings from duo sessions
}
