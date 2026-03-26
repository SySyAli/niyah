export interface GroupSessionPayoutParticipant {
  completed?: boolean;
}

export type ReferralClaimDecision =
  | { status: "claim" }
  | { status: "already_claimed"; sameReferrer: boolean };

export function isValidFirebaseUid(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9]{1,128}$/.test(value);
}

export function calculateGroupSessionPayouts(
  participantIds: string[],
  participants: Record<string, GroupSessionPayoutParticipant>,
  stakePerParticipant: number,
): Record<string, number> {
  const completers = participantIds.filter(
    (pid) => participants[pid]?.completed,
  );
  const totalPool = participantIds.length * stakePerParticipant;
  const payouts: Record<string, number> = {};

  if (completers.length === 0) {
    for (const pid of participantIds) {
      payouts[pid] = 0;
    }
    return payouts;
  }

  const payoutPerCompleter = Math.floor(totalPool / completers.length);
  for (const pid of participantIds) {
    payouts[pid] = participants[pid]?.completed ? payoutPerCompleter : 0;
  }

  return payouts;
}

export function buildStoredPayouts(
  participantIds: string[],
  rawPayouts: Record<string, unknown>,
): Array<{ userId: string; amount: number }> {
  return participantIds.map((userId) => {
    const rawAmount = rawPayouts[userId];
    const amount =
      typeof rawAmount === "number" && Number.isFinite(rawAmount)
        ? Math.max(0, Math.floor(rawAmount))
        : 0;

    return { userId, amount };
  });
}

export function decideReferralClaim(
  existingReferrerUid: unknown,
  requestedReferrerUid: string,
): ReferralClaimDecision {
  if (typeof existingReferrerUid !== "string" || !existingReferrerUid) {
    return { status: "claim" };
  }

  return {
    status: "already_claimed",
    sameReferrer: existingReferrerUid === requestedReferrerUid,
  };
}

export function calculateReferralReputation(rep: Record<string, unknown>): {
  referralCount: number;
  score: number;
  level: string;
} {
  const referralCount =
    (typeof rep.referralCount === "number" && Number.isFinite(rep.referralCount)
      ? rep.referralCount
      : 0) + 1;
  const paymentsCompleted =
    typeof rep.paymentsCompleted === "number" &&
    Number.isFinite(rep.paymentsCompleted)
      ? rep.paymentsCompleted
      : 0;
  const paymentsMissed =
    typeof rep.paymentsMissed === "number" &&
    Number.isFinite(rep.paymentsMissed)
      ? rep.paymentsMissed
      : 0;
  const totalPayments = paymentsCompleted + paymentsMissed;

  let score = 50;
  if (totalPayments > 0) {
    const successRate = paymentsCompleted / totalPayments;
    score = Math.round(50 + (successRate - 0.5) * 100);
    score = Math.max(0, Math.min(100, score));
  }

  score = Math.min(100, score + referralCount * 10);

  const level =
    score <= 20
      ? "seed"
      : score <= 40
        ? "sprout"
        : score <= 60
          ? "sapling"
          : score <= 80
            ? "tree"
            : "oak";

  return { referralCount, score, level };
}
