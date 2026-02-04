/**
 * Unit Tests for walletStore.ts
 *
 * Testing Strategy:
 * - WHITE BOX: Tests internal transaction creation logic
 * - State mutation testing
 * - Transaction history testing
 * - Balance calculation testing
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "react";
import { useWalletStore } from "../../../store/walletStore";
import { useAuthStore } from "../../../store/authStore";
import { INITIAL_BALANCE } from "../../../constants/config";

describe("walletStore", () => {
  // Reset stores before each test
  beforeEach(() => {
    // Reset wallet store to initial state
    useWalletStore.setState({
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
    });

    // Logout to reset auth store
    useAuthStore.getState().logout();
  });

  describe("initial state", () => {
    it("should have correct initial balance", () => {
      const state = useWalletStore.getState();
      expect(state.balance).toBe(INITIAL_BALANCE);
    });

    it("should have initial welcome bonus transaction", () => {
      const state = useWalletStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].type).toBe("deposit");
      expect(state.transactions[0].description).toBe("Welcome bonus");
      expect(state.transactions[0].amount).toBe(INITIAL_BALANCE);
    });

    it("should have zero pending withdrawal", () => {
      const state = useWalletStore.getState();
      expect(state.pendingWithdrawal).toBe(0);
    });
  });

  describe("deposit", () => {
    it("should increase balance by deposit amount", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.deposit(1000); // $10
      });

      expect(useWalletStore.getState().balance).toBe(INITIAL_BALANCE + 1000);
    });

    it("should create deposit transaction", () => {
      const store = useWalletStore.getState();
      const initialTransactionCount =
        useWalletStore.getState().transactions.length;

      act(() => {
        store.deposit(2500);
      });

      const state = useWalletStore.getState();
      expect(state.transactions.length).toBe(initialTransactionCount + 1);

      const newTransaction = state.transactions[0];
      expect(newTransaction.type).toBe("deposit");
      expect(newTransaction.amount).toBe(2500);
      expect(newTransaction.description).toBe("Deposit");
      expect(newTransaction.id).toBeDefined();
      expect(newTransaction.createdAt).toBeInstanceOf(Date);
    });

    it("should prepend new transactions to history", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.deposit(1000);
      });

      act(() => {
        store.deposit(2000);
      });

      const transactions = useWalletStore.getState().transactions;
      expect(transactions[0].amount).toBe(2000); // Most recent first
      expect(transactions[1].amount).toBe(1000);
    });

    it("should generate unique transaction IDs", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.deposit(1000);
        store.deposit(2000);
      });

      const transactions = useWalletStore.getState().transactions;
      const ids = transactions.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("withdraw", () => {
    it("should decrease balance by withdrawal amount", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.withdraw(1000);
      });

      expect(useWalletStore.getState().balance).toBe(INITIAL_BALANCE - 1000);
    });

    it("should increase pendingWithdrawal", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.withdraw(1000);
      });

      expect(useWalletStore.getState().pendingWithdrawal).toBe(1000);
    });

    it("should create withdrawal transaction with negative amount", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.withdraw(1500);
      });

      const newTransaction = useWalletStore.getState().transactions[0];
      expect(newTransaction.type).toBe("withdrawal");
      expect(newTransaction.amount).toBe(-1500);
      expect(newTransaction.description).toBe("Withdrawal (pending)");
    });

    it("should not withdraw more than balance", () => {
      const store = useWalletStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      act(() => {
        store.withdraw(initialBalance + 1000); // Try to withdraw more than balance
      });

      // Balance should remain unchanged
      expect(useWalletStore.getState().balance).toBe(initialBalance);
    });

    it("should allow withdrawing exact balance", () => {
      const store = useWalletStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      act(() => {
        store.withdraw(initialBalance);
      });

      expect(useWalletStore.getState().balance).toBe(0);
    });

    it("should accumulate pending withdrawals", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.withdraw(1000);
        store.withdraw(500);
      });

      expect(useWalletStore.getState().pendingWithdrawal).toBe(1500);
    });
  });

  describe("deductStake", () => {
    it("should decrease balance by stake amount", () => {
      const store = useWalletStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      act(() => {
        store.deductStake(500, "session-123");
      });

      expect(useWalletStore.getState().balance).toBe(initialBalance - 500);
    });

    it("should create stake transaction with sessionId", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.deductStake(500, "session-abc");
      });

      const newTransaction = useWalletStore.getState().transactions[0];
      expect(newTransaction.type).toBe("stake");
      expect(newTransaction.amount).toBe(-500);
      expect(newTransaction.description).toBe("Session stake");
      expect(newTransaction.sessionId).toBe("session-abc");
    });

    it("should deduct exact stake amount regardless of balance", () => {
      // Note: In production this should probably have validation
      const store = useWalletStore.getState();

      act(() => {
        store.deductStake(100, "session-1");
        store.deductStake(200, "session-2");
      });

      const expectedBalance = INITIAL_BALANCE - 100 - 200;
      expect(useWalletStore.getState().balance).toBe(expectedBalance);
    });
  });

  describe("creditPayout", () => {
    it("should increase balance by payout amount", () => {
      const store = useWalletStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      act(() => {
        store.creditPayout(1000, "session-123");
      });

      expect(useWalletStore.getState().balance).toBe(initialBalance + 1000);
    });

    it("should create payout transaction with sessionId", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.creditPayout(1000, "session-xyz");
      });

      const newTransaction = useWalletStore.getState().transactions[0];
      expect(newTransaction.type).toBe("payout");
      expect(newTransaction.amount).toBe(1000);
      expect(newTransaction.description).toBe("Session completed - Payout");
      expect(newTransaction.sessionId).toBe("session-xyz");
    });
  });

  describe("recordForfeit", () => {
    it("should not change balance (stake already deducted)", () => {
      const store = useWalletStore.getState();
      const balanceBeforeForfeit = useWalletStore.getState().balance;

      act(() => {
        store.recordForfeit(500, "session-123");
      });

      expect(useWalletStore.getState().balance).toBe(balanceBeforeForfeit);
    });

    it("should create forfeit transaction with zero amount", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.recordForfeit(500, "session-abc");
      });

      const newTransaction = useWalletStore.getState().transactions[0];
      expect(newTransaction.type).toBe("forfeit");
      expect(newTransaction.amount).toBe(0);
      expect(newTransaction.description).toBe(
        "Session surrendered - Stake forfeited",
      );
      expect(newTransaction.sessionId).toBe("session-abc");
    });
  });

  describe("session flow integration", () => {
    it("should correctly handle complete session (stake then payout)", () => {
      const store = useWalletStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      // Stake $5
      act(() => {
        store.deductStake(500, "session-1");
      });

      expect(useWalletStore.getState().balance).toBe(initialBalance - 500);

      // Complete session - payout $10
      act(() => {
        store.creditPayout(1000, "session-1");
      });

      // Net gain: -500 + 1000 = +500
      expect(useWalletStore.getState().balance).toBe(initialBalance + 500);
    });

    it("should correctly handle surrendered session (stake then forfeit)", () => {
      const store = useWalletStore.getState();
      const initialBalance = useWalletStore.getState().balance;

      // Stake $5
      act(() => {
        store.deductStake(500, "session-1");
      });

      // Surrender - forfeit stake
      act(() => {
        store.recordForfeit(500, "session-1");
      });

      // Net loss: -500
      expect(useWalletStore.getState().balance).toBe(initialBalance - 500);
    });
  });

  describe("transaction history", () => {
    it("should track all transactions in order", () => {
      const store = useWalletStore.getState();

      act(() => {
        store.deposit(1000);
        store.deductStake(500, "session-1");
        store.creditPayout(1000, "session-1");
        store.withdraw(500);
      });

      const transactions = useWalletStore.getState().transactions;

      // Most recent first
      expect(transactions[0].type).toBe("withdrawal");
      expect(transactions[1].type).toBe("payout");
      expect(transactions[2].type).toBe("stake");
      expect(transactions[3].type).toBe("deposit");
    });
  });
});
