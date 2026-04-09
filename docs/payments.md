# Payments & Payouts

> Stripe integration, payout formulas, and settlement models.
> See also: [Features](./features.md) | [Roadmap](./roadmap.md) | [Legal](./legal.md)

## Stripe Integration

### Client

- `@stripe/stripe-react-native` -- PaymentSheet for deposits
- Publishable key via `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` env var

### Cloud Functions (24 deployed)

| Function                  | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `createPaymentIntent`     | Create Stripe PaymentIntent for deposits          |
| `verifyAndCreditDeposit`  | Verify payment succeeded, credit user's wallet    |
| `createConnectAccount`    | Create Stripe Connect Express account for payouts |
| `createAccountLink`       | Generate onboarding URL for Stripe Connect KYC    |
| `getConnectAccountStatus` | Check if Connect account is verified              |
| `requestWithdrawal`       | Initiate Stripe payout to Connect account         |
| `handleSessionComplete`   | Process completion, calculate payout              |
| `handleSessionForfeit`    | Process surrender, deduct stake                   |
| `distributeGroupPayouts`  | Calculate and distribute group session pool       |
| `stripeWebhook`           | Handle Stripe webhook events                      |

### Screens

- `app/session/deposit.tsx` -- deposit funds via Stripe PaymentSheet
- `app/session/withdraw.tsx` -- withdraw to connected bank account
- `app/session/stripe-onboarding.tsx` -- Stripe Connect KYC flow

### Current State

- Client library integrated, Cloud Functions deployed (test mode)
- Stripe live mode keys NOT enabled
- Cloud Function calls gated behind `DEMO_MODE` flag
- Redirect URLs in `createAccountLink` use `process.env.GCLOUD_PROJECT` (dynamic)

## Solo Payout Structure

### Current Model (stickK)

| Cadence | Stake | Payout on Complete    | On Forfeit      |
| ------- | ----- | --------------------- | --------------- |
| Daily   | $5    | $5 (stake returned)   | $0 (lose stake) |
| Weekly  | $25   | $25 (stake returned)  | $0              |
| Monthly | $100  | $100 (stake returned) | $0              |

### Implemented Algorithm (not yet wired)

`src/utils/payoutAlgorithm.ts` has a 2x multiplier model:

| Cadence | Stake | Payout (2x) | ROI  |
| ------- | ----- | ----------- | ---- |
| Daily   | $5    | $10         | 2x   |
| Weekly  | $25   | $60         | 2.4x |
| Monthly | $100  | $260        | 2.6x |

**Reconciliation needed**: `sessionStore.ts` uses stickK (1x return), while `payoutAlgorithm.ts` implements the 2x multiplier (`SOLO_COMPLETION_MULTIPLIER`). Decision deferred to [Phase 2](./roadmap.md#phase-2-beta-cohort).

## Group Payout Formula

Screen-time-weighted pool distribution:

```
Let c = equal contribution from each person
Let t_i = screen time for person i (on selected distraction apps)
Let t_max = maximum time in the group
Let t_bar = mean time of the group

Payout for person i:
  P_i = c                                    if t_max = t_bar (everyone equal)
  P_i = c * (t_max - t_i) / (t_max - t_bar)  otherwise
```

Lower screen time = higher payout. Uses greedy transfer netting to minimize the number of peer-to-peer transfers.

**Subject to legal review** for gambling risk. See [Legal](./legal.md#poolduo-mode----higher-risk).

### Streak Multipliers (Future)

| Cadence | Milestone 1 | Milestone 2 |
| ------- | ----------- | ----------- |
| Daily   | 1.25x @ 5d  | 1.5x @ 10d  |
| Weekly  | 1.5x @ 4wk  | 2x @ 8wk    |
| Monthly | 2x @ 3mo    | 3x @ 6mo    |

## Settlement Models by Phase

| Phase   | Model         | How it works                                                                                |
| ------- | ------------- | ------------------------------------------------------------------------------------------- |
| Phase 1 | Honor-based   | Virtual balances in-app, Venmo deep links for real settlement, reputation tracking          |
| Phase 2 | Stripe escrow | Collect real stakes upfront via PaymentIntent, auto-distribute via `distributeGroupPayouts` |
| Phase 3 | Production    | Stripe live mode, full compliance                                                           |

### Group Session Firestore Schema (Phase 1 Backend)

```
groupSessions/{sessionId}
  hostUid: string
  participantUids: string[]
  status: "proposed" | "ready" | "active" | "completed" | "cancelled"
  stakeAmount: number (cents, flexible)
  durationMs: number (flexible)
  scheduledStart: Timestamp | null
  startedAt: Timestamp | null
  completedAt: Timestamp | null
  results: { [uid]: { completed: boolean, screenTimeMs?: number } }
  payouts: { [uid]: number }
  transfers: Transfer[]

groupInvites/{inviteId}
  sessionId: string
  inviteeUid: string
  inviterUid: string
  stakeAmount: number
  durationMs: number
  status: "pending" | "accepted" | "declined"
  createdAt: Timestamp
```
