# NIYAH - Project Guide

## Overview

NIYAH is a focus app with financial stakes. Users deposit money, stake it on focus sessions, and earn more than they staked for successful completion. Quit early = lose your stake.

**Problem**: People struggle with phone addiction, spending 7+ hours daily on distracting apps. Existing solutions fail because there are no real consequences for failure.

**Solution**: When checking Instagram costs you $5, behavior changes in ways willpower alone cannot achieve.

## Tech Stack

- **Framework**: React Native + Expo (SDK 54)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Styling**: React Native StyleSheet
- **Build**: EAS Build (production), Expo Go (development)
- **Backend**: Firebase (Cloud Functions, Auth, Data Connect) - _future_
- **Payments**: Trust model for MVP, Stripe for production - _future_

## Project Structure

```
niya/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Entry point (redirects to auth or tabs)
│   ├── (auth)/             # Unauthenticated screens
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx     # Onboarding/welcome screen
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/             # Main app tabs (authenticated)
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # Dashboard/Home
│   │   ├── session.tsx     # Start new session
│   │   └── profile.tsx     # User profile & settings
│   └── session/            # Session flow (stack navigation)
│       ├── _layout.tsx
│       ├── select.tsx      # Select cadence
│       ├── confirm.tsx     # Confirm stake
│       ├── active.tsx      # Active session with timer
│       ├── surrender.tsx   # Surrender confirmation
│       └── complete.tsx    # Session complete celebration
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Balance.tsx
│   │   └── Timer.tsx
│   ├── store/              # Zustand state stores
│   │   ├── authStore.ts
│   │   ├── sessionStore.ts
│   │   └── walletStore.ts
│   ├── hooks/              # Custom React hooks
│   │   └── useCountdown.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── constants/          # App constants
│   │   ├── colors.ts
│   │   └── config.ts
│   └── utils/              # Utility functions
│       └── format.ts
├── assets/                 # Images, fonts, etc.
├── CLAUDE.md               # This file
├── README.md
├── app.json                # Expo config
├── package.json
└── tsconfig.json
```

## Development Commands

```bash
# Install dependencies (use pnpm, not npm)
pnpm install

# Start development server
pnpm start
# or: npx expo start

# Start with iOS simulator
pnpm ios

# Start with Android emulator
pnpm android

# Clear cache and start
npx expo start --clear

# Type check
npx tsc --noEmit

# Build for iOS (requires EAS)
eas build --profile development --platform ios

# Build for Android (requires EAS)
eas build --profile development --platform android
```

## Key Conventions

### TypeScript

- Use strict mode
- Define types in `/src/types/index.ts`
- Prefer interfaces over types for object shapes
- Use `const` assertions for literal types

### Components

- Functional components only (no class components)
- Use hooks for state and effects
- Keep components small and focused (< 150 lines)
- Props interface defined above component

### Styling

- Use `StyleSheet.create()` for all styles
- Define styles at bottom of component file
- Use constants for colors and spacing
- Follow 8px spacing grid

### State Management (Zustand)

- One store per domain (auth, session, wallet)
- Keep stores flat, avoid nesting
- Use immer for complex updates if needed
- Persist critical state to AsyncStorage

### Navigation (Expo Router)

- File-based routing in `/app` directory
- Use groups `(groupName)` for layouts
- Use `router.push()` for navigation
- Use `router.replace()` for auth redirects

## Core Features

### Session Flow

1. User selects cadence (Daily/Weekly/Monthly)
2. User confirms stake amount
3. Session starts, distracting apps are "blocked"
4. Timer counts down (or tracks usage)
5. User can "surrender" early (lose stake) or complete (earn payout)
6. Streak increments on successful completion

### Payout Structure

| Cadence | Stake | Base Payout | ROI  |
| ------- | ----- | ----------- | ---- |
| Daily   | $5    | $10         | 2x   |
| Weekly  | $25   | $60         | 2.4x |
| Monthly | $100  | $260        | 2.6x |

### Streak Multipliers

| Cadence | Milestone 1 | Milestone 2 |
| ------- | ----------- | ----------- |
| Daily   | 1.25x @ 5d  | 1.5x @ 10d  |
| Weekly  | 1.5x @ 4wk  | 2x @ 8wk    |
| Monthly | 2x @ 3mo    | 3x @ 6mo    |

### Trust Model (MVP)

Instead of real payments:

1. Users see virtual balance
2. "Deposit" shows Venmo/PayPal handles for manual transfer
3. "Withdraw" creates pending request
4. Settlement happens outside the app

## Demo Mode

For the prototype demo:

- No real backend (mock data)
- No real Screen Time API (simulated blocking)
- Short timer durations (30 seconds instead of 24 hours)
- Starting balance of $50
- Trust model for payments

## Future Features (Post-Demo)

- [ ] iOS Screen Time API (FamilyControls)
- [ ] Android UsageStats integration
- [ ] Firebase backend
- [ ] Stripe payments
- [ ] Group pools/challenges
- [ ] Push notification check-ins
- [ ] App Store deployment

## Critical De-risking Areas

### 1. iOS Screen Time API (FamilyControls)

#### Required Frameworks

| Framework           | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| **FamilyControls**  | Authorization & privacy tokens for apps/websites |
| **ManagedSettings** | Apply restrictions (shield apps, block content)  |
| **DeviceActivity**  | Monitor usage & execute code on schedules/events |

#### Entitlement Requirements

- **`com.apple.developer.family-controls`** - Main entitlement needed
- Development version: Available immediately for testing
- Distribution version: **Requires Apple approval** for App Store

#### Apple Approval Timeline

| Scenario                  | Timeline            |
| ------------------------- | ------------------- |
| First-time approval       | 2-4 weeks           |
| Additional bundle IDs     | 1-3 weeks           |
| Extensions (Shield, etc.) | 2+ weeks additional |

**Action**: Apply for FamilyControls (Distribution) entitlement NOW at Apple Developer Portal

#### React Native / Expo Compatibility

**No maintained RN packages exist.** Native Swift modules required.

| Option                    | Complexity | Timeline   |
| ------------------------- | ---------- | ---------- |
| Custom Expo Module        | High       | 4-8 weeks  |
| Bare RN + Native Module   | High       | 4-8 weeks  |
| Full Native Swift Rewrite | Highest    | 8-12 weeks |

#### How Opal/one sec Handle This

- Both are **native iOS apps** (not React Native)
- Both use **Productivity** category (not Parental Controls)
- Both work for self-control use cases (Individual authorization mode)

#### Recommended Path

1. Apply for entitlement immediately
2. Build native Swift prototype for Screen Time features
3. Decide: Full native vs. hybrid architecture after prototype

---

### 2. Payment Integration

#### Recommended: Stripe

| Requirement      | Rating                                     |
| ---------------- | ------------------------------------------ |
| React Native SDK | Official (`@stripe/stripe-react-native`)   |
| Sandbox Mode     | Excellent (test card: 4242 4242 4242 4242) |
| Approval Speed   | 1-3 business days                          |
| Expo Support     | Native plugin support                      |

#### Fees Impact on $5 Stake

```
Deposit: $5.00
Stripe fee: -$0.45 (2.9% + $0.30)
Net received: $4.55

Payout (if user wins): $10.00
Instant payout fee: -$0.15 (1.5%)
User receives: $9.85

Your cost per successful session: ~$0.60
```

#### Other Options Evaluated

| Platform       | Verdict                                      |
| -------------- | -------------------------------------------- |
| PayPal         | Risky for stake-based apps (account freezes) |
| Apple Cash API | Does not exist for third parties             |
| Cash App API   | Does not exist                               |
| Venmo          | Only via PayPal integration                  |

#### Demo Implementation (1-2 days)

```typescript
// Use Stripe test mode
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";

// Test PaymentSheet with test keys - no real money
const { initPaymentSheet, presentPaymentSheet } = useStripe();
```

#### Production Timeline

- Demo (test mode): 1-2 days
- Production (real payments): 1-2 weeks (includes business verification)

#### Stripe Connect Architecture (Production Plan)

Instead of handling money directly, use **Stripe Connect Express** so Stripe manages KYC, bank accounts, and payouts:

**Required Server Endpoints (Firebase Cloud Functions):**

| Endpoint                             | Purpose                                           |
| ------------------------------------ | ------------------------------------------------- |
| `POST /stripe/create-account`        | Create Stripe Connect Express account for user    |
| `POST /stripe/account-link`          | Generate onboarding URL for identity verification |
| `POST /stripe/create-payment-intent` | Charge user's payment method (deposit/stake)      |
| `POST /stripe/create-transfer`       | Transfer winnings to user's connected account     |
| `GET /stripe/account-status`         | Check if user's account is verified               |
| `POST /stripe/create-payout`         | Trigger payout from connected account to bank     |

**Client-Side Flow:**

```
1. User signs up → create Stripe Connect Express account (server)
2. User taps "Add Payment Method" → Stripe AccountLink URL opens in WebView
   → Stripe handles: SSN, bank account, identity verification
   → User never enters sensitive data in our app
3. User deposits → PaymentIntent created (server) → PaymentSheet (client)
4. User wins session → Transfer from platform to user's connected account (server)
5. User requests withdrawal → Payout from connected account to bank (server)
```

**Key Dependencies:**

- `@stripe/stripe-react-native` — client SDK (already evaluated)
- Firebase Cloud Functions — server-side Stripe API calls
- Stripe Dashboard — manage accounts, disputes, compliance

**Why This Avoids Money Transmitter Issues:**

- Stripe is the licensed money transmitter, not Niyah
- Niyah never custodies funds directly
- All KYC/AML compliance handled by Stripe
- Platform charges are "service fees" through Stripe's infrastructure

---

### 3. Legal & Regulatory

#### Is NIYAH Gambling?

**Three-element test for gambling:**

1. Consideration (payment) - YES
2. Prize (something to win) - DEBATABLE
3. Chance (luck-based outcome) - **NO - user controls outcome**

**Verdict: Likely NOT gambling** because outcome is 100% effort-based, not chance-based.

#### Precedents (Apps That Operate Legally)

| App           | Model                        | Status                                |
| ------------- | ---------------------------- | ------------------------------------- |
| **stickK**    | Stakes go to charity if fail | Legal - 10+ years                     |
| **Beeminder** | Stakes go to company if fail | Legal - 10+ years                     |
| **DietBet**   | Pool split among winners     | Legal - explicit skill/effort framing |

#### Money Transmission Requirements

**You ARE a money transmitter if you:**

- Custody user funds
- Transfer funds user-to-user (pool model)
- Pay out funds to users

**Triggers:** FinCEN registration + State MTLs (49 states) = $50K-$500K+ in fees, 6-24 month timeline

**You are NOT a money transmitter if you:**

- Never custody funds (Splitwise model)
- Only track debts, users settle outside app
- Use licensed third party (Stripe) for all payments

#### Recommended Strategies (Safest to Most Complex)

**Strategy A: Splitwise Model (MVP - Recommended)**

- Track virtual balances only
- Users transfer via Venmo/PayPal outside app
- No MTL required, no gambling concern
- Risk: LOW | Scalability: Limited

**Strategy B: Penalty-to-Charity Model**

- If user fails, stake goes to charity (not profit)
- User can never "win" more than they staked
- Removes gambling concern entirely
- Risk: MEDIUM | Scalability: Good

**Strategy C: Forfeit-to-Company Model (Beeminder)**

- If user fails, company keeps stake as "service fee"
- No user-to-user transfers
- Risk: LOW-MEDIUM | Scalability: Good

#### App Store Strategy

- **Category**: Productivity or Health & Fitness (NOT Games)
- **Avoid words**: "bet," "wager," "gamble," "win"
- **Use words**: "stake," "commitment," "goal," "complete"
- **Disclaimer**: "Outcomes determined solely by user effort and action"

#### Required Legal Disclaimer

```
COMMITMENT CONTRACT DISCLAIMER

NIYAH provides commitment contract services, not gambling services.
The outcome of each focus session is determined solely by the user's
personal effort and action - not by chance, luck, or random events.

Users stake funds as a commitment device to help achieve their goals.
Successful completion is entirely within the user's control.

NIYAH is not a gambling, gaming, lottery, or betting service.
```

---

### 4. Pool Mode Payout Formula

For group challenges where users stake equal amounts:

```
Let c = equal contribution from each person
Let t_i = screen time for person i
Let t_max = maximum time in the group
Let t̄ = mean time of the group

Payout for person i:
  P_i = c                           if t_max = t̄ (everyone equal)
  P_i = c × (t_max - t_i)/(t_max - t̄)   otherwise
```

**Interpretation**: Lower screen time = higher payout. The person with lowest usage gets the most.

**Legal note**: Pool mode has higher gambling risk (zero-sum, user-vs-user). Consider:

- Forfeited stakes go to charity instead of winners
- Or use Splitwise model for pools (track only, settle outside app)

---

### 5. Trust Model Details (MVP)

Instead of real payments for demo/MVP:

1. Users see virtual balance in-app
2. "Deposit" shows payment handles for manual transfer:
   - Venmo: @niyah-app
   - PayPal: payments@niyah.app
3. "Withdraw" creates pending request (manual fulfillment)
4. If someone fails to pay, other members can mark their profile
5. Users "build trust" with small sessions before larger ones

**Benefits**: Zero regulatory burden, fast to implement, validates concept

---

## Implementation Phases

### Phase 1: Demo MVP (Current)

- [x] Virtual balances (trust model)
- [x] Simulated Screen Time blocking
- [x] Short timer durations (30 sec)
- [ ] Stripe test mode integration (1-2 days)

### Phase 2: Beta (2-4 weeks)

- [ ] Apply for FamilyControls entitlement
- [ ] Build native Swift Screen Time prototype
- [ ] Stripe production integration
- [ ] Firebase backend

### Phase 3: Production (2-3 months)

- [ ] Full Screen Time API implementation
- [ ] Real payments with proper compliance
- [ ] App Store submission
- [ ] Legal review before launch

---

## Contact

- Professor feedback: De-risk Screen Time API, legal/gambling, and payments first
- Consult: VAIL (Mark & Cat), Dr. White for legal guidance
- Reference: 40AU (Logan & Andrew) for technical consulting
