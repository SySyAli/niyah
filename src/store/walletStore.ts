import { create } from "zustand";
import { Transaction } from "../types";
import { DEMO_MODE, INITIAL_BALANCE } from "../constants/config";
import { useAuthStore } from "./authStore";
import { getWalletDoc } from "../config/firebase";
import { generateId } from "../utils/id";
import { logger } from "../utils/logger";

interface WalletState {
  balance: number;
  transactions: Transaction[];
  pendingWithdrawal: number;
  isHydrated: boolean;

  /** Hydrate balance from Firestore. Call after login. */
  hydrate: (uid: string) => Promise<void>;
  // syncedBalance: when provided (from server after real Stripe payment), use as authoritative balance
  deposit: (amount: number, syncedBalance?: number) => void;
  withdraw: (amount: number) => void;
  deductStake: (amount: number, sessionId: string) => void;
  creditPayout: (amount: number, sessionId: string) => void;
  recordForfeit: (amount: number, sessionId: string) => void;
  recordSettlement: (
    amount: number,
    sessionId: string,
    partnerId: string,
    description: string,
  ) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: DEMO_MODE ? INITIAL_BALANCE : 0,
  transactions: DEMO_MODE
    ? [
        {
          id: "initial",
          type: "deposit" as const,
          amount: INITIAL_BALANCE,
          description: "Welcome bonus",
          createdAt: new Date(),
        },
      ]
    : [],
  pendingWithdrawal: 0,
  isHydrated: DEMO_MODE, // In demo mode, we're "hydrated" immediately

  hydrate: async (uid: string) => {
    if (DEMO_MODE) return; // Demo mode uses INITIAL_BALANCE

    try {
      const wallet = await getWalletDoc(uid);
      if (wallet) {
        set({
          balance: wallet.balance,
          pendingWithdrawal: wallet.pendingBalance,
          isHydrated: true,
        });
      } else {
        // No wallet doc yet (new user); balance is 0
        set({ balance: 0, isHydrated: true });
      }
    } catch (error) {
      logger.error("Failed to hydrate wallet from Firestore:", error);
      // Still mark as hydrated so UI isn't stuck in loading state
      set({ isHydrated: true });
    }
  },

  deposit: (amount: number, syncedBalance?: number) => {
    const transaction: Transaction = {
      id: generateId(),
      type: "deposit",
      amount,
      description: "Deposit",
      createdAt: new Date(),
    };

    set((state) => ({
      // If server returned authoritative balance, use it; otherwise increment locally
      balance: syncedBalance ?? state.balance + amount,
      transactions: [transaction, ...state.transactions],
    }));

    useAuthStore.getState().updateUser({
      balance: get().balance,
    });
  },

  withdraw: (amount: number) => {
    const { balance } = get();
    if (amount > balance) return;

    const transaction: Transaction = {
      id: generateId(),
      type: "withdrawal",
      amount: -amount,
      description: "Withdrawal (pending)",
      createdAt: new Date(),
    };

    set((state) => ({
      balance: state.balance - amount,
      pendingWithdrawal: state.pendingWithdrawal + amount,
      transactions: [transaction, ...state.transactions],
    }));

    useAuthStore.getState().updateUser({
      balance: get().balance,
    });
  },

  deductStake: (amount: number, sessionId: string) => {
    const { balance } = get();
    if (amount > balance) {
      throw new Error(
        `Insufficient balance: need ${amount} cents but have ${balance}`,
      );
    }

    const transaction: Transaction = {
      id: generateId(),
      type: "stake",
      amount: -amount,
      description: "Session stake",
      sessionId,
      createdAt: new Date(),
    };

    set((state) => ({
      balance: state.balance - amount,
      transactions: [transaction, ...state.transactions],
    }));

    useAuthStore.getState().updateUser({
      balance: get().balance,
    });
  },

  creditPayout: (amount: number, sessionId: string) => {
    const transaction: Transaction = {
      id: generateId(),
      type: "payout",
      amount,
      description: "Session completed - Payout",
      sessionId,
      createdAt: new Date(),
    };

    set((state) => ({
      balance: state.balance + amount,
      transactions: [transaction, ...state.transactions],
    }));

    useAuthStore.getState().updateUser({
      balance: get().balance,
    });
  },

  recordForfeit: (amount: number, sessionId: string) => {
    const transaction: Transaction = {
      id: generateId(),
      type: "forfeit",
      amount: 0, // Already deducted when session started
      description: "Session surrendered - Stake forfeited",
      sessionId,
      createdAt: new Date(),
    };

    set((state) => ({
      transactions: [transaction, ...state.transactions],
    }));
  },

  recordSettlement: (
    amount: number,
    sessionId: string,
    partnerId: string,
    description: string,
  ) => {
    const transaction: Transaction = {
      id: generateId(),
      type: amount > 0 ? "settlement_received" : "settlement_paid",
      amount,
      description,
      sessionId,
      duoSessionId: sessionId,
      partnerId,
      createdAt: new Date(),
    };

    set((state) => ({
      balance: state.balance + amount,
      transactions: [transaction, ...state.transactions],
    }));

    useAuthStore.getState().updateUser({
      balance: get().balance,
    });
  },
}));
