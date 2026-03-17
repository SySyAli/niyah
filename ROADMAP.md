# NIYAH - Project Roadmap

## Current Status (Mar 2026)

### What's Built

| Area                     | Status      | Notes                                                                                                                                          |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Firebase Auth            | Done        | Google, Apple, Email magic link via `@react-native-firebase/auth`                                                                              |
| Firestore                | Done        | User profiles, wallets, follows, solo sessions. RNFB packages (`@react-native-firebase/firestore`). Session persistence + crash recovery.      |
| Solo Sessions            | Done        | Select cadence, stake, timer, surrender/complete. Persisted to Firestore with crash recovery via `recoverActiveSession`.                       |
| Duo Sessions             | Done        | Partner store, full lifecycle, Venmo deep links for settlement                                                                                 |
| Group Sessions (UI)      | Done        | N-person sessions, payout algorithm, transfer tracking, propose.tsx screen                                                                     |
| Group Sessions (Backend) | Not Started | No Firebase write for proposals. No real-time listeners. No push notifications. Single-device only.                                            |
| Social Features          | Done        | Following/followers, public profiles, reputation system (5 tiers)                                                                              |
| Referral System          | Done        | Deep link invites, reputation boost, partner auto-connect                                                                                      |
| Contacts Integration     | Done        | expo-contacts for friend discovery                                                                                                             |
| Theme System             | Done        | Dark/light theme via themeStore + useColors hook, full DarkColors/LightColors palette                                                          |
| Onboarding               | In Progress | 10 scene components exist, animations need polish                                                                                              |
| JITAI Module             | Parked      | Adaptive intervention engine (simulation-only, no real usage data). Will integrate when Screen Time data is available.                         |
| Testing                  | Done        | 401 tests (20 suites). Unit + integration + Firestore persistence coverage.                                                                    |
| Screen Time (Swift)      | Done        | Production-quality Swift. FamilyControls auth, app picker, blocking, violation polling. Needs device validation.                               |
| Screen Time (Wiring)     | Not Started | sessionStore does not call startBlocking/stopBlocking. Extension embed phase disabled. FamilyControls entitlement not applied.                 |
| Screen Time (Stats)      | Not Started | `DeviceActivityReport` not imported. No screen time data collection, storage, or display exists.                                               |
| Push Notifications       | Not Started | APNs entitlement configured, no FCM implementation                                                                                             |
| Stripe Payments          | In Progress | Client lib, Cloud Functions (8 deployed incl. `distributeGroupPayouts`), deposit/withdrawal/KYC screens. Live mode keys not enabled.           |
| Firestore Rules          | Done        | Rules for `users`, `wallets`, `userFollows`, `sessions`. Default deny for unmatched collections.                                               |
| Real Payout Algorithm    | Done        | Implemented in `src/utils/payoutAlgorithm.ts`. Solo: 2x stake. Group: pool split. Not yet wired to solo sessionStore (uses stickK 1x instead). |

### Apple Developer Account

- [x] Apple Developer Program account ($99) -- active
- [ ] FamilyControls Development entitlement -- **not yet applied, BLOCKER for Phase 1**
- [ ] FamilyControls Distribution entitlement -- requires separate Apple approval (2-4 weeks)

### Firebase Project

- [x] Firebase project (`niyah-b972d`) with Auth + Firestore
- [x] 8 Cloud Functions deployed (Stripe payments, session complete/forfeit, group payouts, webhook)
- [x] Firestore emulators configured
- [x] Firestore security rules for users, wallets, follows, sessions
- [ ] Cloud Functions for group sessions (not started)
- [ ] FCM push notification infrastructure (not started)

---

## Launch Strategy

**Group Mode first, free trial (real stakes, no Niyah cut), then solo payout model later.**

### Why Group Sessions First

Social accountability + financial stakes combined is the product's strongest hook. One person invites friends, everyone stakes together, completers split the losers' pool. This is immediately compelling and shareable.

### Phased Rollout

1. **Phase 1** -- Group Mode MVP (4-person internal test among the dev team)
2. **Phase 2** -- Beta Cohort (campus launch, 20-100 users, Stripe escrow)
3. **Phase 3** -- Public Launch (App Store, production infrastructure)

---

## Phase 1: Group Mode MVP (Internal 4-Person Test)

**Goal:** All 4 developers can create, join, and complete group focus sessions with real stakes, app blocking, and automated settlement.

**Timeline:** Next sprint

### 1.1 Group Session Firebase Backend

The `propose.tsx` screen and `groupSessionStore.ts` are fully built with local state. The missing piece is multi-user coordination via Firestore + Cloud Functions.

| #   | Task                          | What's Needed                                                             |
| --- | ----------------------------- | ------------------------------------------------------------------------- |
| 1   | Firestore schema + rules      | `groupSessions` and `groupInvites` collections with security rules        |
| 2   | `createGroupSession` function | Cloud Function: write proposal doc, trigger invite notifications          |
| 3   | `joinGroupSession` function   | Cloud Function: accept/decline invites, update participant list           |
| 4   | `recordParticipantResult`     | Cloud Function: each device reports its own user's result                 |
| 5   | `completeGroupSession`        | Cloud Function: server-authoritative payout calculation, writes transfers |
| 6   | Real-time Firestore listeners | All participants subscribe to session doc via `onSnapshot`                |
| 7   | Wire `propose.tsx` to backend | Refactor store for flexible params (custom stake/duration with presets)   |
| 8   | Incoming invites screen       | New screen for invitees to see and accept/decline proposals               |
| 9   | Group session dashboard       | View active sessions, pending invites, settlement status                  |

#### Firestore Schema

```
groupSessions/{sessionId}
  - hostUid: string
  - participantUids: string[]
  - status: "proposed" | "ready" | "active" | "completed" | "cancelled"
  - stakeAmount: number (cents, flexible)
  - durationMs: number (flexible)
  - scheduledStart: Timestamp | null
  - startedAt: Timestamp | null
  - completedAt: Timestamp | null
  - results: { [uid]: { completed: boolean, screenTimeMs?: number } }
  - payouts: { [uid]: number }
  - transfers: Transfer[]

groupInvites/{inviteId}
  - sessionId: string
  - inviteeUid: string
  - inviterUid: string
  - inviterName: string
  - stakeAmount: number
  - durationMs: number
  - status: "pending" | "accepted" | "declined"
  - createdAt: Timestamp
```

#### Parameter Model

`propose.tsx` uses flexible parameters ($5-$50 custom stakes, 30min-all day durations, day/time scheduling). The group session store will be refactored to accept arbitrary amounts and durations, with the existing cadence presets as default quick-pick options.

### 1.2 Push Notifications (FCM)

Group sessions require push notifications for invites, session start coordination, and settlement nudges.

- [ ] Create APNs key in Apple Developer portal
- [ ] Configure Firebase Cloud Messaging (FCM) with APNs key
- [ ] Install `@react-native-firebase/messaging`
- [ ] Store FCM device token on user's Firestore document on app start
- [ ] Cloud Function triggers for:
  - Group session invite notification
  - All participants accepted -- session ready to start
  - Session complete / results notification
  - Settlement reminder (if overdue)

### 1.3 Screen Time Blocking (Session Wiring)

Wire the existing Screen Time module into the session lifecycle. **Blocking only** -- statistics deferred to Phase 2.

| #   | Task                                                   | Status                                |
| --- | ------------------------------------------------------ | ------------------------------------- |
| 1   | Enable FamilyControls entitlement on App ID            | **BLOCKER** -- Apple Developer portal |
| 2   | Wire extension embed in `withDeviceActivityMonitor.js` | Next                                  |
| 3   | Build new dev client (`pnpm build:dev`)                | Next                                  |
| 4   | Physical device validation                             | Next                                  |
| 5   | Call `startBlocking()` from session start              | Next                                  |
| 6   | Call `stopBlocking()` from session complete/surrender  | Next                                  |
| 7   | Subscribe to `onShieldViolation` in session store      | Next                                  |

**Note:** Custom shield configuration (`ShieldConfigurationDataSource`) is deferred to Phase 2. Phase 1 uses the default iOS shield appearance.

### 1.4 Settlement Model (Phase 1)

For the 4-person internal test, settlement remains **honor-based** with Venmo deep links. Stripe automated escrow is deferred to Phase 2 when real money is on the line with non-team members.

---

## Phase 2: Beta Cohort (Campus Launch, 20-100 Users)

**Goal:** Deploy to a beta cohort on campus with real Stripe payments, screen time statistics, and polished group experience.

### 2.1 Stripe Escrow Flow

Collect real stakes upfront into a Niyah-held Stripe escrow pool. Auto-distribute payouts on session completion via the existing `distributeGroupPayouts` Cloud Function.

| #   | Task                                                 | Notes                                                    |
| --- | ---------------------------------------------------- | -------------------------------------------------------- |
| 1   | `collectGroupStake` Cloud Function                   | Create PaymentIntent per participant at session start    |
| 2   | Escrow pool tracking in Firestore                    | Track collected stakes, pending payouts per session      |
| 3   | Auto-distribute on `completeGroupSession`            | Wire into existing `distributeGroupPayouts` function     |
| 4   | Handle partial collection (not all participants pay) | Grace period, cancel session if not all stakes collected |
| 5   | Enable Stripe live mode keys                         | `STRIPE_SECRET_KEY` in Firebase Secret Manager           |
| 6   | End-to-end payment testing with real cards           | Test deposit, stake collection, payout distribution      |

### 2.2 Screen Time Statistics

Show users their screen time data. **Architectural challenge:** Apple's `DeviceActivityReport` is a SwiftUI view-based API, not a data query. Bridging into React Native requires rendering via `UIHostingController` or a `DeviceActivityReportExtension`.

| #   | Task                                                  | Notes                                                           |
| --- | ----------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Add `DeviceActivityReport` to podspec weak_frameworks | Required framework import                                       |
| 2   | Evaluate bridging approach                            | `UIHostingController` in RN vs. `DeviceActivityReportExtension` |
| 3   | New Swift functions for screen time data              | Daily/weekly aggregates, per-app breakdowns                     |
| 4   | Expose via JS wrapper (`screentime.ts`)               | Typed convenience functions                                     |
| 5   | Screen time Zustand store                             | Persist and cache screen time statistics                        |
| 6   | UI components                                         | Daily usage chart, per-app breakdown, trends                    |
| 7   | Populate `SessionParticipant.screenTime`              | Feed real data into payout algorithm                            |

**Fallback:** If `DeviceActivityReport` bridging proves infeasible, build a simpler "session results" analytics view based on completion/surrender data and violation counts.

### 2.3 Custom Shield UX

Replace the default iOS shield with a branded Niyah shield showing the blob character and Surrender/Stay Focused buttons.

| #   | Task                                       | Notes                                                            |
| --- | ------------------------------------------ | ---------------------------------------------------------------- |
| 1   | `ShieldConfigurationDataSource` extension  | New App Extension target providing custom `ShieldConfiguration`  |
| 2   | `ShieldActionExtension`                    | Handle button taps (Surrender/Stay Focused) in extension process |
| 3   | Niyah blob icon as shield image            | Export from SVG as PNG for shield                                |
| 4   | Communicate surrender decision to main app | Via shared UserDefaults (App Groups)                             |
| 5   | Add extension targets to build pipeline    | Extend config plugins                                            |

### 2.4 Additional Phase 2 Work

- [ ] Group session settlement dashboard (pending invites, active sessions, transfer status)
- [ ] Solo payout model decision and reconciliation (stickK 1x vs multiplier 2x)
- [ ] Push notification enhancements (session reminders, settlement nudges, overdue alerts)
- [ ] App Store review preparation (Productivity category, commitment contract framing)

---

## Phase 3: Public Launch (App Store)

**Goal:** Production-ready app on the App Store.

### 3.1 Production Infrastructure

- [ ] Stripe live mode enabled and tested end-to-end
- [ ] FamilyControls Distribution entitlement (Apple approval, 2-4 weeks)
- [ ] Firebase production security rules hardened
- [ ] Cloud Functions rate limiting and abuse prevention
- [ ] Error monitoring and crash reporting (Sentry or Firebase Crashlytics)

### 3.2 Legal & Compliance

- [ ] Legal consultation with VAIL (Mark & Cat) and/or Dr. White
- [ ] Confirm group mode strategy (escrow vs. charity vs. forfeit-to-company)
- [ ] Review commitment contract framing with legal advisor
- [ ] Terms of Service and Privacy Policy
- [ ] Commitment contract disclaimer in app

### 3.3 Polish

- [ ] Onboarding animation polish (Reanimated migration, gesture-driven transitions)
- [ ] Migrate legacy `Animated` components to Reanimated
- [ ] 3D gem onboarding (SceneKit, post-launch visual upgrade)
- [ ] Performance optimization and bundle size audit

---

## Screen Time -- Technical Reference

### Vision

Instead of silently hard-blocking apps, the goal is an **interactive surrender decision point**. When a user opens a restricted app during a focus session:

1. A **custom shield screen** appears (full-screen, replaces the blocked app at OS level)
2. The screen shows the **Niyah blob character** and a clear prompt
3. User has two choices:
   - **"Surrender"** -- ends the session, loses stake, unblocks all apps
   - **"Stay Focused"** -- dismisses the shield, returns user to previous context

This is a focus block model (deep work windows), NOT always-on screen time limiting.

### Technical Reality Check

**iOS does NOT allow injecting modals or custom views inside another running app.** The only API-compliant way is `ManagedSettings ShieldConfiguration`:

- Custom icon (Niyah blob as PNG)
- Title and subtitle text
- Primary button (Surrender) + Secondary button (Stay Focused)
- Button actions fire in the `DeviceActivityMonitorExtension`

### Key Apple Frameworks

| Framework       | Purpose                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| FamilyControls  | Authorization & privacy tokens for selecting apps/websites                         |
| ManagedSettings | Apply restrictions (shield apps, block content), ShieldConfiguration for custom UI |
| DeviceActivity  | Monitor usage & execute code on schedules/events, handle shield button actions     |

### Implementation Status

| Milestone                                     | Status       | Phase |
| --------------------------------------------- | ------------ | ----- |
| Swift module (auth, picker, block/unblock)    | **Done**     | --    |
| JS wrapper (`src/config/screentime.ts`)       | **Done**     | --    |
| Config plugins (entitlements, extension)      | **Done**     | --    |
| Violation polling + event emission            | **Done**     | --    |
| FamilyControls entitlement on App ID          | **Not done** | 1     |
| Extension embed phase in build                | **Not done** | 1     |
| Physical device validation                    | **Not done** | 1     |
| Session lifecycle wiring (block/unblock)      | **Not done** | 1     |
| Screen time statistics (DeviceActivityReport) | **Not done** | 2     |
| Custom ShieldConfigurationDataSource          | **Not done** | 2     |
| ShieldActionExtension for button handling     | **Not done** | 2     |

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

NIYAH is a **commitment contract** -- a contract where the user commits to a goal and stakes money as a motivational device. This is the same model stickK and Beeminder have used safely for over a decade.

### Pool/Duo Mode -- Higher Risk Area

Solo mode (user vs. themselves) is legally clean. Pool mode (users competing for a shared pot) introduces gambling risk because it's zero-sum.

**Phase 1 approach**: Honor-based settlement with Venmo deep links. No money transmission.
**Phase 2 approach**: Stripe escrow (licensed third party handles all fund movement). No MTL required.

### Money Transmission

You are NOT a money transmitter if you: never custody funds directly, only use a licensed third party (Stripe) for all fund movement, or only track debts with users settling outside app.

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
- [ ] Confirm pool mode strategy (escrow vs. charity vs. forfeit-to-company)
- [ ] Review commitment contract framing with legal advisor
- [ ] Terms of Service and Privacy Policy

---

## Payout Structure Reference

### Solo Session Payouts (Deferred to Phase 2)

Current model: stickK (payout = stake returned, 1x). Decision needed on whether to wire the 2x multiplier from `payoutAlgorithm.ts`.

| Cadence | Stake | Base Payout (2x) | ROI  |
| ------- | ----- | ---------------- | ---- |
| Daily   | $5    | $10              | 2x   |
| Weekly  | $25   | $60              | 2.4x |
| Monthly | $100  | $260             | 2.6x |

### Group Payout Formula (Screen Time Weighted, Phase 2+)

```
Let c = equal contribution from each person
Let t_i = screen time for person i (on selected distraction apps)
Let t_max = maximum time in the group
Let t_bar = mean time of the group

Payout for person i:
  P_i = c                                      if t_max = t_bar (everyone equal)
  P_i = c * (t_max - t_i) / (t_max - t_bar)   otherwise
```

Lower screen time = higher payout. Subject to legal review for gambling risk.

### Streak Multipliers (Future)

| Cadence | Milestone 1 | Milestone 2 |
| ------- | ----------- | ----------- |
| Daily   | 1.25x @ 5d  | 1.5x @ 10d  |
| Weekly  | 1.5x @ 4wk  | 2x @ 8wk    |
| Monthly | 2x @ 3mo    | 3x @ 6mo    |

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
  |- Background color interpolation
  |- Scene scale/rotation transforms
  |- Parallax layer offsets
  +- Text opacity/translateY
```

### 3D Gem Onboarding -- SceneKit (Post-Launch)

Replace flat SVG blob characters with photorealistic 3D gemstones.

| Blob     | Color   | Gem Type | Material                          |
| -------- | ------- | -------- | --------------------------------- |
| plum     | #5C415D | Amethyst | Deep purple glass, high clearcoat |
| blue     | #329DD8 | Sapphire | Blue glass, strong specular       |
| red      | #E07A5F | Sunstone | Warm peach glass, inner glow      |
| yellow   | #B8860B | Topaz    | Golden glass, metallic tint       |
| offWhite | #F2EDE4 | Diamond  | Near-clear, rainbow caustics      |
| green    | #40916C | Emerald  | Deep green glass                  |

---

## Tooling Summary

| Tool                                | Role                                | Cost                 | Status                                        |
| ----------------------------------- | ----------------------------------- | -------------------- | --------------------------------------------- |
| Firebase (Auth + Firestore)         | Backend, auth, data                 | Free tier            | **Implemented** (RNFB packages)               |
| Firebase Cloud Functions            | Server-side logic, payments         | Free tier            | **8 functions deployed**                      |
| EAS Build                           | iOS/Android builds                  | Free tier            | **Configured and in use**                     |
| react-native-reanimated 4.1.6       | Animations, interpolations, springs | Free                 | Installed, partially used (onboarding)        |
| react-native-gesture-handler 2.28.0 | Pan/tap gesture tracking            | Free                 | Installed, used by router                     |
| expo-linear-gradient 15.0.8         | Gradient backgrounds                | Free                 | Installed, unused                             |
| react-native-svg 15.15.3            | SVG illustrations, timer ring       | Free                 | **In use**                                    |
| expo-haptics 15.0.8                 | Tactile feedback                    | Free                 | **In use**                                    |
| Jest + jest-expo 54.x               | Unit + integration testing          | Free                 | **401 tests passing**                         |
| ESLint 9 + Prettier                 | Linting + formatting                | Free                 | **Configured, 0 errors/warnings**             |
| Stripe                              | Payments (deposits, payouts, KYC)   | Per-transaction fees | **Integrated** (test mode, live keys pending) |

---

## Contacts & Advisors

- **Legal guidance:** VAIL (Mark & Cat), Dr. White
- **Technical consulting:** 40AU (Logan & Andrew)
