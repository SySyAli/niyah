/**
 * Firebase Cloud Functions client
 * Wraps HTTPS requests to Cloud Functions with Firebase ID token auth.
 *
 * All functions live at: https://us-central1-niyah-b972d.cloudfunctions.net/<name>
 */

import { NiyahFirebaseAuth } from "../../modules/niyah-firebase";

const FUNCTIONS_BASE = "https://us-central1-niyah-b972d.cloudfunctions.net";

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  // Get Firebase ID token for authentication
  let idToken: string | null = null;
  try {
    idToken = await NiyahFirebaseAuth.getIdToken();
  } catch {
    // Will be unauthenticated — server will reject if auth is required
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

/** Create a Stripe PaymentIntent for depositing funds. Amount in cents. */
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

/** Record a successful session completion. Returns updated balance. */
export async function handleSessionComplete(
  sessionId: string,
  stakeAmount: number,
): Promise<{ newBalance: number; payout: number }> {
  return callFunction<{ newBalance: number; payout: number }>(
    "handleSessionComplete",
    { sessionId, stakeAmount },
  );
}

/** Record a session forfeit. Stake stays as NIYAH revenue. */
export async function handleSessionForfeit(
  sessionId: string,
  stakeAmount: number,
): Promise<{ success: boolean }> {
  return callFunction<{ success: boolean }>("handleSessionForfeit", {
    sessionId,
    stakeAmount,
  });
}

// ─── Stripe Connect functions ────────────────────────────────────────────────

/** Create or return existing Stripe Express connected account for payouts. */
export async function createConnectAccount(): Promise<{ accountId: string }> {
  return callFunction<{ accountId: string }>("createConnectAccount", {});
}

/** Generate a Stripe Express onboarding URL (KYC). Opens in browser. */
export async function createAccountLink(
  accountId: string,
): Promise<{ url: string }> {
  return callFunction<{ url: string }>("createAccountLink", { accountId });
}

/** Get current Stripe Connect account status. */
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

/**
 * Transfers NIYAH balance to user's connected bank account.
 * method: 'standard' (free, 1-2 days) | 'instant' (1.5% fee, ~30 min, Niyah absorbs fee)
 */
export async function requestWithdrawal(
  amount: number,
  method: "standard" | "instant",
): Promise<WithdrawalResult> {
  return callFunction<WithdrawalResult>("requestWithdrawal", {
    amount,
    method,
  });
}

/** Distribute group session payouts via Stripe Connect transfers. */
export async function distributeGroupPayouts(
  sessionId: string,
  payouts: { userId: string; amount: number }[],
): Promise<{ success: boolean; transfers: string[] }> {
  return callFunction<{ success: boolean; transfers: string[] }>(
    "distributeGroupPayouts",
    { sessionId, payouts },
  );
}
