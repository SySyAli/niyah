# NIYAH - Project Roadmap

## Current Status (Feb 2026)

### What's Built

| Area                  | Status      | Notes                                                                     |
| --------------------- | ----------- | ------------------------------------------------------------------------- |
| Firebase Auth         | Done        | Google, Apple, Email magic link via custom native Swift Expo module       |
| Firestore             | Done        | User profiles, wallets, follows. Native module with get/set/update/delete |
| Solo Sessions         | Done        | Select cadence, stake, timer, surrender/complete. Local state.            |
| Duo Sessions          | Done        | Partner store, full lifecycle, Venmo deep links for settlement            |
| Group Sessions        | Done        | N-person sessions, payout algorithm (placeholder), transfer tracking      |
| Social Features       | Done        | Following/followers, public profiles, reputation system (5 tiers)         |
| Referral System       | Done        | Deep link invites, reputation boost, partner auto-connect                 |
| Contacts Integration  | Done        | expo-contacts for friend discovery                                        |
| Onboarding            | In Progress | 10 scene components exist, animations need polish                         |
| JITAI Module          | Done        | Adaptive intervention engine (simulation-only, no real usage data yet)    |
| Testing               | Setup       | Vitest with integration + unit test directories                           |
| Screen Time API       | Not Started | No native module code. This is the primary next milestone.                |
| Stripe Payments       | Not Started | Trust model (virtual balances + Venmo settlement) works for now           |
| Real Payout Algorithm | Not Started | Current algorithm is a placeholder even-split                             |

### Apple Developer Account

- [x] Apple Developer Program account ($99) -- active
- [ ] FamilyControls Development entitlement -- **not yet applied, apply NOW**
- [ ] FamilyControls Distribution entitlement -- requires separate Apple approval (2-4 weeks)

---

## Current Priorities

### 1. Screen Time API Native Module (HIGH)

The core product differentiator. Goal: start a NIYAH session, open a "blocked" app (e.g. Photos), get an Opal-style shield overlay, and lose money in NIYAH.

**Blocker**: Must apply for FamilyControls Development entitlement first. Do this immediately -- it's available right away for development, no approval wait.

**High-Level Milestones:**

| #   | Milestone                                        | What It Delivers                                                        | Est. Time |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------- | --------- |
| 1   | Apply for FamilyControls Development entitlement | Unblocks all Screen Time API work                                       | 1 day     |
| 2   | Scaffold `modules/niyah-screentime/` Expo module | Empty Swift module that loads in dev client build                       | 1-2 days  |
| 3   | FamilyControls authorization flow                | User grants Screen Time permission (native iOS dialog)                  | 2-3 days  |
| 4   | App selection with FamilyActivityPicker          | User picks which apps to block during sessions (e.g. Photos, Instagram) | 2-3 days  |
| 5   | Shield configuration (ManagedSettings)           | Blocked apps show an overlay/shield when opened during a session        | 3-5 days  |
| 6   | DeviceActivityMonitor extension                  | Detect when user opens a blocked app and fire an event                  | 5-7 days  |
| 7   | Bridge to RN session store                       | Emit events to JS when violations happen, deduct money                  | 2-3 days  |
| 8   | End-to-end integration                           | Start session -> open blocked app -> shield appears -> money deducted   | 2-3 days  |
| 9   | Physical device testing & polish                 | Screen Time API does not work in simulator                              | Ongoing   |

**Total estimate**: 3-5 weeks of focused work

**Technical Notes:**

- DeviceActivityMonitor is an **App Extension** (separate build target), not just a framework import. This is the most complex part.
- Shield Configuration also requires its own extension target.
- No maintained React Native packages exist for Screen Time API -- this is fully custom Swift.
- All testing must be on a **physical iOS device**. The Screen Time API does not work in the iOS Simulator.
- The existing `modules/niyah-firebase/` Expo module pattern is the template for the new module.
- Opal and one sec are fully native iOS apps. We're proving this can work in a React Native/Expo architecture.

**Key Apple Frameworks:**

| Framework       | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| FamilyControls  | Authorization & privacy tokens for selecting apps/websites |
| ManagedSettings | Apply restrictions (shield apps, block content)            |
| DeviceActivity  | Monitor usage & execute code on schedules/events           |

### 2. Onboarding Polish (LOW)

Scene components already exist in `src/components/onboarding/`. What remains is animation and transition work:

- [ ] Migrate animations from legacy `Animated` API to Reanimated (shared values, springs)
- [ ] Gesture-driven page transitions (swipe controls animation progress)
- [ ] Background color interpolation between pages
- [ ] Text fade/slide choreography
- [ ] Page snap with spring physics + haptic feedback
- [ ] Parallax depth layers on scene illustrations

This is UI polish. Not blocking any core functionality. Can be done in parallel or after Screen Time API.

---

## Deferred Priorities

### Stripe Integration (FUTURE)

Not blocking anything right now. The trust model (virtual balances + Venmo/PayPal settlement outside app) works for demo and early users. Integrate Stripe when ready for real money flow.

- [ ] Create Stripe account, start in test mode
- [ ] Install `@stripe/stripe-react-native`
- [ ] Build deposit flow with PaymentSheet
- [ ] Build payout/withdrawal flow
- [ ] Set up Firebase Cloud Functions for server-side (payment intents, webhooks)
- [ ] Stripe Connect Express for user-to-user transfers (avoids money transmitter issues)

### Real Payout Algorithm (FUTURE)

Current `src/utils/payoutAlgorithm.ts` is a placeholder (everyone gets their stake back). Replace with the real formula when group sessions are in active use:

```
Let c = equal contribution from each person
Let t_i = screen time for person i
Let t_max = maximum time in the group
Let t_bar = mean time of the group

Payout for person i:
  P_i = c                                    if t_max = t_bar (everyone equal)
  P_i = c * (t_max - t_i) / (t_max - t_bar)  otherwise
```

Lower screen time = higher payout. Subject to legal review for gambling risk.

### Firebase Backend Hardening (FUTURE)

Firebase Auth and Firestore are working but some areas still use local state:

- [ ] Migrate session data from local Zustand to Firestore
- [ ] Migrate wallet/balance management to server-side (Cloud Functions)
- [ ] Cloud Functions for payout calculations, streak tracking
- [ ] Firestore security rules (currently permissive for dev)

---

## Legal & Regulatory

### Is NIYAH Gambling?

Three-element test:

1. Consideration (payment) -- YES
2. Prize (something to win) -- DEBATABLE
3. Chance (luck-based outcome) -- **NO, user controls outcome**

**Verdict: Likely NOT gambling** for solo mode. Outcome is 100% effort-based.

### Precedents (Apps Operating Legally for 10+ Years)

| App       | Model                        | Status                               |
| --------- | ---------------------------- | ------------------------------------ |
| stickK    | Stakes go to charity if fail | Legal, 10+ years                     |
| Beeminder | Stakes go to company if fail | Legal, 10+ years                     |
| DietBet   | Pool split among winners     | Legal, explicit skill/effort framing |

### IMPORTANT: NIYAH is NOT an Event Contract (Kalshi Model)

Do NOT frame NIYAH as an "event contract" platform. NIYAH is a **commitment contract** -- a contract where the user commits to a goal and stakes money as a motivational device. This is the same model stickK and Beeminder have used safely for over a decade.

### Pool/Duo Mode -- Higher Risk Area

Solo mode (user vs. themselves) is legally clean. Pool mode (users competing for a shared pot) introduces gambling risk because it's zero-sum.

**Current approach**: Strategy A (Splitwise model) -- track virtual balances only, users settle outside app via Venmo. No MTL required, no gambling concern.

### Money Transmission

You are NOT a money transmitter if you: never custody funds (Splitwise model), only track debts with users settling outside app, or use a licensed third party (Stripe) for all fund movement.

### App Store Strategy

- **Category**: Productivity (NOT Games)
- **Avoid words**: "bet," "wager," "gamble," "win"
- **Use words**: "stake," "commitment," "goal," "complete"

### Required Legal Disclaimer

```
COMMITMENT CONTRACT DISCLAIMER

NIYAH provides commitment contract services, not gambling services.
The outcome of each focus session is determined solely by the user's
personal effort and action - not by chance, luck, or random events.

Users stake funds as a commitment device to help achieve their goals.
Successful completion is entirely within the user's control.

NIYAH is not a gambling, gaming, lottery, or betting service.
```

### Outstanding Legal Actions

- [ ] Schedule legal consultation with VAIL (Mark & Cat) and/or Dr. White
- [ ] Confirm pool mode strategy (Splitwise vs. Charity vs. Forfeit-to-Company)
- [ ] Review commitment contract framing with legal advisor

---

## Animation & UI Reference

### Installed Libraries

| Library                        | Version | Status                                       |
| ------------------------------ | ------- | -------------------------------------------- |
| `react-native-reanimated`      | 4.1.6   | Installed, used in some onboarding scenes    |
| `react-native-gesture-handler` | 2.28.0  | Installed, used internally by expo-router    |
| `expo-linear-gradient`         | 15.0.8  | Installed, not used in any component         |
| `react-native-svg`             | 15.15.3 | In use (Timer, onboarding SVG blobs)         |
| `expo-haptics`                 | 15.0.8  | In use (Button, Card, NumPad press feedback) |

### Components Still Using Legacy Animated API

These should eventually migrate to Reanimated for UI-thread performance:

| Component                      | Current                              | Target                                          |
| ------------------------------ | ------------------------------------ | ----------------------------------------------- |
| `Button.tsx`                   | `Animated.spring` scale 1->0.97      | `useSharedValue` + `Gesture.Tap` + `withSpring` |
| `Card.tsx`                     | `Animated.timing` fade + press scale | `withTiming` entrance + `withSpring` press      |
| `(tabs)/_layout.tsx` tab icons | `Animated.sequence` bounce           | `withSequence(withTiming(), withSpring())`      |
| `Confetti.tsx`                 | `Animated` particle system           | Reanimated shared values                        |

### Onboarding Architecture Goal

One shared value (gesture progress) drives every animation through `interpolate()`:

```
PanGesture -> progress (0 to N pages)
  ├── Background color interpolation
  ├── Scene scale/rotation transforms
  ├── Parallax layer offsets
  └── Text opacity/translateY
```

### Onboarding Content Plan

| Page | Theme                                        | Hero Element                     |
| ---- | -------------------------------------------- | -------------------------------- |
| 1    | "You're spending 7 hours on your phone"      | Phone with distracting app icons |
| 2    | "What if quitting cost you $5?"              | Dollar/coin being staked         |
| 3    | "Complete your session, earn it back + more" | Growing plant / balance rising   |
| 4    | "Ready to take control?"                     | NIYAH logo / shield              |

---

## Payout Structure Reference

### Solo Session Payouts

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

---

## 3D Gem Onboarding -- SceneKit (Visual Upgrade, Post-Launch)

**Goal:** Replace flat SVG blob characters on the first onboarding screen with photorealistic 3D gemstones using Apple's SceneKit.

The raw SVG `bodyPath` strings for all 6 blobs already exist in `src/components/onboarding/BlobsScene.tsx`. Each path can be imported into Blender as SVG, extruded into a rounded gemstone mesh, and exported as `.usdz`.

**Per-gem material mapping:**

| Blob     | Color   | Gem Type | Material                          |
| -------- | ------- | -------- | --------------------------------- |
| plum     | #5C415D | Amethyst | Deep purple glass, high clearcoat |
| blue     | #329DD8 | Sapphire | Blue glass, strong specular       |
| red      | #E07A5F | Sunstone | Warm peach glass, inner glow      |
| yellow   | #B8860B | Topaz    | Golden glass, metallic tint       |
| offWhite | #F2EDE4 | Diamond  | Near-clear, rainbow caustics      |
| green    | #40916C | Emerald  | Deep green glass                  |

This is a nice-to-have visual upgrade. Fully independent from Screen Time API work.

---

## Contacts & Advisors

- **Legal guidance:** VAIL (Mark & Cat), Dr. White
- **Technical consulting:** 40AU (Logan & Andrew)

---

## Tooling Summary

| Tool                                | Role                                | Cost                 | Status                                 |
| ----------------------------------- | ----------------------------------- | -------------------- | -------------------------------------- |
| Firebase (Auth + Firestore)         | Backend, auth, data                 | Free tier            | **Implemented** (custom native module) |
| EAS Build                           | iOS/Android builds                  | Free tier            | **Configured and in use**              |
| react-native-reanimated 4.1.6       | Animations, interpolations, springs | Free                 | Installed, partially used (onboarding) |
| react-native-gesture-handler 2.28.0 | Pan/tap gesture tracking            | Free                 | Installed, used by router              |
| expo-linear-gradient 15.0.8         | Gradient backgrounds                | Free                 | Installed, unused                      |
| react-native-svg 15.15.3            | SVG illustrations, timer ring       | Free                 | **In use**                             |
| expo-haptics 15.0.8                 | Tactile feedback                    | Free                 | **In use**                             |
| Vitest 2.1.9                        | Unit + integration testing          | Free                 | **Configured**                         |
| ESLint 9 + Prettier                 | Linting + formatting                | Free                 | **Configured**                         |
| Stripe                              | Payments                            | Per-transaction fees | Not yet set up                         |
| Figma                               | Design illustrations, export SVGs   | Free                 | Ready                                  |
