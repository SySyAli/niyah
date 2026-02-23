import { SessionParticipant, SessionTransfer } from "../types";

export interface ParticipantResult {
  userId: string;
  completed: boolean;
  screenTime?: number; // ms of phone usage during session
}

export interface ParticipantPayout {
  userId: string;
  payout: number; // in cents
}

// Intermediate type used inside the store to build SessionTransfer objects.
export interface TransferDraft {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number; // in cents, always positive
}

/**
 * PLACEHOLDER — even-split payout.
 * Every participant receives their exact stake back regardless of outcome.
 * Net effect: no transfers are required.
 *
 * Replace with the real algorithm when available. The signature must stay
 * the same; only the distribution logic inside changes.
 */
export const calculatePayouts = (
  stakePerParticipant: number,
  results: ParticipantResult[],
): ParticipantPayout[] =>
  results.map((r) => ({ userId: r.userId, payout: stakePerParticipant }));

/**
 * Derive the transfers needed to settle the pool given each participant's
 * payout vs. contribution.
 *
 * Uses a greedy approach: drain each debtor against each creditor in order
 * of largest creditor first. This is correct but not Splitwise-optimal
 * (may produce more transfers than the theoretical minimum for N > 2).
 * The Splitwise-minimal version replaces this later.
 *
 * With the even-split dummy above all nets are 0, so this always returns [].
 */
export const calculateTransfers = (
  participants: Pick<SessionParticipant, "userId" | "name" | "stakeAmount">[],
  payouts: ParticipantPayout[],
): TransferDraft[] => {
  const nets = participants.map((p) => {
    const payout =
      payouts.find((pay) => pay.userId === p.userId)?.payout ?? p.stakeAmount;
    return { userId: p.userId, name: p.name, remaining: payout - p.stakeAmount };
  });

  // Sort creditors largest-first so debtors are drained efficiently.
  const debtors = nets
    .filter((n) => n.remaining < 0)
    .map((n) => ({ ...n, remaining: Math.abs(n.remaining) }));
  const creditors = nets
    .filter((n) => n.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: TransferDraft[] = [];

  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.remaining <= 0) break;
      if (creditor.remaining <= 0) continue;

      const amount = Math.min(debtor.remaining, creditor.remaining);
      transfers.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.name,
        toUserId: creditor.userId,
        toUserName: creditor.name,
        amount,
      });
      debtor.remaining -= amount;
      creditor.remaining -= amount;
    }
  }

  return transfers;
};
