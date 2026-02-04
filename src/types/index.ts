export type CadenceType = "daily" | "weekly" | "monthly";

export type SessionStatus = "active" | "completed" | "surrendered";

export interface User {
  id: string;
  email: string;
  name: string;
  balance: number; // in cents
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  completedSessions: number;
  totalEarnings: number; // in cents
  createdAt: Date;
}

export interface Session {
  id: string;
  cadence: CadenceType;
  stakeAmount: number; // in cents
  potentialPayout: number; // in cents
  startedAt: Date;
  endsAt: Date;
  status: SessionStatus;
  completedAt?: Date;
  actualPayout?: number; // in cents
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "stake" | "payout" | "forfeit";
  amount: number; // in cents (positive for credit, negative for debit)
  description: string;
  sessionId?: string;
  createdAt: Date;
}

export interface WalletState {
  balance: number;
  transactions: Transaction[];
  pendingWithdrawal: number;
}
