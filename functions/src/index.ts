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
        const userDoc = await db.collection("users").doc(uid).get();
        res.json({
          processing: true,
          currentBalance: userDoc.data()?.balance ?? 0,
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
        const userDoc = await db.collection("users").doc(uid).get();
        res.json({
          newBalance: userDoc.data()?.balance ?? 0,
          alreadyCredited: true,
        });
        return;
      }

      const amount = pi.amount;

      // Credit balance in Firestore (atomic transaction)
      const userRef = db.collection("users").doc(uid);
      const txnRef = db.collection("transactions").doc();

      const newBalance = await db.runTransaction(async (txn) => {
        const userSnap = await txn.get(userRef);
        const current: number = userSnap.data()?.balance ?? 0;
        const updated = current + amount;
        txn.update(userRef, { balance: updated });
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
 * Body: { accountId: string }
 * Returns: { url: string }
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

    const { accountId } = req.body as { accountId: string };
    if (!accountId) {
      sendError(res, 400, "Missing accountId");
      return;
    }

    try {
      const stripe = getStripe();
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `https://niyah-b972d.firebaseapp.com/stripe-refresh?uid=${uid}`,
        return_url: `https://niyah-b972d.firebaseapp.com/stripe-return?uid=${uid}`,
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
 * Body: { sessionId: string, stakeAmount: number }
 * Returns: { newBalance: number }
 *
 * NOTE: payout = stake (stickK model). User gets their $5/$25/$100 back.
 * Earning more than staked requires streak bonuses (future feature).
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

    const { sessionId, stakeAmount } = req.body as {
      sessionId: string;
      stakeAmount: number;
    };
    if (!sessionId || !stakeAmount) {
      sendError(res, 400, "Missing required fields");
      return;
    }

    try {
      const userRef = db.collection("users").doc(uid);
      const txnRef = db.collection("transactions").doc();
      const sessionRef = db.collection("sessions").doc(sessionId);

      const newBalance = await db.runTransaction(async (txn) => {
        const userSnap = await txn.get(userRef);
        const current: number = userSnap.data()?.balance ?? 0;

        // Payout = stake (stickK model). User gets their stake back.
        const payout = stakeAmount;
        const updated = current + payout;

        txn.update(userRef, {
          balance: updated,
          completedSessions: admin.firestore.FieldValue.increment(1),
          totalSessions: admin.firestore.FieldValue.increment(1),
          currentStreak: admin.firestore.FieldValue.increment(1),
          totalEarnings: admin.firestore.FieldValue.increment(payout),
        });

        txn.set(txnRef, {
          userId: uid,
          type: "payout",
          amount: payout,
          description: "Session completed — stake returned",
          sessionId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        txn.set(
          sessionRef,
          {
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            actualPayout: payout,
          },
          { merge: true },
        );

        return updated;
      });

      res.json({ newBalance, payout: stakeAmount });
    } catch (err) {
      console.error("handleSessionComplete error:", err);
      sendError(res, 500, "Failed to process session completion");
    }
  },
);

// ─── handleSessionForfeit ───────────────────────────────────────────────────
/**
 * Called when a user surrenders a session.
 * Stake is forfeited — goes to NIYAH (revenue). Firestore balance already
 * decremented when session started, so we just record the forfeit.
 * Body: { sessionId: string, stakeAmount: number }
 * Returns: { success: boolean }
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

    const { sessionId, stakeAmount } = req.body as {
      sessionId: string;
      stakeAmount: number;
    };
    if (!sessionId || !stakeAmount) {
      sendError(res, 400, "Missing required fields");
      return;
    }

    try {
      const txnRef = db.collection("transactions").doc();
      const sessionRef = db.collection("sessions").doc(sessionId);
      const revenueRef = db.collection("revenue").doc();

      await db.runTransaction(async (txn) => {
        txn.update(db.collection("users").doc(uid), {
          totalSessions: admin.firestore.FieldValue.increment(1),
          currentStreak: 0,
        });

        txn.set(txnRef, {
          userId: uid,
          type: "forfeit",
          amount: 0, // Already deducted at session start
          description: "Session surrendered — stake forfeited",
          sessionId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        txn.set(
          sessionRef,
          {
            status: "surrendered",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            actualPayout: 0,
          },
          { merge: true },
        );

        // Track forfeit as revenue
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
      console.error("handleSessionForfeit error:", err);
      sendError(res, 500, "Failed to record session forfeit");
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
      if ((userData.balance ?? 0) < amount) {
        sendError(res, 400, "Insufficient balance");
        return;
      }

      // Atomically deduct balance and record pending withdrawal
      const txnRef = db.collection("transactions").doc();
      await db.runTransaction(async (txn) => {
        const snap = await txn.get(userRef);
        const current: number = snap.data()?.balance ?? 0;
        if (current < amount) throw new Error("Insufficient balance");
        txn.update(userRef, { balance: current - amount });
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
      // If Stripe transfer failed, restore balance
      try {
        const snap = await db.collection("users").doc(uid).get();
        await db
          .collection("users")
          .doc(uid)
          .update({
            balance: (snap.data()?.balance ?? 0) + amount,
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
 * Called by the host when the session ends (future: automated).
 * Body: { sessionId: string, payouts: { userId: string, amount: number }[] }
 * Returns: { success: boolean, transfers: string[] }
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

    const { sessionId, payouts } = req.body as {
      sessionId: string;
      payouts: { userId: string; amount: number }[];
    };

    if (!sessionId || !payouts?.length) {
      sendError(res, 400, "Missing required fields");
      return;
    }

    try {
      const stripe = getStripe();
      const transferIds: string[] = [];

      for (const payout of payouts) {
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

        if (payout.amount <= 0) continue; // No transfer needed

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

        // Update recipient's Firestore balance
        const txnRef = db.collection("transactions").doc();
        await db.runTransaction(async (txn) => {
          const recipientRef = db.collection("users").doc(payout.userId);
          const snap = await txn.get(recipientRef);
          const current: number = snap.data()?.balance ?? 0;
          txn.update(recipientRef, { balance: current + payout.amount });
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

      res.json({ success: true, transfers: transferIds });
    } catch (err) {
      console.error("distributeGroupPayouts error:", err);
      sendError(res, 500, "Failed to distribute payouts");
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
                const userRef = db.collection("users").doc(uid);
                const txnRef = db.collection("transactions").doc();
                await db.runTransaction(async (txn) => {
                  const snap = await txn.get(userRef);
                  const current: number = snap.data()?.balance ?? 0;
                  txn.update(userRef, { balance: current + pi.amount });
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
