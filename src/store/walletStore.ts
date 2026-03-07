import { create } from "zustand";
import { Transaction } from "../types";
import { INITIAL_BALANCE } from "../constants/config";
import { useAuthStore } from "./authStore";

interface WalletState {
  balance: number;
  transactions: Transaction[];
  pendingWithdrawal: number;

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
  balance: INITIAL_BALANCE,
  transactions: [
    {
      id: "initial",
      type: "deposit",
      amount: INITIAL_BALANCE,
      description: "Welcome bonus",
      createdAt: new Date(),
    },
  ],
  pendingWithdrawal: 0,

  deposit: (amount: number, syncedBalance?: number) => {
    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
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
      id: Math.random().toString(36).substr(2, 9),
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
    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
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
      id: Math.random().toString(36).substr(2, 9),
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
      id: Math.random().toString(36).substr(2, 9),
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
      id: Math.random().toString(36).substr(2, 9),
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
