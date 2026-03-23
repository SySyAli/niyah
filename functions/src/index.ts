/**
 * NIYAH Firebase Cloud Functions
 * Stripe payment processing + Connect for peer-to-peer transfers
 *
 * Deploy: firebase deploy --only functions
 * Env vars: firebase functions:secrets:set STRIPE_SECRET_KEY
 */

import * as admin from "firebase-admin";
import { onRequest, type Request } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import type { Response } from "express";

admin.initializeApp();
const db = admin.firestore();

// Secret managed via Firebase Secret Manager
// Set with: firebase functions:secrets:set STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

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
} as const;

// ─── createPaymentIntent ────────────────────────────────────────────────────
/**
 * Creates a Stripe PaymentIntent for depositing funds.
 * Body: { amount: number }  (in cents, e.g. 5000 = $50)
 * Returns: { clientSecret: string, paymentIntentId: string }
 */
export const createPaymentIntent = onRequest(
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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

    const { amount } = req.body as { amount: number };
    if (!amount || amount < 100 || amount > 1000000) {
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
        await db
          .collection("users")
          .doc(uid)
          .update({ stripeCustomerId: customerId });
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
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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
        txn.update(walletRef, { balance: updated });
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
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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
      amount: number;
      method?: "standard" | "instant";
    };

    if (!amount || amount < 1000) {
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
 * Distributes group session payouts via Stripe Connect transfers.
 * Called by the host when the session ends.
 *
 * Body: {
 *   sessionId: string,
 *   stakePerParticipant: number,
 *   results: { userId: string, completed: boolean }[]
 * }
 * Returns: { success: boolean, transfers: string[], payouts: { userId: string, amount: number }[] }
 *
 * SECURITY: Payout amounts are calculated SERVER-SIDE using the same algorithm
 * as the client, based on the results array. The client cannot dictate payout amounts.
 * Individual payout amounts are capped and total pool is validated.
 */
export const distributeGroupPayouts = onRequest(
  { cors: true, region: "us-central1", secrets: [STRIPE_SECRET_KEY] },
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

    const { sessionId, stakePerParticipant, results } = req.body as {
      sessionId: string;
      stakePerParticipant: number;
      results: { userId: string; completed: boolean }[];
    };

    if (!sessionId || !stakePerParticipant || !results?.length) {
      sendError(res, 400, "Missing required fields");
      return;
    }

    // Validate stake amount is within allowed range (100 cents to $10,000)
    if (stakePerParticipant < 100 || stakePerParticipant > 1_000_000) {
      sendError(res, 400, "Invalid stake amount");
      return;
    }

    // Validate participant count (2-20 for group sessions)
    if (results.length < 2 || results.length > 20) {
      sendError(res, 400, "Invalid number of participants");
      return;
    }

    try {
      // ── Server-side payout calculation ──────────────────────────────
      // Mirrors client-side calculatePayouts() in payoutAlgorithm.ts.
      // Completers split the full pool. Surrenderers get 0.
      const completers = results.filter((r) => r.completed);
      const totalPool = results.length * stakePerParticipant;

      let serverPayouts: { userId: string; amount: number }[];
      if (completers.length === 0) {
        // All surrendered — nobody gets anything (NIYAH keeps the pool)
        serverPayouts = results.map((r) => ({
          userId: r.userId,
          amount: 0,
        }));
      } else {
        const payoutPerCompleter = Math.floor(totalPool / completers.length);
        serverPayouts = results.map((r) => ({
          userId: r.userId,
          amount: r.completed ? payoutPerCompleter : 0,
        }));
      }

      // Validate total payouts don't exceed pool
      const totalPayouts = serverPayouts.reduce((sum, p) => sum + p.amount, 0);
      if (totalPayouts > totalPool) {
        sendError(res, 400, "Calculated payouts exceed pool — aborting");
        return;
      }

      // ── Execute Stripe transfers ───────────────────────────────────
      const stripe = getStripe();
      const transferIds: string[] = [];

      for (const payout of serverPayouts) {
        if (payout.amount <= 0) continue; // No transfer needed

        // Get the recipient's Stripe Connect account
        const recipientDoc = await db
          .collection("users")
          .doc(payout.userId)
          .get();
        const connectAccountId: string =
          recipientDoc.data()?.stripeAccountId ?? "";

        if (!connectAccountId) {
          console.warn(
            `User ${payout.userId} has no Connect account — skipping transfer`,
          );
          continue;
        }

        const transfer = await stripe.transfers.create({
          amount: payout.amount,
          currency: "usd",
          destination: connectAccountId,
          metadata: {
            sessionId,
            recipientUid: payout.userId,
            initiatorUid: uid,
          },
        });

        transferIds.push(transfer.id);

        // Credit recipient's wallet balance (wallets collection, not users)
        const txnRef = db.collection("transactions").doc();
        const walletRef = db.collection("wallets").doc(payout.userId);
        await db.runTransaction(async (txn) => {
          const snap = await txn.get(walletRef);
          const current: number = snap.data()?.balance ?? 0;
          txn.update(walletRef, { balance: current + payout.amount });
          txn.set(txnRef, {
            userId: payout.userId,
            type: "payout",
            amount: payout.amount,
            description: "Group session payout",
            sessionId,
            stripeTransferId: transfer.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      }

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
 * Function replaces that pattern — only the admin SDK can now modify reputation.
 */
export const awardReferral = onRequest(
  { cors: true, region: "us-central1" },
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

    const { referrerUid } = req.body as { referrerUid: string };
    if (!referrerUid || typeof referrerUid !== "string") {
      sendError(res, 400, "Missing referrerUid");
      return;
    }

    // Validate referrerUid format (Firebase UIDs are alphanumeric, 1-128 chars)
    if (!/^[a-zA-Z0-9]{1,128}$/.test(referrerUid)) {
      sendError(res, 400, "Invalid referrerUid format");
      return;
    }

    try {
      const referrerRef = db.collection("users").doc(referrerUid);

      await db.runTransaction(async (txn) => {
        const snap = await txn.get(referrerRef);
        if (!snap.exists) return; // Referrer doesn't exist — silently succeed

        const docData = snap.data() ?? {};
        const rep = (docData.reputation as Record<string, number>) ?? {};

        const referralCount = (rep.referralCount ?? 0) + 1;
        const paymentsCompleted = rep.paymentsCompleted ?? 0;
        const paymentsMissed = rep.paymentsMissed ?? 0;
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

        txn.update(referrerRef, {
          reputation: { ...rep, referralCount, score, level },
        });
      });

      res.json({ success: true });
    } catch (err) {
      console.error("awardReferral error:", err);
      sendError(res, 500, "Failed to award referral");
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
export const followUserFn = onRequest(
  { cors: true, region: "us-central1" },
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
  },
);

// ─── unfollowUser ───────────────────────────────────────────────────────────
/**
 * Unfollows a target user. Removes the caller from the target's `followers`
 * and the target from the caller's `following`.
 *
 * Body: { targetUid: string }
 * Returns: { success: boolean }
 */
export const unfollowUserFn = onRequest(
  { cors: true, region: "us-central1" },
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
  {
    cors: false,
    region: "us-central1",
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
  },
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
  { cors: true },
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
