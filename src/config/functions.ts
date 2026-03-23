import { getAuth } from "@react-native-firebase/auth";

const FUNCTIONS_BASE =
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ||
  `https://us-central1-${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  let idToken: string | null = null;
  try {
    idToken = (await getAuth().currentUser?.getIdToken()) ?? null;
  } catch {
    // unauthenticated — server will reject if auth is required
  }

  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[${name}] ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

// ─── Payment functions ───────────────────────────────────────────────────────

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  customerId: string;
}

/** Amount in cents. */
export async function createPaymentIntent(
  amount: number,
): Promise<CreatePaymentIntentResult> {
  return callFunction<CreatePaymentIntentResult>("createPaymentIntent", {
    amount,
  });
}

export type VerifyDepositResult =
  | { credited: true; newBalance: number; alreadyCredited?: boolean }
  | { processing: true; currentBalance: number; estimatedArrival: string };

/**
 * Verifies a PaymentIntent after PaymentSheet completes.
 * - Card/Apple Pay: credits balance immediately → returns { credited: true, newBalance }
 * - ACH bank debit: payment is still processing → returns { processing: true }
 *   The stripeWebhook will credit the balance when ACH actually clears.
 */
export async function verifyAndCreditDeposit(
  paymentIntentId: string,
): Promise<VerifyDepositResult> {
  return callFunction<VerifyDepositResult>("verifyAndCreditDeposit", {
    paymentIntentId,
  });
}

// ─── Session functions ───────────────────────────────────────────────────────

/**
 * Completes a session server-side. The Cloud Function reads the stakeAmount
 * from the session doc, validates ownership, timer, and status.
 * stakeAmount param is accepted for backwards compatibility but ignored by server.
 */
export async function handleSessionComplete(
  sessionId: string,
  _stakeAmount?: number,
): Promise<{ newBalance: number; payout: number }> {
  return callFunction<{ newBalance: number; payout: number }>(
    "handleSessionComplete",
    { sessionId },
  );
}

/** Stake is retained as NIYAH revenue. Server reads amount from session doc. */
export async function handleSessionForfeit(
  sessionId: string,
  _stakeAmount?: number,
): Promise<{ success: boolean }> {
  return callFunction<{ success: boolean }>("handleSessionForfeit", {
    sessionId,
  });
}

// ─── Stripe Connect functions ────────────────────────────────────────────────

export async function createConnectAccount(): Promise<{ accountId: string }> {
  return callFunction<{ accountId: string }>("createConnectAccount", {});
}

/**
 * Generates a Stripe onboarding link. The Cloud Function reads the accountId
 * from the user's Firestore doc (not from the client) to prevent spoofing.
 */
export async function createAccountLink(): Promise<{ url: string }> {
  return callFunction<{ url: string }>("createAccountLink", {});
}

export async function getConnectAccountStatus(): Promise<{
  status: "none" | "pending" | "active" | "restricted";
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}> {
  return callFunction<{
    status: "none" | "pending" | "active" | "restricted";
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
  }>("getConnectAccountStatus", {});
}

export interface WithdrawalResult {
  success: boolean;
  transferId: string;
  payoutId?: string;
  estimatedArrival: string;
}

// method: 'standard' (free, 1-2 days) | 'instant' (1.5% fee, ~30 min, Niyah absorbs fee)
export async function requestWithdrawal(
  amount: number,
  method: "standard" | "instant",
): Promise<WithdrawalResult> {
  return callFunction<WithdrawalResult>("requestWithdrawal", {
    amount,
    method,
  });
}

// ─── Social functions ────────────────────────────────────────────────────────

/**
 * Awards a referral bonus to the referrer. Runs server-side to prevent
 * clients from manipulating any user's reputation directly.
 */
export async function awardReferral(
  referrerUid: string,
): Promise<{ success: boolean }> {
  return callFunction<{ success: boolean }>("awardReferral", { referrerUid });
}

/**
 * Follows a target user. The Cloud Function ensures only the caller's UID
 * is added to the target's followers array (prevents spoofing).
 */
export async function followUserCF(
  targetUid: string,
): Promise<{ success: boolean }> {
  return callFunction<{ success: boolean }>("followUserFn", { targetUid });
}

/**
 * Unfollows a target user via Cloud Function.
 */
export async function unfollowUserCF(
  targetUid: string,
): Promise<{ success: boolean }> {
  return callFunction<{ success: boolean }>("unfollowUserFn", { targetUid });
}

// ─── Legal acceptance functions ──────────────────────────────────────────────

/**
 * Records the user's acceptance of the current legal terms version.
 * The Cloud Function writes `legalAcceptanceVersion` and `legalAcceptedAt`
 * (server timestamp) to the user document for tamper-resistance.
 */
export async function acceptLegalTerms(
  version: string,
): Promise<{ success: boolean }> {
  return callFunction<{ success: boolean }>("acceptLegalTerms", { version });
}

// ─── Group session functions ─────────────────────────────────────────────────

export interface GroupPayoutResult {
  success: boolean;
  transfers: string[];
  payouts: { userId: string; amount: number }[];
}

/**
 * Distributes group session payouts. The Cloud Function recalculates payouts
 * server-side — clients cannot dictate payout amounts.
 */
export async function distributeGroupPayouts(
  sessionId: string,
  stakePerParticipant: number,
  results: { userId: string; completed: boolean }[],
): Promise<GroupPayoutResult> {
  return callFunction<GroupPayoutResult>("distributeGroupPayouts", {
    sessionId,
    stakePerParticipant,
    results,
  });
}
