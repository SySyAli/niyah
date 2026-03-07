import {
  calculatePayouts,
  calculateTransfers,
  type ParticipantResult,
  type ParticipantPayout,
} from "../../../utils/payoutAlgorithm";
import type { SessionParticipant } from "../../../types";

const makeParticipant = (
  userId: string,
  name: string,
  stakeAmount: number,
): Pick<SessionParticipant, "userId" | "name" | "stakeAmount"> => ({
  userId,
  name,
  stakeAmount,
});

// ─── calculatePayouts ────────────────────────────────────────────────────────

describe("calculatePayouts", () => {
  it("completer wins opponent's stake (2-person: 1 complete, 1 surrender)", () => {
    const results: ParticipantResult[] = [
      { userId: "a", completed: true },
      { userId: "b", completed: false },
    ];
    const payouts = calculatePayouts(500, results);

    expect(payouts).toHaveLength(2);
    // Pool = 2 × 500 = 1000; only A completed → A gets all 1000, B gets 0
    expect(payouts.find((p) => p.userId === "a")?.payout).toBe(1000);
    expect(payouts.find((p) => p.userId === "b")?.payout).toBe(0);
  });

  it("solo complete returns stake × SOLO_COMPLETION_MULTIPLIER (2×)", () => {
    const payouts = calculatePayouts(1000, [{ userId: "a", completed: true }]);
    expect(payouts).toHaveLength(1);
    // SOLO_COMPLETION_MULTIPLIER = 2, so 1000 × 2 = 2000
    expect(payouts[0].payout).toBe(2000);
  });

  it("two of three complete: completers split full pool, surrenderer gets 0", () => {
    const results: ParticipantResult[] = [
      { userId: "a", completed: true },
      { userId: "b", completed: true },
      { userId: "c", completed: false },
    ];
    const payouts = calculatePayouts(2500, results);
    expect(payouts).toHaveLength(3);
    // Pool = 3 × 2500 = 7500; 2 completers → floor(7500/2) = 3750 each
    expect(payouts.find((p) => p.userId === "a")?.payout).toBe(3750);
    expect(payouts.find((p) => p.userId === "b")?.payout).toBe(3750);
    expect(payouts.find((p) => p.userId === "c")?.payout).toBe(0);
  });

  it("completed flag determines payout: surrenderers get 0, completers split pool", () => {
    const stake = 500;
    const allFail = calculatePayouts(stake, [
      { userId: "a", completed: false },
      { userId: "b", completed: false },
    ]);
    const allWin = calculatePayouts(stake, [
      { userId: "a", completed: true },
      { userId: "b", completed: true },
    ]);
    // All fail → everyone gets 0 (NIYAH keeps pool)
    expect(allFail.map((p) => p.payout)).toEqual([0, 0]);
    // All win → pool split evenly = stake each (net 0)
    expect(allWin.map((p) => p.payout)).toEqual([500, 500]);
  });

  it("preserves userId in output", () => {
    const results: ParticipantResult[] = [
      { userId: "user-abc", completed: true },
      { userId: "user-xyz", completed: false },
    ];
    const payouts = calculatePayouts(500, results);
    expect(payouts.map((p) => p.userId)).toContain("user-abc");
    expect(payouts.map((p) => p.userId)).toContain("user-xyz");
  });

  it("returns empty array for empty results", () => {
    expect(calculatePayouts(500, [])).toEqual([]);
  });
});

// ─── calculateTransfers ──────────────────────────────────────────────────────

describe("calculateTransfers", () => {
  it("returns empty array when all nets are zero (even-split case)", () => {
    const participants = [
      makeParticipant("a", "Alice", 500),
      makeParticipant("b", "Bob", 500),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 500 },
      { userId: "b", payout: 500 },
    ];
    expect(calculateTransfers(participants, payouts)).toEqual([]);
  });

  it("single debtor pays single creditor", () => {
    // A wins (payout=1000), B loses (payout=0). Stake=500 each.
    const participants = [
      makeParticipant("a", "Alice", 500),
      makeParticipant("b", "Bob", 500),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 1000 }, // net +500
      { userId: "b", payout: 0 }, // net -500
    ];
    const transfers = calculateTransfers(participants, payouts);

    expect(transfers).toHaveLength(1);
    expect(transfers[0].fromUserId).toBe("b");
    expect(transfers[0].toUserId).toBe("a");
    expect(transfers[0].amount).toBe(500);
  });

  it("includes correct user names in transfers", () => {
    const participants = [
      makeParticipant("a", "Alice", 500),
      makeParticipant("b", "Bob", 500),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 1000 },
      { userId: "b", payout: 0 },
    ];
    const transfers = calculateTransfers(participants, payouts);

    expect(transfers[0].fromUserName).toBe("Bob");
    expect(transfers[0].toUserName).toBe("Alice");
  });

  it("single debtor pays two creditors, largest creditor served first", () => {
    // A: +500, B: +500, C: -1000
    const participants = [
      makeParticipant("a", "Alice", 1000),
      makeParticipant("b", "Bob", 1000),
      makeParticipant("c", "Charlie", 1000),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 1500 }, // net +500
      { userId: "b", payout: 1500 }, // net +500
      { userId: "c", payout: 0 }, // net -1000
    ];
    const transfers = calculateTransfers(participants, payouts);

    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.fromUserId === "c")).toBe(true);
    const totalPaid = transfers.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBe(1000);
  });

  it("two debtors each pay one creditor", () => {
    // A wins all, B and C each lose their stake
    const participants = [
      makeParticipant("a", "Alice", 1000),
      makeParticipant("b", "Bob", 1000),
      makeParticipant("c", "Charlie", 1000),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 3000 }, // net +2000
      { userId: "b", payout: 0 }, // net -1000
      { userId: "c", payout: 0 }, // net -1000
    ];
    const transfers = calculateTransfers(participants, payouts);

    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.toUserId === "a")).toBe(true);
    const totalPaid = transfers.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBe(2000);
  });

  it("four-person: A+1500, B+500, C-1000, D-1000 — amounts balance", () => {
    const stake = 1000;
    const participants = [
      makeParticipant("a", "Alice", stake),
      makeParticipant("b", "Bob", stake),
      makeParticipant("c", "Charlie", stake),
      makeParticipant("d", "Dave", stake),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 2500 }, // net +1500
      { userId: "b", payout: 1500 }, // net +500
      { userId: "c", payout: 0 }, // net -1000
      { userId: "d", payout: 0 }, // net -1000
    ];
    const transfers = calculateTransfers(participants, payouts);

    const totalPaid = transfers.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBe(2000); // C and D each owe 1000
  });

  it("no self-transfers (fromUserId !== toUserId)", () => {
    const stake = 500;
    const participants = [
      makeParticipant("a", "Alice", stake),
      makeParticipant("b", "Bob", stake),
      makeParticipant("c", "Charlie", stake),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 1000 }, // net +500
      { userId: "b", payout: 500 }, // net 0
      { userId: "c", payout: 0 }, // net -500
    ];
    const transfers = calculateTransfers(participants, payouts);

    transfers.forEach((t) => expect(t.fromUserId).not.toBe(t.toUserId));
  });

  it("single participant produces no transfers", () => {
    const participants = [makeParticipant("a", "Alice", 500)];
    const payouts: ParticipantPayout[] = [{ userId: "a", payout: 500 }];
    expect(calculateTransfers(participants, payouts)).toEqual([]);
  });

  it("all amounts are positive", () => {
    const participants = [
      makeParticipant("a", "Alice", 500),
      makeParticipant("b", "Bob", 500),
    ];
    const payouts: ParticipantPayout[] = [
      { userId: "a", payout: 1000 },
      { userId: "b", payout: 0 },
    ];
    const transfers = calculateTransfers(participants, payouts);
    transfers.forEach((t) => expect(t.amount).toBeGreaterThan(0));
  });

  it("uses stake as payout fallback when userId missing from payouts", () => {
    const participants = [
      makeParticipant("a", "Alice", 500),
      makeParticipant("b", "Bob", 500),
    ];
    // Only A in payouts; B defaults to its stakeAmount (net 0)
    const payouts: ParticipantPayout[] = [{ userId: "a", payout: 1000 }];

    // Should not throw and should return an array
    const transfers = calculateTransfers(participants, payouts);
    expect(Array.isArray(transfers)).toBe(true);
  });
});
