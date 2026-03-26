import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStoredPayouts,
  calculateGroupSessionPayouts,
  calculateReferralReputation,
  decideReferralClaim,
  isValidFirebaseUid,
} from "./security";

test("calculateGroupSessionPayouts splits the pool across completers", () => {
  const payouts = calculateGroupSessionPayouts(
    ["alice", "bob", "cara"],
    {
      alice: { completed: true },
      bob: { completed: false },
      cara: { completed: true },
    },
    500,
  );

  assert.deepEqual(payouts, {
    alice: 750,
    bob: 0,
    cara: 750,
  });
});

test("buildStoredPayouts normalizes missing or invalid amounts", () => {
  const payouts = buildStoredPayouts(["alice", "bob", "cara"], {
    alice: 1500,
    bob: -20,
    cara: "oops",
  });

  assert.deepEqual(payouts, [
    { userId: "alice", amount: 1500 },
    { userId: "bob", amount: 0 },
    { userId: "cara", amount: 0 },
  ]);
});

test("decideReferralClaim allows only the first referrer", () => {
  assert.deepEqual(decideReferralClaim(undefined, "ref-1"), {
    status: "claim",
  });

  assert.deepEqual(decideReferralClaim("ref-1", "ref-1"), {
    status: "already_claimed",
    sameReferrer: true,
  });

  assert.deepEqual(decideReferralClaim("ref-1", "ref-2"), {
    status: "already_claimed",
    sameReferrer: false,
  });
});

test("calculateReferralReputation increments referral count and recalculates score", () => {
  const reputation = calculateReferralReputation({
    referralCount: 2,
    paymentsCompleted: 3,
    paymentsMissed: 1,
  });

  assert.deepEqual(reputation, {
    referralCount: 3,
    score: 100,
    level: "oak",
  });
});

test("isValidFirebaseUid accepts Firebase-style UIDs only", () => {
  assert.equal(isValidFirebaseUid("abc123XYZ"), true);
  assert.equal(isValidFirebaseUid("with-dash"), false);
  assert.equal(isValidFirebaseUid(""), false);
  assert.equal(isValidFirebaseUid(null), false);
});
