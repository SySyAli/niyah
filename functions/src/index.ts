/**
 * NIYAH Firebase Cloud Functions
 * Stripe payment processing + Connect for peer-to-peer transfers
 *
 * Deploy: firebase deploy --only functions
 * Env vars: firebase functions:secrets:set STRIPE_SECRET_KEY
 */

import * as admin from "firebase-admin";
import { onRequest, type Request } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import type { Response } from "express";
import {
  buildStoredPayouts,
  calculateGroupSessionPayouts,
  calculateReferralReputation,
  decideReferralClaim,
  isValidFirebaseUid,
} from "./security";

admin.initializeApp();
const db = admin.firestore();

// Secret managed via Firebase Secret Manager
// Set with: firebase functions:secrets:set STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const PUBLIC_HTTP_OPTIONS = {
  cors: true,
  region: "us-central1",
  invoker: "public" as const,
};

const PUBLIC_STRIPE_HTTP_OPTIONS = {
  ...PUBLIC_HTTP_OPTIONS,
  secrets: [STRIPE_SECRET_KEY],
};

const PUBLIC_STRIPE_WEBHOOK_OPTIONS = {
  cors: false,
  region: "us-central1",
  invoker: "public" as const,
  secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  return new Stripe(STRIPE_SECRET_KEY.value(), {
    apiVersion: "2025-02-24.acacia",
  });
}

/** Verify Firebase ID token from Authorization header. Returns uid or throws. */
async function verifyAuth(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token) throw new Error("Missing auth token");

  const decoded = await admin.auth().verifyIdToken(token);
  return decoded.uid;
}

function sendError(res: Response, code: number, message: string): void {
  res.status(code).json({ error: message });
}

async function recordGroupSessionPayout(
  sessionId: string,
  payout: { userId: string; amount: number },
  stripeTransferId?: string,
): Promise<void> {
  const txnRef = db
    .collection("transactions")
    .doc(`group_session_payout_${sessionId}_${payout.userId}`);
  const walletRef = db.collection("wallets").doc(payout.userId);

  await db.runTransaction(async (txn) => {
    const payoutTxnSnap = await txn.get(txnRef);
    if (payoutTxnSnap.exists) {
      return;
    }

    const walletSnap = await txn.get(walletRef);
    const currentBalance: number = walletSnap.data()?.balance ?? 0;
    const nextBalance = currentBalance + payout.amount;

    if (walletSnap.exists) {
      txn.update(walletRef, {
        balance: nextBalance,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      txn.set(
        walletRef,
        {
          balance: nextBalance,
          pendingBalance: 0,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    txn.set(txnRef, {
      userId: payout.userId,
      type: "payout",
      amount: payout.amount,
      description: "Group session payout",
      sessionId,
      stripeTransferId: stripeTransferId ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function settleGroupSessionPayouts(
  sessionId: string,
  payouts: Array<{ userId: string; amount: number }>,
  initiatorUid: string,
): Promise<string[]> {
  const stripe = getStripe();
  const sessionRef = db.collection("groupSessions").doc(sessionId);
  const transferIds: string[] = [];
  const failedRecipients: string[] = [];

  for (const payout of payouts) {
    if (payout.amount <= 0) {
      continue;
    }

    try {
      const recipientDoc = await db
        .collection("users")
        .doc(payout.userId)
        .get();
      const connectAccountId: string =
        recipientDoc.data()?.stripeAccountId ?? "";

      let stripeTransferId: string | undefined;

      if (connectAccountId) {
        const transfer = await stripe.transfers.create(
          {
            amount: payout.amount,
            currency: "usd",
            destination: connectAccountId,
            metadata: {
              sessionId,
              recipientUid: payout.userId,
              initiatorUid,
              type: "group_session_payout",
            },
          },
          {
            idempotencyKey: `group_session_payout:${sessionId}:${payout.userId}:${payout.amount}`,
          },
        );

        stripeTransferId = transfer.id;
        transferIds.push(transfer.id);
      }

      await recordGroupSessionPayout(sessionId, payout, stripeTransferId);
    } catch (err) {
      console.error(
        `Failed to settle payout for session=${sessionId}, user=${payout.userId}:`,
        err,
      );
      failedRecipients.push(payout.userId);
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (transferIds.length > 0) {
    updateData.transferIds = admin.firestore.FieldValue.arrayUnion(
      ...transferIds,
    );
  }

  if (failedRecipients.length === 0) {
    updateData.payoutsSettledAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await sessionRef.set(updateData, { merge: true });

  if (failedRecipients.length > 0) {
    throw new Error(
      `Payout settlement requires reconciliation for: ${failedRecipients.join(", ")}`,
    );
  }

  return transferIds;
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

interface RateLimitConfig {
  maxCalls: number; // max calls allowed in the window
  windowMs: number; // time window in milliseconds
}

/**
 * Firestore-based rate limiter. Checks if a user has exceeded the allowed
 * number of calls within a time window. Returns true if the request should
 * be BLOCKED.
 *
 * Uses a single Firestore document per user+function combo (rateLimits
 * collection). Stores an array of call timestamps, pruning expired entries
 * on each check.
 *
 * Fail-open: if the rate limit check itself fails (e.g., Firestore error),
 * the request is ALLOWED — denying legitimate financial operations due to
 * infrastructure failure is worse than allowing a few extra calls.
 */
async function checkRateLimit(
  uid: string,
  functionName: string,
  config: RateLimitConfig,
): Promise<boolean> {
  const docId = `${uid}_${functionName}`;
  const ref = db.collection("rateLimits").doc(docId);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    return await db.runTransaction(async (txn) => {
      const snap = await txn.get(ref);
      const data = snap.data();
      const timestamps: number[] = data?.timestamps ?? [];

      // Prune expired entries
      const recent = timestamps.filter((t) => t > windowStart);

      if (recent.length >= config.maxCalls) {
        return true; // BLOCKED
      }

      // Record this call
      recent.push(now);
      txn.set(ref, { timestamps: recent, updatedAt: now });
      return false; // ALLOWED
    });
  } catch (err) {
    // Fail-open: allow the request if rate limit check fails
    console.error("Rate limit check failed (allowing request):", err);
    return false;
  }
}

// Rate limit configurations per function
const RATE_LIMITS = {
  handleSessionComplete: { maxCalls: 5, windowMs: 3_600_000 }, // 5/hr
  handleSessionForfeit: { maxCalls: 5, windowMs: 3_600_000 }, // 5/hr
  createPaymentIntent: { maxCalls: 3, windowMs: 600_000 }, // 3/10min
  verifyAndCreditDeposit: { maxCalls: 5, windowMs: 600_000 }, // 5/10min
  requestWithdrawal: { maxCalls: 2, windowMs: 3_600_000 }, // 2/hr
  distributeGroupPayouts: { maxCalls: 3, windowMs: 3_600_000 }, // 3/hr
  awardReferral: { maxCalls: 10, windowMs: 86_400_000 }, // 10/day
  createConnectAccount: { maxCalls: 3, windowMs: 3_600_000 }, // 3/hr
  createAccountLink: { maxCalls: 5, windowMs: 600_000 }, // 5/10min
  getConnectAccountStatus: { maxCalls: 10, windowMs: 600_000 }, // 10/10min
  followUserFn: { maxCalls: 30, windowMs: 600_000 }, // 30/10min
  unfollowUserFn: { maxCalls: 30, windowMs: 600_000 }, // 30/10min
  createGroupSession: { maxCalls: 5, windowMs: 3_600_000 }, // 5/hr
  respondToGroupInvite: { maxCalls: 10, windowMs: 3_600_000 }, // 10/hr
  markOnlineForSession: { maxCalls: 30, windowMs: 600_000 }, // 30/10min
  startGroupSession: { maxCalls: 5, windowMs: 3_600_000 }, // 5/hr
  reportSessionStatus: { maxCalls: 10, windowMs: 3_600_000 }, // 10/hr
  cancelGroupSession: { maxCalls: 5, windowMs: 3_600_000 }, // 5/hr
} as const;

// ─── createPaymentIntent ────────────────────────────────────────────────────
/**
 * Creates a Stripe PaymentIntent for depositing funds.
 * Body: { amount: number }  (in cents, e.g. 5000 = $50)
 * Returns: { clientSecret: string, paymentIntentId: string }
 */
export const createPaymentIntent = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "createPaymentIntent",
        RATE_LIMITS.createPaymentIntent,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { amount } = req.body as { amount: unknown };
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount)
    ) {
      sendError(res, 400, "Amount must be an integer");
      return;
    }
    if (amount < 100 || amount > 1000000) {
      sendError(res, 400, "Amount must be between $1 and $10,000");
      return;
    }

    try {
      const stripe = getStripe();

      // Get or create Stripe customer
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.data() ?? {};
      let customerId: string = userData.stripeCustomerId ?? "";

      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { firebaseUid: uid },
          email: userData.email ?? undefined,
          name: userData.name ?? undefined,
        });
        customerId = customer.id;
        await db.collection("users").doc(uid).set(
          {
            stripeCustomerId: customerId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: customerId,
        metadata: { firebaseUid: uid, type: "deposit" },
        automatic_payment_methods: { enabled: true },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId,
      });
    } catch (err) {
      console.error("createPaymentIntent error:", err);
      sendError(res, 500, "Failed to create payment intent");
    }
  },
);

// ─── verifyAndCreditDeposit ─────────────────────────────────────────────────
/**
 * Verifies a PaymentIntent and credits the user's NIYAH balance if appropriate.
 * Called client-side after PaymentSheet completes (success OR ACH processing).
 *
 * Returns one of three states:
 *   { newBalance, credited: true }          — card/Apple Pay: credited immediately
 *   { processing: true, currentBalance }    — ACH: funds pending, webhook will credit
 *   { newBalance, alreadyCredited: true }   — idempotent re-call
 *
 * The stripeWebhook handles payment_intent.succeeded for ACH async crediting.
 */
export const verifyAndCreditDeposit = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "verifyAndCreditDeposit",
        RATE_LIMITS.verifyAndCreditDeposit,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { paymentIntentId } = req.body as { paymentIntentId: string };
    if (!paymentIntentId) {
      sendError(res, 400, "Missing paymentIntentId");
      return;
    }

    try {
      const stripe = getStripe();
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Security: verify this payment belongs to this user
      if (pi.metadata.firebaseUid !== uid) {
        sendError(res, 403, "Payment does not belong to this user");
        return;
      }

      // ACH / bank debit: PaymentIntent is 'processing', not yet 'succeeded'.
      // Do NOT credit yet — the stripeWebhook will credit when it actually clears.
      if (pi.status === "processing") {
        const walletDoc = await db.collection("wallets").doc(uid).get();
        res.json({
          processing: true,
          currentBalance: walletDoc.data()?.balance ?? 0,
          estimatedArrival: "1–5 business days",
        });
        return;
      }

      if (pi.status !== "succeeded") {
        sendError(res, 400, `Payment not in a creditable state: ${pi.status}`);
        return;
      }

      // Idempotency: check if already credited
      const existingTxn = await db
        .collection("transactions")
        .where("paymentIntentId", "==", paymentIntentId)
        .limit(1)
        .get();

      if (!existingTxn.empty) {
        const walletDoc = await db.collection("wallets").doc(uid).get();
        res.json({
          newBalance: walletDoc.data()?.balance ?? 0,
          alreadyCredited: true,
        });
        return;
      }

      const amount = pi.amount;

      // Credit balance in wallets collection (protected from client writes)
      const walletRef = db.collection("wallets").doc(uid);
      const txnRef = db.collection("transactions").doc();

      const newBalance = await db.runTransaction(async (txn) => {
        const walletSnap = await txn.get(walletRef);
        const current: number = walletSnap.data()?.balance ?? 0;
        const updated = current + amount;

        if (walletSnap.exists) {
          txn.update(walletRef, {
            balance: updated,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          txn.set(
            walletRef,
            {
              balance: updated,
              pendingBalance: 0,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }

        txn.set(txnRef, {
          userId: uid,
          type: "deposit",
          amount,
          description: "Deposit via card",
          paymentIntentId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return updated;
      });

      res.json({ newBalance });
    } catch (err) {
      console.error("verifyAndCreditDeposit error:", err);
      sendError(res, 500, "Failed to verify deposit");
    }
  },
);

// ─── createConnectAccount ───────────────────────────────────────────────────
/**
 * Creates a Stripe Express connected account for the user (payouts).
 * Call once per user — idempotent (returns existing account if already created).
 * Returns: { accountId: string }
 */
export const createConnectAccount = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "createConnectAccount",
        RATE_LIMITS.createConnectAccount,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.data() ?? {};

      // Return existing if already set up
      if (userData.stripeAccountId) {
        res.json({ accountId: userData.stripeAccountId });
        return;
      }

      const stripe = getStripe();
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: userData.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { firebaseUid: uid },
      });

      await db.collection("users").doc(uid).update({
        stripeAccountId: account.id,
        stripeAccountStatus: "pending",
      });

      res.json({ accountId: account.id });
    } catch (err) {
      console.error("createConnectAccount error:", err);
      sendError(res, 500, "Failed to create Connect account");
    }
  },
);

// ─── createAccountLink ──────────────────────────────────────────────────────
/**
 * Generates a Stripe Express onboarding link (KYC flow).
 * User opens this URL in a browser to complete identity verification.
 * Body: {} (accountId read from Firestore, not from client)
 * Returns: { url: string }
 *
 * SECURITY: Reads accountId from the user's Firestore doc instead of
 * accepting it from the client. Prevents a user from generating onboarding
 * links for other users' Stripe accounts.
 */
export const createAccountLink = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "createAccountLink",
        RATE_LIMITS.createAccountLink,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    try {
      // Read accountId from Firestore — NEVER trust client-provided accountId
      const userDoc = await db.collection("users").doc(uid).get();
      const accountId: string = userDoc.data()?.stripeAccountId ?? "";
      if (!accountId) {
        sendError(
          res,
          400,
          "No Connect account found — create one first via createConnectAccount",
        );
        return;
      }

      const stripe = getStripe();
      const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT;
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `https://${projectId}.firebaseapp.com/stripe-refresh?uid=${uid}`,
        return_url: `https://${projectId}.firebaseapp.com/stripe-return?uid=${uid}`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url });
    } catch (err) {
      console.error("createAccountLink error:", err);
      sendError(res, 500, "Failed to create account link");
    }
  },
);

// ─── getConnectAccountStatus ────────────────────────────────────────────────
/**
 * Returns the current status of a user's Stripe Express account.
 * Returns: { chargesEnabled, payoutsEnabled, detailsSubmitted, status }
 */
export const getConnectAccountStatus = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "getConnectAccountStatus",
        RATE_LIMITS.getConnectAccountStatus,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const accountId: string = userDoc.data()?.stripeAccountId ?? "";

      if (!accountId) {
        res.json({ status: "none" });
        return;
      }

      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(accountId);

      const status = account.details_submitted
        ? account.payouts_enabled
          ? "active"
          : "restricted"
        : "pending";

      // Sync status to Firestore
      await db
        .collection("users")
        .doc(uid)
        .update({ stripeAccountStatus: status });

      res.json({
        status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (err) {
      console.error("getConnectAccountStatus error:", err);
      sendError(res, 500, "Failed to get account status");
    }
  },
);

// ─── handleSessionComplete ──────────────────────────────────────────────────
/**
 * Called when a solo session completes successfully.
 * Refunds the stake back to the user (stay-the-same model for MVP).
 * Body: { sessionId: string }
 * Returns: { newBalance: number, payout: number }
 *
 * SECURITY: Reads stakeAmount from the session doc (not from client).
 * Validates session ownership, status, and that the timer has expired.
 */
export const handleSessionComplete = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "handleSessionComplete",
        RATE_LIMITS.handleSessionComplete,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      sendError(res, 400, "Missing sessionId");
      return;
    }

    try {
      const walletRef = db.collection("wallets").doc(uid);
      const userRef = db.collection("users").doc(uid);
      const txnRef = db.collection("transactions").doc();
      const sessionRef = db.collection("sessions").doc(sessionId);

      const newBalance = await db.runTransaction(async (txn) => {
        // Read session doc — authoritative source of truth
        const sessionSnap = await txn.get(sessionRef);
        if (!sessionSnap.exists) {
          throw new Error("Session not found");
        }
        const sessionData = sessionSnap.data()!;

        // Verify ownership: session must belong to the authenticated user
        if (sessionData.userId !== uid) {
          throw new Error("Session does not belong to this user");
        }

        // Verify status: session must be active (prevents double-completion)
        if (sessionData.status !== "active") {
          throw new Error(
            `Session is not active (current status: ${sessionData.status})`,
          );
        }

        // Verify timer: session must have ended (30s grace for clock skew)
        const endsAt = sessionData.endsAt?.toDate?.()
          ? sessionData.endsAt.toDate()
          : new Date(sessionData.endsAt);
        const gracePeriodMs = 30_000; // 30 seconds
        if (endsAt.getTime() - gracePeriodMs > Date.now()) {
          throw new Error("Session has not ended yet");
        }

        // Read stakeAmount from session doc — NEVER trust client-provided amount
        const stakeAmount: number = sessionData.stakeAmount;
        if (!stakeAmount || stakeAmount <= 0) {
          throw new Error("Invalid stake amount on session");
        }

        // Payout = stake (stickK model). User gets their stake back.
        const payout = stakeAmount;

        // Credit balance to wallets collection (protected from client writes)
        const walletSnap = await txn.get(walletRef);
        const currentBalance: number = walletSnap.data()?.balance ?? 0;
        const updatedBalance = currentBalance + payout;
        txn.update(walletRef, { balance: updatedBalance });

        // Update user stats (separate from financial balance)
        txn.update(userRef, {
          completedSessions: admin.firestore.FieldValue.increment(1),
          totalSessions: admin.firestore.FieldValue.increment(1),
          currentStreak: admin.firestore.FieldValue.increment(1),
          totalEarnings: admin.firestore.FieldValue.increment(payout),
        });

        // Record transaction
        txn.set(txnRef, {
          userId: uid,
          type: "payout",
          amount: payout,
          description: "Session completed — stake returned",
          sessionId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark session as completed atomically
        txn.update(sessionRef, {
          status: "completed",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          actualPayout: payout,
        });

        return updatedBalance;
      });

      res.json({ newBalance, payout: newBalance });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // Return 4xx for validation errors, 5xx for unexpected failures
      if (
        message.includes("not found") ||
        message.includes("does not belong") ||
        message.includes("not active") ||
        message.includes("not ended")
      ) {
        sendError(res, 400, message);
      } else {
        console.error("handleSessionComplete error:", err);
        sendError(res, 500, "Failed to process session completion");
      }
    }
  },
);

// ─── handleSessionForfeit ───────────────────────────────────────────────────
/**
 * Called when a user surrenders a session.
 * Stake is forfeited — goes to NIYAH (revenue). Firestore balance already
 * decremented when session started, so we just record the forfeit.
 * Body: { sessionId: string }
 * Returns: { success: boolean }
 *
 * SECURITY: Reads stakeAmount from the session doc (not from client).
 * Validates session ownership and status.
 */
export const handleSessionForfeit = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "handleSessionForfeit",
        RATE_LIMITS.handleSessionForfeit,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      sendError(res, 400, "Missing sessionId");
      return;
    }

    try {
      const sessionRef = db.collection("sessions").doc(sessionId);
      const txnRef = db.collection("transactions").doc();
      const revenueRef = db.collection("revenue").doc();

      await db.runTransaction(async (txn) => {
        // Read session doc — authoritative source of truth
        const sessionSnap = await txn.get(sessionRef);
        if (!sessionSnap.exists) {
          throw new Error("Session not found");
        }
        const sessionData = sessionSnap.data()!;

        // Verify ownership
        if (sessionData.userId !== uid) {
          throw new Error("Session does not belong to this user");
        }

        // Verify status (prevents double-forfeit)
        if (sessionData.status !== "active") {
          throw new Error(
            `Session is not active (current status: ${sessionData.status})`,
          );
        }

        // Read stakeAmount from session doc — NEVER trust client
        const stakeAmount: number = sessionData.stakeAmount;

        // Update user stats
        txn.update(db.collection("users").doc(uid), {
          totalSessions: admin.firestore.FieldValue.increment(1),
          currentStreak: 0,
        });

        // Record forfeit transaction
        txn.set(txnRef, {
          userId: uid,
          type: "forfeit",
          amount: 0, // Already deducted at session start
          description: "Session surrendered — stake forfeited",
          sessionId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark session as surrendered
        txn.update(sessionRef, {
          status: "surrendered",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          actualPayout: 0,
        });

        // Track forfeit as revenue (using server-side stakeAmount)
        txn.set(revenueRef, {
          userId: uid,
          amount: stakeAmount,
          sessionId,
          type: "forfeit",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (
        message.includes("not found") ||
        message.includes("does not belong") ||
        message.includes("not active")
      ) {
        sendError(res, 400, message);
      } else {
        console.error("handleSessionForfeit error:", err);
        sendError(res, 500, "Failed to record session forfeit");
      }
    }
  },
);

// ─── requestWithdrawal ──────────────────────────────────────────────────────
/**
 * Transfers funds from Niyah's platform account to the user's Stripe Connect
 * account, then optionally triggers an instant payout to their bank.
 *
 * Body: { amount: number, method: 'standard' | 'instant' }
 *   standard — transfer to connected account, auto-payout schedule (1-2 business days)
 *   instant  — transfer + immediate payout (1.5% Stripe fee, absorbed by Niyah)
 *
 * Returns: { success, transferId, payoutId?, estimatedArrival }
 */
export const requestWithdrawal = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "requestWithdrawal",
        RATE_LIMITS.requestWithdrawal,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { amount, method = "standard" } = req.body as {
      amount: unknown;
      method?: "standard" | "instant";
    };

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount)
    ) {
      sendError(res, 400, "Amount must be an integer");
      return;
    }
    if (amount < 1000) {
      sendError(res, 400, "Minimum withdrawal is $10");
      return;
    }

    try {
      const stripe = getStripe();
      const userRef = db.collection("users").doc(uid);
      const walletRef = db.collection("wallets").doc(uid);
      const userSnap = await userRef.get();
      const userData = userSnap.data() ?? {};

      const connectedAccountId: string = userData.stripeAccountId ?? "";
      if (!connectedAccountId) {
        sendError(
          res,
          400,
          "No payout account set up — complete Stripe onboarding first",
        );
        return;
      }
      if (userData.stripeAccountStatus !== "active") {
        sendError(
          res,
          400,
          "Payout account not yet verified — complete identity verification first",
        );
        return;
      }

      // Read balance from wallets collection (protected from client writes)
      const walletSnap = await walletRef.get();
      if ((walletSnap.data()?.balance ?? 0) < amount) {
        sendError(res, 400, "Insufficient balance");
        return;
      }

      // Atomically deduct balance from wallets collection
      const txnRef = db.collection("transactions").doc();
      await db.runTransaction(async (txn) => {
        const snap = await txn.get(walletRef);
        const current: number = snap.data()?.balance ?? 0;
        if (current < amount) throw new Error("Insufficient balance");
        txn.update(walletRef, { balance: current - amount });
        txn.set(txnRef, {
          userId: uid,
          type: "withdrawal",
          amount: -amount,
          description: `Withdrawal (${method})`,
          status: "processing",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Transfer from Niyah's platform account → user's connected account
      const transfer = await stripe.transfers.create({
        amount,
        currency: "usd",
        destination: connectedAccountId,
        metadata: { firebaseUid: uid, type: "withdrawal", method },
      });

      // Update transaction with transfer ID
      await txnRef.update({ stripeTransferId: transfer.id });

      let payoutId: string | undefined;
      let estimatedArrival: string;

      if (method === "instant") {
        // Trigger immediate payout from connected account → their bank
        // Niyah absorbs the 1.5% instant payout fee (charged to platform)
        const payout = await stripe.payouts.create(
          { amount, currency: "usd", method: "instant" },
          { stripeAccount: connectedAccountId },
        );
        payoutId = payout.id;
        estimatedArrival = "Within 30 minutes";
        await txnRef.update({ stripePayoutId: payoutId, status: "sent" });
      } else {
        // Standard: connected account's auto-payout schedule handles bank transfer
        estimatedArrival = "1–2 business days";
        await txnRef.update({ status: "sent" });
      }

      res.json({
        success: true,
        transferId: transfer.id,
        payoutId,
        estimatedArrival,
      });
    } catch (err) {
      console.error("requestWithdrawal error:", err);
      // If Stripe transfer failed, restore balance in wallets collection
      try {
        const walletRestoreRef = db.collection("wallets").doc(uid);
        await db.runTransaction(async (txn) => {
          const snap = await txn.get(walletRestoreRef);
          const current: number = snap.data()?.balance ?? 0;
          txn.update(walletRestoreRef, { balance: current + amount });
        });
      } catch (restoreErr) {
        console.error(
          "Failed to restore balance after withdrawal error:",
          restoreErr,
        );
      }
      sendError(res, 500, "Withdrawal failed — your balance has been restored");
    }
  },
);

// ─── distributeGroupPayouts ─────────────────────────────────────────────────
/**
 * Distributes or reconciles stored group session payouts via Stripe Connect.
 * Called by the proposer after a session is completed.
 *
 * Body: { sessionId: string }
 * Returns: { success: boolean, transfers: string[], payouts: { userId: string, amount: number }[] }
 *
 * SECURITY: Ignores client-supplied payout inputs and only uses the
 * server-recorded payouts from the completed session document. Wallet credits
 * and Stripe transfers are idempotent, so this endpoint can safely reconcile a
 * partially-settled session without double-paying anyone.
 */
export const distributeGroupPayouts = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "distributeGroupPayouts",
        RATE_LIMITS.distributeGroupPayouts,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { sessionId } = req.body as { sessionId?: unknown };

    if (typeof sessionId !== "string" || !sessionId) {
      sendError(res, 400, "Missing sessionId");
      return;
    }

    try {
      const sessionRef = db.collection("groupSessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        sendError(res, 404, "Session not found");
        return;
      }

      const sessionData = sessionSnap.data()!;

      if (sessionData.proposerId !== uid) {
        sendError(res, 403, "Only the proposer can reconcile payouts");
        return;
      }

      if (sessionData.status !== "completed") {
        sendError(
          res,
          409,
          "Session must be completed before payouts can be reconciled",
        );
        return;
      }

      const participantIds = Array.isArray(sessionData.participantIds)
        ? sessionData.participantIds.filter(
            (participantId): participantId is string =>
              typeof participantId === "string" && participantId.length > 0,
          )
        : [];

      if (participantIds.length === 0) {
        sendError(res, 500, "Session participants are missing");
        return;
      }

      const rawPayouts = sessionData.payouts as
        | Record<string, unknown>
        | undefined;
      if (!rawPayouts) {
        sendError(res, 409, "Session payouts are not available yet");
        return;
      }

      const serverPayouts = buildStoredPayouts(participantIds, rawPayouts);
      const transferIds = await settleGroupSessionPayouts(
        sessionId,
        serverPayouts,
        uid,
      );

      res.json({
        success: true,
        transfers: transferIds,
        payouts: serverPayouts,
      });
    } catch (err) {
      console.error("distributeGroupPayouts error:", err);
      sendError(res, 500, "Failed to distribute payouts");
    }
  },
);

// ─── awardReferral ──────────────────────────────────────────────────────────
/**
 * Awards a referral bonus to a referrer user. Called server-side to prevent
 * any authenticated user from manipulating another user's reputation.
 *
 * Body: { referrerUid: string }
 * Returns: { success: boolean }
 *
 * SECURITY: Previously, awardReferralToUser() in firebase.ts wrote directly
 * to another user's document from the client, and the Firestore rule allowed
 * any authenticated user to modify any user's reputation field. This Cloud
 * Function replaces that pattern, blocks self-referrals, and allows each user
 * to claim a referral only once.
 */
export const awardReferral = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (await checkRateLimit(uid, "awardReferral", RATE_LIMITS.awardReferral)) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { referrerUid } = req.body as { referrerUid?: unknown };
    if (!referrerUid) {
      sendError(res, 400, "Missing referrerUid");
      return;
    }

    // Validate referrerUid format (Firebase UIDs are alphanumeric, 1-128 chars)
    if (!isValidFirebaseUid(referrerUid)) {
      sendError(res, 400, "Invalid referrerUid format");
      return;
    }

    if (referrerUid === uid) {
      sendError(res, 400, "Cannot refer yourself");
      return;
    }

    try {
      const callerRef = db.collection("users").doc(uid);
      const referrerRef = db.collection("users").doc(referrerUid);

      const result = await db.runTransaction(async (txn) => {
        const callerSnap = await txn.get(callerRef);
        if (!callerSnap.exists) {
          throw new Error("Caller profile not found");
        }

        const referrerSnap = await txn.get(referrerRef);
        if (!referrerSnap.exists) {
          throw new Error("Referrer not found");
        }

        const claimDecision = decideReferralClaim(
          callerSnap.data()?.referredByUid,
          referrerUid,
        );

        if (claimDecision.status === "already_claimed") {
          return claimDecision;
        }

        const docData = referrerSnap.data() ?? {};
        const rep = (docData.reputation as Record<string, unknown>) ?? {};
        const nextReputation = calculateReferralReputation(rep);

        txn.set(
          callerRef,
          {
            referredByUid: referrerUid,
            referralAwardedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        txn.set(
          referrerRef,
          {
            reputation: { ...rep, ...nextReputation },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        return claimDecision;
      });

      if (result.status === "already_claimed") {
        res.json({
          success: true,
          alreadyClaimed: true,
          sameReferrer: result.sameReferrer,
        });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (
        message === "Caller profile not found" ||
        message === "Referrer not found"
      ) {
        sendError(res, 404, message);
      } else {
        console.error("awardReferral error:", err);
        sendError(res, 500, "Failed to award referral");
      }
    }
  },
);

// ─── followUser ─────────────────────────────────────────────────────────────
/**
 * Follows a target user. Updates both the caller's `following` array and the
 * target's `followers` array atomically using a batch write.
 *
 * Body: { targetUid: string }
 * Returns: { success: boolean }
 *
 * SECURITY: Previously, the client wrote directly to another user's
 * `followers` field, and the Firestore rule allowed any authenticated user
 * to modify any user's followers array. This Cloud Function replaces that
 * pattern — ensures only the caller's own UID is added.
 */
export const followUserFn = onRequest(PUBLIC_HTTP_OPTIONS, async (req, res) => {
  if (req.method !== "POST") {
    sendError(res, 405, "Method not allowed");
    return;
  }

  let uid: string;
  try {
    uid = await verifyAuth(req);
  } catch {
    sendError(res, 401, "Unauthorized");
    return;
  }

  if (await checkRateLimit(uid, "followUserFn", RATE_LIMITS.followUserFn)) {
    sendError(res, 429, "Too many requests — try again later");
    return;
  }

  const { targetUid } = req.body as { targetUid: string };
  if (!targetUid || typeof targetUid !== "string") {
    sendError(res, 400, "Missing targetUid");
    return;
  }

  if (uid === targetUid) {
    sendError(res, 400, "Cannot follow yourself");
    return;
  }

  try {
    const batch = db.batch();
    const myRef = db.collection("userFollows").doc(uid);
    const targetRef = db.collection("userFollows").doc(targetUid);

    batch.set(
      myRef,
      { following: admin.firestore.FieldValue.arrayUnion(targetUid) },
      { merge: true },
    );
    batch.set(
      targetRef,
      { followers: admin.firestore.FieldValue.arrayUnion(uid) },
      { merge: true },
    );

    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    console.error("followUser error:", err);
    sendError(res, 500, "Failed to follow user");
  }
});

// ─── unfollowUser ───────────────────────────────────────────────────────────
/**
 * Unfollows a target user. Removes the caller from the target's `followers`
 * and the target from the caller's `following`.
 *
 * Body: { targetUid: string }
 * Returns: { success: boolean }
 */
export const unfollowUserFn = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(uid, "unfollowUserFn", RATE_LIMITS.unfollowUserFn)
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { targetUid } = req.body as { targetUid: string };
    if (!targetUid || typeof targetUid !== "string") {
      sendError(res, 400, "Missing targetUid");
      return;
    }

    try {
      const batch = db.batch();
      const myRef = db.collection("userFollows").doc(uid);
      const targetRef = db.collection("userFollows").doc(targetUid);

      batch.set(
        myRef,
        { following: admin.firestore.FieldValue.arrayRemove(targetUid) },
        { merge: true },
      );
      batch.set(
        targetRef,
        { followers: admin.firestore.FieldValue.arrayRemove(uid) },
        { merge: true },
      );

      await batch.commit();
      res.json({ success: true });
    } catch (err) {
      console.error("unfollowUser error:", err);
      sendError(res, 500, "Failed to unfollow user");
    }
  },
);

// ─── stripeWebhook ──────────────────────────────────────────────────────────
/**
 * Handles Stripe webhook events for payment confirmation.
 * Configure webhook endpoint in Stripe dashboard.
 * Events handled: payment_intent.succeeded, account.updated
 */
export const stripeWebhook = onRequest(
  PUBLIC_STRIPE_WEBHOOK_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      sendError(res, 400, "Missing Stripe signature");
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(
        (req as unknown as { rawBody: Buffer }).rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value(),
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      sendError(res, 400, "Invalid signature");
      return;
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          // Backup handler in case client-side verifyAndCreditDeposit failed
          const pi = event.data.object as Stripe.PaymentIntent;
          if (pi.metadata.type === "deposit") {
            const uid = pi.metadata.firebaseUid;
            if (uid) {
              const existingTxn = await db
                .collection("transactions")
                .where("paymentIntentId", "==", pi.id)
                .limit(1)
                .get();

              if (existingTxn.empty) {
                const walletRef = db.collection("wallets").doc(uid);
                const txnRef = db.collection("transactions").doc();
                await db.runTransaction(async (txn) => {
                  const snap = await txn.get(walletRef);
                  const current: number = snap.data()?.balance ?? 0;
                  txn.update(walletRef, { balance: current + pi.amount });
                  txn.set(txnRef, {
                    userId: uid,
                    type: "deposit",
                    amount: pi.amount,
                    description: "Deposit via card",
                    paymentIntentId: pi.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                });
              }
            }
          }
          break;
        }

        case "account.updated": {
          // Sync Stripe Connect account status
          const account = event.data.object as Stripe.Account;
          const uid = account.metadata?.firebaseUid;
          if (uid) {
            const status = account.details_submitted
              ? account.payouts_enabled
                ? "active"
                : "restricted"
              : "pending";
            await db
              .collection("users")
              .doc(uid)
              .update({ stripeAccountStatus: status });
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      sendError(res, 500, "Webhook handler failed");
    }
  },
);

// ─── Legal Acceptance ──────────────────────────────────────────────────────

/**
 * Records a user's acceptance of the Terms and Privacy policy.
 * Writes `legalAcceptanceVersion` and `legalAcceptedAt` (server timestamp)
 * to the user document for tamper-resistance.
 */
export const acceptLegalTerms = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req: Request, res: Response) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    try {
      const uid = await verifyAuth(req);
      const { version } = req.body;

      if (!version || typeof version !== "string") {
        sendError(res, 400, "Missing or invalid version");
        return;
      }

      // Rate limit: 10 calls per minute
      const blocked = await checkRateLimit(uid, "acceptLegalTerms", {
        maxCalls: 10,
        windowMs: 60_000,
      });
      if (blocked) {
        sendError(res, 429, "Too many requests");
        return;
      }

      await db.collection("users").doc(uid).update({
        legalAcceptanceVersion: version,
        legalAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true });
    } catch (err) {
      console.error("acceptLegalTerms error:", err);
      sendError(
        res,
        500,
        err instanceof Error ? err.message : "Internal error",
      );
    }
  },
);

// ─── createGroupSession ──────────────────────────────────────────────────────
/**
 * Creates a new group session and sends invites to participants.
 * Body: { cadence: string, stakePerParticipant: number, duration: number, inviteeIds: string[], customStake?: boolean }
 * Returns: { sessionId: string, inviteIds: string[] }
 *
 * SECURITY: Validates proposer balance, deducts stake via Firestore transaction.
 * Fetches invitee profiles server-side to populate participant data.
 */
export const createGroupSession = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "createGroupSession",
        RATE_LIMITS.createGroupSession,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { cadence, stakePerParticipant, duration, inviteeIds, customStake } =
      req.body as {
        cadence: unknown;
        stakePerParticipant: unknown;
        duration: unknown;
        inviteeIds: unknown;
        customStake?: boolean;
      };

    // Validate input types
    if (typeof cadence !== "string" || !cadence) {
      sendError(res, 400, "Missing or invalid cadence");
      return;
    }
    if (
      typeof stakePerParticipant !== "number" ||
      !Number.isFinite(stakePerParticipant) ||
      !Number.isInteger(stakePerParticipant)
    ) {
      sendError(res, 400, "stakePerParticipant must be an integer");
      return;
    }
    if (
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      sendError(res, 400, "duration must be a positive integer");
      return;
    }
    if (
      !Array.isArray(inviteeIds) ||
      !inviteeIds.length ||
      !inviteeIds.every((id): id is string => typeof id === "string")
    ) {
      sendError(res, 400, "inviteeIds must be a non-empty array of strings");
      return;
    }

    if (stakePerParticipant < 100 || stakePerParticipant > 10000) {
      sendError(res, 400, "Stake must be between $1 and $100");
      return;
    }

    // Prevent duplicate invitees
    const uniqueInvitees = new Set(inviteeIds);
    if (uniqueInvitees.size !== inviteeIds.length) {
      sendError(res, 400, "Duplicate invitees not allowed");
      return;
    }

    // Prevent proposer from inviting themselves
    if (inviteeIds.includes(uid)) {
      sendError(res, 400, "Cannot invite yourself");
      return;
    }

    const totalParticipants = inviteeIds.length + 1; // +1 for proposer
    if (totalParticipants < 2 || totalParticipants > 20) {
      sendError(res, 400, "Group must have 2-20 participants");
      return;
    }

    try {
      // Fetch proposer profile
      const proposerDoc = await db.collection("users").doc(uid).get();
      const proposerData = proposerDoc.data() ?? {};

      // Fetch invitee profiles
      const inviteeDocs = await Promise.all(
        inviteeIds.map((id) => db.collection("users").doc(id).get()),
      );

      // Validate all invitees exist
      for (let i = 0; i < inviteeDocs.length; i++) {
        if (!inviteeDocs[i].exists) {
          sendError(res, 400, `Invitee ${inviteeIds[i]} not found`);
          return;
        }
      }

      // Build participants map
      const participants: Record<
        string,
        {
          name: string;
          venmoHandle: string;
          profileImage: string;
          reputation: Record<string, unknown>;
          accepted: boolean;
          online: boolean;
        }
      > = {};

      participants[uid] = {
        name: proposerData.name ?? "",
        venmoHandle: proposerData.venmoHandle ?? "",
        profileImage: proposerData.profileImage ?? "",
        reputation: proposerData.reputation ?? {},
        accepted: true,
        online: false,
      };

      for (let i = 0; i < inviteeIds.length; i++) {
        const inviteeData = inviteeDocs[i].data() ?? {};
        participants[inviteeIds[i]] = {
          name: inviteeData.name ?? "",
          venmoHandle: inviteeData.venmoHandle ?? "",
          profileImage: inviteeData.profileImage ?? "",
          reputation: inviteeData.reputation ?? {},
          accepted: false,
          online: false,
        };
      }

      const sessionRef = db.collection("groupSessions").doc();
      const sessionId = sessionRef.id;
      const poolTotal = stakePerParticipant * totalParticipants;

      // Deduct stake from proposer's wallet via transaction
      const walletRef = db.collection("wallets").doc(uid);
      const stakeTxnRef = db.collection("transactions").doc();

      await db.runTransaction(async (txn) => {
        const walletSnap = await txn.get(walletRef);
        const currentBalance: number = walletSnap.data()?.balance ?? 0;

        if (currentBalance < stakePerParticipant) {
          throw new Error("Insufficient balance to stake");
        }

        txn.update(walletRef, {
          balance: currentBalance - stakePerParticipant,
        });
        txn.set(stakeTxnRef, {
          userId: uid,
          type: "stake",
          amount: -stakePerParticipant,
          description: "Group session stake",
          sessionId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Create group session doc
      await sessionRef.set({
        id: sessionId,
        proposerId: uid,
        status: "pending",
        cadence,
        stakePerParticipant,
        customStake: customStake ?? false,
        duration,
        participantIds: [uid, ...inviteeIds],
        participants,
        poolTotal,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoTimeoutAt: null,
      });

      // Create invite docs for each invitee
      const inviteIds: string[] = [];
      const batch = db.batch();

      for (const inviteeId of inviteeIds) {
        const inviteRef = db.collection("groupInvites").doc();
        inviteIds.push(inviteRef.id);
        batch.set(inviteRef, {
          sessionId,
          fromUserId: uid,
          fromUserName: proposerData.name ?? "",
          fromUserImage: proposerData.profileImage ?? "",
          toUserId: inviteeId,
          stake: stakePerParticipant,
          cadence,
          duration,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      console.log(
        `createGroupSession: session=${sessionId}, proposer=${uid}, invitees=${inviteeIds.length}`,
      );

      res.json({ sessionId, inviteIds });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Insufficient balance")) {
        sendError(res, 400, message);
      } else {
        console.error("createGroupSession error:", err);
        sendError(res, 500, "Failed to create group session");
      }
    }
  },
);

// ─── respondToGroupInvite ────────────────────────────────────────────────────
/**
 * Accepts or declines a group session invite.
 * Body: { inviteId: string, accept: boolean }
 * Returns: { success: true, sessionStatus: string }
 *
 * SECURITY: Validates invite belongs to authenticated user. Deducts stake
 * via Firestore transaction on accept. Handles cascade logic (cancel if < 2).
 */
export const respondToGroupInvite = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "respondToGroupInvite",
        RATE_LIMITS.respondToGroupInvite,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { inviteId, accept } = req.body as {
      inviteId: string;
      accept: boolean;
    };

    if (!inviteId || typeof accept !== "boolean") {
      sendError(res, 400, "Missing required fields");
      return;
    }

    try {
      const inviteRef = db.collection("groupInvites").doc(inviteId);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        sendError(res, 404, "Invite not found");
        return;
      }

      const inviteData = inviteSnap.data()!;

      if (inviteData.toUserId !== uid) {
        sendError(res, 403, "Invite does not belong to this user");
        return;
      }

      if (inviteData.status !== "pending") {
        sendError(res, 400, `Invite already ${inviteData.status}`);
        return;
      }

      const sessionRef = db
        .collection("groupSessions")
        .doc(inviteData.sessionId);
      const sessionSnap = await sessionRef.get();
      const sessionData = sessionSnap.data()!;

      if (accept) {
        // Deduct stake from user's wallet
        const walletRef = db.collection("wallets").doc(uid);
        const stakeTxnRef = db.collection("transactions").doc();

        await db.runTransaction(async (txn) => {
          const walletSnap = await txn.get(walletRef);
          const currentBalance: number = walletSnap.data()?.balance ?? 0;

          if (currentBalance < inviteData.stake) {
            throw new Error("Insufficient balance to stake");
          }

          txn.update(walletRef, {
            balance: currentBalance - inviteData.stake,
          });
          txn.set(stakeTxnRef, {
            userId: uid,
            type: "stake",
            amount: -inviteData.stake,
            description: "Group session stake",
            sessionId: inviteData.sessionId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        // Update invite status
        await inviteRef.update({
          status: "accepted",
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update session participant
        await sessionRef.update({
          [`participants.${uid}.accepted`]: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Check if all participants accepted
        const updatedSessionSnap = await sessionRef.get();
        const updatedSessionData = updatedSessionSnap.data()!;
        const allAccepted = updatedSessionData.participantIds.every(
          (pid: string) => updatedSessionData.participants[pid]?.accepted,
        );

        let sessionStatus = updatedSessionData.status;
        if (allAccepted) {
          sessionStatus = "ready";
          await sessionRef.update({
            status: "ready",
            autoTimeoutAt: admin.firestore.Timestamp.fromMillis(
              Date.now() + 30 * 60 * 1000,
            ),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        console.log(
          `respondToGroupInvite: invite=${inviteId}, user=${uid}, accepted=true, allAccepted=${allAccepted}`,
        );

        res.json({ success: true, sessionStatus });
      } else {
        // Decline: update invite
        await inviteRef.update({
          status: "declined",
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Remove user from session
        const updatedParticipantIds = sessionData.participantIds.filter(
          (pid: string) => pid !== uid,
        );
        const updatedParticipants = { ...sessionData.participants };
        delete updatedParticipants[uid];
        const updatedPoolTotal =
          sessionData.stakePerParticipant * updatedParticipantIds.length;

        if (updatedParticipantIds.length < 2) {
          // Cancel session and refund all accepted participants
          const refundBatch = db.batch();

          for (const pid of updatedParticipantIds) {
            if (updatedParticipants[pid]?.accepted) {
              const refundWalletRef = db.collection("wallets").doc(pid);
              const refundTxnRef = db.collection("transactions").doc();

              // Note: using batch, not transaction — acceptable for refunds
              refundBatch.update(refundWalletRef, {
                balance: admin.firestore.FieldValue.increment(
                  sessionData.stakePerParticipant,
                ),
              });
              refundBatch.set(refundTxnRef, {
                userId: pid,
                type: "refund",
                amount: sessionData.stakePerParticipant,
                description: "Group session cancelled — stake refunded",
                sessionId: inviteData.sessionId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }

          refundBatch.update(sessionRef, {
            status: "cancelled",
            participantIds: updatedParticipantIds,
            participants: updatedParticipants,
            poolTotal: updatedPoolTotal,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await refundBatch.commit();

          console.log(
            `respondToGroupInvite: session=${inviteData.sessionId} cancelled (< 2 participants)`,
          );

          res.json({ success: true, sessionStatus: "cancelled" });
        } else {
          await sessionRef.update({
            participantIds: updatedParticipantIds,
            participants: updatedParticipants,
            poolTotal: updatedPoolTotal,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(
            `respondToGroupInvite: invite=${inviteId}, user=${uid}, declined, remaining=${updatedParticipantIds.length}`,
          );

          res.json({ success: true, sessionStatus: sessionData.status });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Insufficient balance")) {
        sendError(res, 400, message);
      } else {
        console.error("respondToGroupInvite error:", err);
        sendError(res, 500, "Failed to respond to invite");
      }
    }
  },
);

// ─── markOnlineForSession ────────────────────────────────────────────────────
/**
 * Marks a participant as online for a group session lobby.
 * Body: { sessionId: string }
 * Returns: { success: true, allOnline: boolean }
 */
export const markOnlineForSession = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "markOnlineForSession",
        RATE_LIMITS.markOnlineForSession,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      sendError(res, 400, "Missing sessionId");
      return;
    }

    try {
      const sessionRef = db.collection("groupSessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        sendError(res, 404, "Session not found");
        return;
      }

      const sessionData = sessionSnap.data()!;

      if (!sessionData.participantIds.includes(uid)) {
        sendError(res, 403, "Not a participant in this session");
        return;
      }

      if (sessionData.status !== "ready") {
        sendError(
          res,
          400,
          `Session is not ready (current status: ${sessionData.status})`,
        );
        return;
      }

      // Mark user as online
      await sessionRef.update({
        [`participants.${uid}.online`]: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Check if all participants are online
      const updatedSnap = await sessionRef.get();
      const updatedData = updatedSnap.data()!;
      const allOnline = updatedData.participantIds.every(
        (pid: string) => updatedData.participants[pid]?.online,
      );

      console.log(
        `markOnlineForSession: session=${sessionId}, user=${uid}, allOnline=${allOnline}`,
      );

      res.json({ success: true, allOnline });
    } catch (err) {
      console.error("markOnlineForSession error:", err);
      sendError(res, 500, "Failed to mark online status");
    }
  },
);

// ─── startGroupSession ───────────────────────────────────────────────────────
/**
 * Starts a group session once all participants are online.
 * Only the proposer can start the session.
 * Body: { sessionId: string }
 * Returns: { success: true, endsAt: number }
 */
export const startGroupSession = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "startGroupSession",
        RATE_LIMITS.startGroupSession,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      sendError(res, 400, "Missing sessionId");
      return;
    }

    try {
      const sessionRef = db.collection("groupSessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        sendError(res, 404, "Session not found");
        return;
      }

      const sessionData = sessionSnap.data()!;

      if (sessionData.proposerId !== uid) {
        sendError(res, 403, "Only the proposer can start the session");
        return;
      }

      if (sessionData.status !== "ready") {
        sendError(
          res,
          400,
          `Session is not ready (current status: ${sessionData.status})`,
        );
        return;
      }

      // Verify all participants are online
      const allOnline = sessionData.participantIds.every(
        (pid: string) => sessionData.participants[pid]?.online,
      );

      if (!allOnline) {
        sendError(res, 400, "Not all participants are online");
        return;
      }

      const endsAtMs = Date.now() + sessionData.duration;

      await sessionRef.update({
        status: "active",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        endsAt: admin.firestore.Timestamp.fromMillis(endsAtMs),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `startGroupSession: session=${sessionId}, endsAt=${new Date(endsAtMs).toISOString()}`,
      );

      res.json({ success: true, endsAt: endsAtMs });
    } catch (err) {
      console.error("startGroupSession error:", err);
      sendError(res, 500, "Failed to start group session");
    }
  },
);

// ─── reportSessionStatus ────────────────────────────────────────────────────
/**
 * Reports a participant's completion or surrender for an active group session.
 * If all participants have reported, finalizes the session atomically and then
 * settles payouts using idempotent Stripe transfers and wallet credits.
 * Body: { sessionId: string, action: "complete" | "surrender" }
 * Returns: { success: true, sessionComplete: boolean, payouts?: Record<string, number> }
 *
 * SECURITY: Validates timer expiry for completions (60s grace for cold starts).
 * Payout calculation is done server-side.
 */
export const reportSessionStatus = onRequest(
  PUBLIC_STRIPE_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "reportSessionStatus",
        RATE_LIMITS.reportSessionStatus,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { sessionId, action } = req.body as {
      sessionId: string;
      action: "complete" | "surrender";
    };

    if (!sessionId || !action) {
      sendError(res, 400, "Missing required fields");
      return;
    }

    if (action !== "complete" && action !== "surrender") {
      sendError(res, 400, "Action must be 'complete' or 'surrender'");
      return;
    }

    try {
      const sessionRef = db.collection("groupSessions").doc(sessionId);
      const outcome = await db.runTransaction(async (txn) => {
        const sessionSnap = await txn.get(sessionRef);

        if (!sessionSnap.exists) {
          throw new Error("Session not found");
        }

        const sessionData = sessionSnap.data()!;
        const participantIds = Array.isArray(sessionData.participantIds)
          ? sessionData.participantIds.filter(
              (participantId): participantId is string =>
                typeof participantId === "string" && participantId.length > 0,
            )
          : [];

        if (!participantIds.includes(uid)) {
          throw new Error("Not a participant in this session");
        }

        const rawPayouts = sessionData.payouts as
          | Record<string, unknown>
          | undefined;

        if (sessionData.status === "completed") {
          if (!rawPayouts) {
            throw new Error("Session completed without recorded payouts");
          }

          return {
            sessionComplete: true,
            participantIds,
            payouts: rawPayouts as Record<string, number>,
            shouldSettle: !sessionData.payoutsSettledAt,
          };
        }

        if (sessionData.status !== "active") {
          throw new Error(
            `Session is not active (current status: ${sessionData.status})`,
          );
        }

        const participant = sessionData.participants[uid];
        if (participant?.completed || participant?.surrendered) {
          throw new Error("Already reported status for this session");
        }

        if (action === "complete") {
          const endsAt = sessionData.endsAt?.toDate?.()
            ? sessionData.endsAt.toDate()
            : new Date(sessionData.endsAt);
          const gracePeriodMs = 60_000;

          if (endsAt.getTime() - gracePeriodMs > Date.now()) {
            throw new Error("Session has not ended yet");
          }
        }

        const updatedParticipants = {
          ...sessionData.participants,
          [uid]: {
            ...participant,
            completed: action === "complete",
            surrendered: action === "surrender",
            surrenderedAt:
              action === "surrender"
                ? admin.firestore.FieldValue.serverTimestamp()
                : undefined,
          },
        };

        const updateData: Record<string, unknown> = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (action === "complete") {
          updateData[`participants.${uid}.completed`] = true;
        } else {
          updateData[`participants.${uid}.surrendered`] = true;
          updateData[`participants.${uid}.surrenderedAt`] =
            admin.firestore.FieldValue.serverTimestamp();
        }

        const allReported = participantIds.every((participantId) => {
          const currentParticipant = updatedParticipants[participantId];
          return (
            currentParticipant?.completed || currentParticipant?.surrendered
          );
        });

        if (!allReported) {
          txn.update(sessionRef, updateData);
          return { sessionComplete: false };
        }

        const payouts = calculateGroupSessionPayouts(
          participantIds,
          updatedParticipants,
          sessionData.stakePerParticipant,
        );

        txn.update(sessionRef, {
          ...updateData,
          status: "completed",
          payouts,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          sessionComplete: true,
          participantIds,
          payouts,
          shouldSettle: true,
        };
      });

      if (!outcome.sessionComplete) {
        console.log(
          `reportSessionStatus: session=${sessionId}, user=${uid}, action=${action}, allReported=false`,
        );
        res.json({ success: true, sessionComplete: false });
        return;
      }

      if (!outcome.participantIds || !outcome.payouts) {
        throw new Error("Session completed without recorded payouts");
      }

      const payoutList = buildStoredPayouts(
        outcome.participantIds,
        outcome.payouts,
      );

      if (outcome.shouldSettle) {
        await settleGroupSessionPayouts(sessionId, payoutList, uid);
      }

      console.log(
        `reportSessionStatus: session=${sessionId} completed, payouts=${JSON.stringify(outcome.payouts)}`,
      );

      res.json({
        success: true,
        sessionComplete: true,
        payouts: outcome.payouts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (
        message.includes("not found") ||
        message.includes("not active") ||
        message.includes("not ended") ||
        message.includes("Not a participant") ||
        message.includes("Already reported") ||
        message.includes("without recorded payouts")
      ) {
        const statusCode = message.includes("not found")
          ? 404
          : message.includes("Not a participant")
            ? 403
            : 400;
        sendError(res, statusCode, message);
      } else {
        console.error("reportSessionStatus error:", err);
        sendError(res, 500, "Failed to report session status");
      }
    }
  },
);

// ─── cancelGroupSession ──────────────────────────────────────────────────────
/**
 * Cancels a group session. Only the proposer can cancel.
 * Cannot cancel active or completed sessions.
 * Body: { sessionId: string }
 * Returns: { success: true, refundedCount: number }
 *
 * SECURITY: Refunds all accepted participants' stakes.
 */
export const cancelGroupSession = onRequest(
  PUBLIC_HTTP_OPTIONS,
  async (req, res) => {
    if (req.method !== "POST") {
      sendError(res, 405, "Method not allowed");
      return;
    }

    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (
      await checkRateLimit(
        uid,
        "cancelGroupSession",
        RATE_LIMITS.cancelGroupSession,
      )
    ) {
      sendError(res, 429, "Too many requests — try again later");
      return;
    }

    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      sendError(res, 400, "Missing sessionId");
      return;
    }

    try {
      const sessionRef = db.collection("groupSessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        sendError(res, 404, "Session not found");
        return;
      }

      const sessionData = sessionSnap.data()!;

      if (sessionData.proposerId !== uid) {
        sendError(res, 403, "Only the proposer can cancel the session");
        return;
      }

      if (
        sessionData.status === "active" ||
        sessionData.status === "completed"
      ) {
        sendError(
          res,
          400,
          `Cannot cancel session with status: ${sessionData.status}`,
        );
        return;
      }

      // Refund all accepted participants
      const batch = db.batch();
      let refundedCount = 0;

      for (const pid of sessionData.participantIds) {
        if (sessionData.participants[pid]?.accepted) {
          const walletRef = db.collection("wallets").doc(pid);
          const txnRef = db.collection("transactions").doc();

          batch.update(walletRef, {
            balance: admin.firestore.FieldValue.increment(
              sessionData.stakePerParticipant,
            ),
          });
          batch.set(txnRef, {
            userId: pid,
            type: "refund",
            amount: sessionData.stakePerParticipant,
            description: "Group session cancelled — stake refunded",
            sessionId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          refundedCount++;
        }
      }

      // Expire all pending invites for this session
      const invitesSnap = await db
        .collection("groupInvites")
        .where("sessionId", "==", sessionId)
        .where("status", "==", "pending")
        .get();

      for (const inviteDoc of invitesSnap.docs) {
        batch.update(inviteDoc.ref, {
          status: "expired",
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Mark session as cancelled
      batch.update(sessionRef, {
        status: "cancelled",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      console.log(
        `cancelGroupSession: session=${sessionId}, refunded=${refundedCount}`,
      );

      res.json({ success: true, refundedCount });
    } catch (err) {
      console.error("cancelGroupSession error:", err);
      sendError(res, 500, "Failed to cancel group session");
    }
  },
);

// ─── autoTimeoutGroupSessions ────────────────────────────────────────────────
/**
 * Scheduled function that runs every 5 minutes to cancel group sessions
 * that have been in "ready" state past their autoTimeoutAt deadline.
 * Refunds all accepted participants and expires pending invites.
 */
export const autoTimeoutGroupSessions = onSchedule(
  { schedule: "every 5 minutes", region: "us-central1" },
  async () => {
    const now = admin.firestore.Timestamp.now();

    try {
      const expiredSessions = await db
        .collection("groupSessions")
        .where("status", "==", "ready")
        .where("autoTimeoutAt", "<", now)
        .get();

      if (expiredSessions.empty) {
        console.log("autoTimeoutGroupSessions: no expired sessions found");
        return;
      }

      console.log(
        `autoTimeoutGroupSessions: found ${expiredSessions.size} expired session(s)`,
      );

      for (const sessionDoc of expiredSessions.docs) {
        const sessionData = sessionDoc.data();
        const sessionId = sessionDoc.id;

        try {
          const batch = db.batch();

          // Refund all accepted participants
          for (const pid of sessionData.participantIds) {
            if (sessionData.participants[pid]?.accepted) {
              const walletRef = db.collection("wallets").doc(pid);
              const txnRef = db.collection("transactions").doc();

              batch.update(walletRef, {
                balance: admin.firestore.FieldValue.increment(
                  sessionData.stakePerParticipant,
                ),
              });
              batch.set(txnRef, {
                userId: pid,
                type: "refund",
                amount: sessionData.stakePerParticipant,
                description: "Group session timed out — stake refunded",
                sessionId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }

          // Expire pending invites
          const invitesSnap = await db
            .collection("groupInvites")
            .where("sessionId", "==", sessionId)
            .where("status", "==", "pending")
            .get();

          for (const inviteDoc of invitesSnap.docs) {
            batch.update(inviteDoc.ref, {
              status: "expired",
              respondedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          // Cancel session
          batch.update(sessionDoc.ref, {
            status: "cancelled",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await batch.commit();

          console.log(
            `autoTimeoutGroupSessions: cancelled session=${sessionId}, participants=${sessionData.participantIds.length}`,
          );
        } catch (sessionErr) {
          console.error(
            `autoTimeoutGroupSessions: failed to cancel session=${sessionId}:`,
            sessionErr,
          );
        }
      }
    } catch (err) {
      console.error("autoTimeoutGroupSessions error:", err);
    }
  },
);
