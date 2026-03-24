/**
 * Unit Tests for TransactionHistory component
 *
 * Tests section title, empty state, transaction rows, amount formatting
 * and sign, relative time display, and the limit prop.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { TransactionHistory } from "../../../components/profile/TransactionHistory";
import type { Transaction } from "../../../types";

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "tx-1",
  type: "payout",
  amount: 500,
  description: "Session completed",
  createdAt: new Date(),
  ...overrides,
});

describe("TransactionHistory", () => {
  describe("section title", () => {
    it("renders 'Transaction History' heading", () => {
      render(<TransactionHistory transactions={[]} />);
      expect(screen.getByText("Transaction History")).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("shows 'No transactions yet' when list is empty", () => {
      render(<TransactionHistory transactions={[]} />);
      expect(screen.getByText("No transactions yet")).toBeTruthy();
    });

    it("does not render transaction rows when empty", () => {
      render(<TransactionHistory transactions={[]} />);
      expect(screen.queryByText("Session completed")).toBeNull();
    });
  });

  describe("transaction rows", () => {
    it("renders description for each transaction", () => {
      const txs = [
        makeTx({ id: "1", description: "Daily session payout" }),
        makeTx({ id: "2", description: "Stake placed" }),
      ];
      render(<TransactionHistory transactions={txs} />);
      expect(screen.getByText("Daily session payout")).toBeTruthy();
      expect(screen.getByText("Stake placed")).toBeTruthy();
    });

    it("does not show 'No transactions yet' when there are transactions", () => {
      render(<TransactionHistory transactions={[makeTx()]} />);
      expect(screen.queryByText("No transactions yet")).toBeNull();
    });
  });

  describe("amount formatting", () => {
    it("shows positive amounts with + prefix", () => {
      render(
        <TransactionHistory
          transactions={[makeTx({ id: "1", amount: 500 })]}
        />,
      );
      // formatMoney(500) = "$5.00", prefixed with "+"
      expect(screen.getByText("+$5.00")).toBeTruthy();
    });

    it("shows negative amounts without + prefix", () => {
      render(
        <TransactionHistory
          transactions={[makeTx({ id: "1", amount: -1000 })]}
        />,
      );
      // formatMoney(-1000) = "-$10.00", no + prefix
      expect(screen.getByText("-$10.00")).toBeTruthy();
    });

    it("shows zero amount with + prefix (>= 0)", () => {
      render(
        <TransactionHistory transactions={[makeTx({ id: "1", amount: 0 })]} />,
      );
      expect(screen.getByText("+$0.00")).toBeTruthy();
    });
  });

  describe("relative time display", () => {
    it("shows 'Just now' for very recent transactions", () => {
      render(
        <TransactionHistory
          transactions={[makeTx({ createdAt: new Date() })]}
        />,
      );
      expect(screen.getByText("Just now")).toBeTruthy();
    });

    it("shows minutes ago for recent transactions", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      render(
        <TransactionHistory
          transactions={[makeTx({ createdAt: fiveMinAgo })]}
        />,
      );
      expect(screen.getByText("5m ago")).toBeTruthy();
    });

    it("shows hours ago for older transactions", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      render(
        <TransactionHistory
          transactions={[makeTx({ createdAt: threeHoursAgo })]}
        />,
      );
      expect(screen.getByText("3h ago")).toBeTruthy();
    });
  });

  describe("limit prop", () => {
    it("defaults to showing 5 transactions", () => {
      const txs = Array.from({ length: 7 }, (_, i) =>
        makeTx({ id: `tx-${i}`, description: `Tx ${i}` }),
      );
      render(<TransactionHistory transactions={txs} />);
      // Should show first 5, not 6th or 7th
      expect(screen.getByText("Tx 0")).toBeTruthy();
      expect(screen.getByText("Tx 4")).toBeTruthy();
      expect(screen.queryByText("Tx 5")).toBeNull();
      expect(screen.queryByText("Tx 6")).toBeNull();
    });

    it("respects a custom limit", () => {
      const txs = Array.from({ length: 5 }, (_, i) =>
        makeTx({ id: `tx-${i}`, description: `Tx ${i}` }),
      );
      render(<TransactionHistory transactions={txs} limit={2} />);
      expect(screen.getByText("Tx 0")).toBeTruthy();
      expect(screen.getByText("Tx 1")).toBeTruthy();
      expect(screen.queryByText("Tx 2")).toBeNull();
    });

    it("shows all transactions when limit exceeds list length", () => {
      const txs = [makeTx({ id: "1", description: "Only one" })];
      render(<TransactionHistory transactions={txs} limit={10} />);
      expect(screen.getByText("Only one")).toBeTruthy();
    });
  });
});
