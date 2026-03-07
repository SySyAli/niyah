# NIYAH - Project Roadmap

## Current Status (Mar 2026)

### What's Built

| Area                     | Status      | Notes                                                                                                                                          |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Firebase Auth            | Done        | Google, Apple, Email magic link via custom native Swift Expo module                                                                            |
| Firestore                | Done        | User profiles, wallets, follows. Native module with get/set/update/delete                                                                      |
| Solo Sessions            | Done        | Select cadence, stake, timer, surrender/complete. Local state only.                                                                            |
| Duo Sessions             | Done        | Partner store, full lifecycle, Venmo deep links for settlement                                                                                 |
| Group Sessions (UI)      | Done        | N-person sessions, payout algorithm (placeholder), transfer tracking, propose.tsx screen                                                       |
| Group Sessions (Backend) | Not Started | No Firebase write for proposals. No real-time listeners. No push notifications.                                                                |
| Social Features          | Done        | Following/followers, public profiles, reputation system (5 tiers)                                                                              |
| Referral System          | Done        | Deep link invites, reputation boost, partner auto-connect                                                                                      |
| Contacts Integration     | Done        | expo-contacts for friend discovery                                                                                                             |
| Theme System             | Done        | Dark/light theme via themeStore + useColors hook, full DarkColors/LightColors palette                                                          |
| Onboarding               | In Progress | 10 scene components exist, animations need polish                                                                                              |
| JITAI Module             | Done        | Adaptive intervention engine (simulation-only, no real usage data yet)                                                                         |
| Testing                  | Done        | Jest + jest-expo with integration + unit tests (stores, components, hooks, utils)                                                              |
| Screen Time (Swift)      | Done        | Production-quality Swift. All APIs implemented. Needs device validation.                                                                       |
| Screen Time (Wiring)     | Not Started | sessionStore.ts does not call startBlocking/stopBlocking. Not integrated.                                                                      |
| Push Notifications       | Not Started | APNs entitlement configured, no implementation                                                                                                 |
| Stripe Payments          | In Progress | Client lib installed, Cloud Functions deployed, deposit/withdrawal/KYC screens built. Live mode keys not enabled.                              |
| Real Payout Algorithm    | Done        | Implemented in `src/utils/payoutAlgorithm.ts`. Solo: 2× stake. Group: pool split. Not yet wired to solo sessionStore (uses stickK 1× instead). |

### Apple Developer Account

- [x] Apple Developer Program account ($99) -- active
- [ ] FamilyControls Development entitlement -- **not yet applied, apply NOW**
- [ ] FamilyControls Distribution entitlement -- requires separate Apple approval (2-4 weeks)

---

## Immediate Path to Real Users

The fastest path to publishing and getting traction is **Group Pool Sessions** with real Firebase backend. The UI is fully built (`propose.tsx`, `groupSessionStore.ts`). What's missing is the backend coordination layer.

**Why Group Sessions first**: Social accountability + financial stakes combined is the product's strongest hook. One person can invite friends, everyone stakes together, the losers pay the winners. This is immediately compelling and sharable.

---

## Priority 1: Group Session Firebase Backend (HIGH - Launch Blocker)

The `propose.tsx` screen and `groupSessionStore.ts` are fully built with local state. The missing pieces are real-time coordination and notifications so all participants see each other's status.

### Required Work

| #   | Task                          | What's Needed                                                                  |
| --- | ----------------------------- | ------------------------------------------------------------------------------ |
| 1   | Firebase write on proposal    | When proposer taps "Send," write a `groupSessions` doc to Firestore            |
| 2   | Push notification to invitees | APNs + Firebase Cloud Messaging -- invitees get a notification                 |
| 3   | Invite accept/decline flow    | Screen for invitees to see incoming proposals and accept                       |
| 4   | Real-time session listener    | All participants subscribe to the session doc via Firestore `onSnapshot`       |
| 5   | Session lifecycle sync        | When host starts session, all participants' local state updates via listener   |
| 6   | Payout/transfer calculation   | Wire real payout algorithm when session ends, sync results to all participants |

### Firestore Schema (proposed)

```
groupSessions/{sessionId}
  - hostUid: string
  - participantUids: string[]
  - status: "pending" | "active" | "complete"
  - cadence: "daily" | "weekly" | "monthly"
  - stakeAmount: number (cents)
  - startedAt: Timestamp | null
  - completedAt: Timestamp | null
  - results: { [uid]: { completed: boolean, screenTimeMinutes: number } }
  - transfers: Transfer[]

groupInvites/{inviteId}
  - sessionId: string
  - inviteeUid: string
  - inviterUid: string
  - status: "pending" | "accepted" | "declined"
  - createdAt: Timestamp
```

---

## Priority 2: Push Notifications (HIGH - Required for Group Sessions)

Group sessions are useless without push notifications. Invitees won't know they were invited. Session starts won't be coordinated.

### Setup Tasks

- [ ] Create APNs key in Apple Developer portal (already have entitlement)
- [ ] Configure Firebase Cloud Messaging (FCM) with APNs key
- [ ] Install `@react-native-firebase/messaging` or use Cloud Functions with APNs HTTP/2 API
- [ ] Store FCM device token on user's Firestore document on app start
- [ ] Implement Cloud Functions for:
  - Group session invite notification
  - Session starting soon reminder
  - Session complete / results notification

---

## Priority 3: Screen Time -- Custom Shield UX (HIGH - Product Differentiator)

### Vision (Updated)

Instead of silently hard-blocking apps, the goal is an **interactive surrender decision point**. When a user opens a restricted app during a focus session:

1. A **custom shield screen** appears (full-screen, replaces the blocked app at OS level)
2. The screen shows the **Niyah blob character** and a clear prompt
3. User has two choices:
   - **"Surrender"** -- ends the session, loses stake, unblocks all apps
   - **"Stay Focused"** -- dismisses the shield, returns user to previous context (home screen or NIYAH)

This is a moment of intentional friction -- not a punishment, but a pause that forces conscious decision-making.

### Technical Reality Check

**iOS does NOT allow injecting modals, overlays, or custom views inside another running app.** The only API-compliant way to show interactive UI when a user opens a blocked app is `ManagedSettings ShieldConfiguration` -- a full-screen system overlay that replaces the app's launch, with limited customizable fields:

- Custom icon (can show the Niyah blob as a PNG)
- Title and subtitle text
- Primary button (label + action) -- maps to "Surrender"
- Secondary button (label + action) -- maps to "Stay Focused"

The button actions fire in the `DeviceActivityMonitorExtension` (separate process). The extension records the choice and communicates back to the main app via shared App Groups `UserDefaults`.

### What This Is NOT

- NOT a full SwiftUI modal you design freely (the system renders the shield)
- NOT possible to show rich animations inside the shield
- NOT possible to overlay on top of the app without blocking it first

### Screen Time Session Design

The session model this enables is **deep work focus blocks**:

1. User starts a NIYAH session (solo or group)
2. Immediately after: FamilyActivityPicker opens -- user selects their distraction apps (Instagram, TikTok, etc.)
3. Session timer starts. ManagedSettings shields the selected apps.
4. If user tries to open a blocked app: Niyah shield appears with Surrender / Stay Focused
5. If user surrenders: extension records it, clears shields, session ends with stake deducted
6. If user stays focused: shield dismissed, user goes back to what they were doing
7. When timer completes normally: shields clear, session completes, stake returned

This is a focus block model (deep work windows), NOT always-on screen time limiting. That distinction is important -- this is about choosing to lock yourself in for a period, not limiting daily app usage.

### Remaining Milestones

| #   | Milestone                                    | Status     | What's Left                                                     |
| --- | -------------------------------------------- | ---------- | --------------------------------------------------------------- |
| 1   | Enable FamilyControls + App Groups on App ID | **Do now** | Apple Developer portal                                          |
| 2   | Swift module (all APIs)                      | **Done**   | requestAuthorization, picker, startBlocking, stopBlocking       |
| 3   | JS wrapper                                   | **Done**   | src/config/screentime.ts fully implemented                      |
| 4   | Config plugins                               | **Done**   | withScreenTimeEntitlement, withDeviceActivityMonitor            |
| 5   | Build new dev client                         | **Next**   | pnpm build:dev to compile native modules                        |
| 6   | Physical device validation                   | **Next**   | Test FamilyControls auth + app picker on real iPhone            |
| 7   | Session wiring                               | **Next**   | Call startBlocking()/stopBlocking() from sessionStore           |
| 8   | Shield button actions                        | **Next**   | Handle Surrender/Stay Focused in DeviceActivityMonitorExtension |
| 9   | ShieldConfigurationDataSource                | **Next**   | Custom App Extension target to provide shield UI config         |
| 10  | End-to-end integration                       | **Next**   | Full session -> block -> shield -> surrender/complete flow      |

### Key Apple Frameworks

| Framework       | Purpose                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| FamilyControls  | Authorization & privacy tokens for selecting apps/websites                         |
| ManagedSettings | Apply restrictions (shield apps, block content), ShieldConfiguration for custom UI |
| DeviceActivity  | Monitor usage & execute code on schedules/events, handle shield button actions     |

### Technical Notes

- DeviceActivityMonitor is an **App Extension** (separate build target). The `withDeviceActivityMonitor.js` config plugin handles injecting it into the Xcode project during `expo prebuild`.
- App Groups (`group.com.niyah.app`) enable data sharing between the main app and the extension (violation timestamps, blocking state, app selection, surrender decisions).
- All testing must be on a **physical iOS device**. The Screen Time API does not work in the iOS Simulator.
- A `ShieldConfigurationDataSource` extension (separate from `DeviceActivityMonitor`) is needed to return custom `ShieldConfiguration` objects. This is how apps like Opal customize the shield appearance.

---

## Priority 4: Solo Payout Reconciliation (MEDIUM)

`src/utils/payoutAlgorithm.ts` is fully implemented (solo: `SOLO_COMPLETION_MULTIPLIER × stake`, group: pool split with greedy transfer netting). However, `sessionStore.ts` still uses the stickK model (`potentialPayout = stake`, i.e. 1×). The two are inconsistent. Decision needed: keep stickK (stake-back) or wire the multiplier from `payoutAlgorithm.ts`.

The group formula from the original spec (using screen time data) is captured here for reference when real Screen Time data is available:

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

---

## Deferred Priorities

### Stripe Integration (IN PROGRESS → needs live mode enablement)

Client library, Cloud Functions, and UI screens are built. Trust model (virtual balances + Venmo/PayPal) is still active while `DEMO_MODE = true`.

- [x] Create Stripe account, start in test mode
- [x] Install `@stripe/stripe-react-native`
- [x] Build deposit flow with PaymentSheet (`app/session/deposit.tsx`)
- [x] Build payout/withdrawal flow (`app/session/withdraw.tsx`, `app/session/stripe-onboarding.tsx`)
- [x] Set up Firebase Cloud Functions for server-side (payment intents, webhooks) (`functions/src/index.ts`)
- [x] Stripe Connect Express for user-to-user transfers (`distributeGroupPayouts` Cloud Function)
- [ ] Enable live mode Stripe keys (`STRIPE_SECRET_KEY` secret in Firebase)
- [ ] End-to-end deposit/withdrawal test with real cards
- [ ] App Store review submission (payments category)

### Firebase Backend Hardening (FUTURE)

Firebase Auth and Firestore are working but some areas still use local state:

- [ ] Migrate session data from local Zustand to Firestore
- [ ] Migrate wallet/balance management to server-side (Cloud Functions)
- [ ] Cloud Functions for payout calculations, streak tracking
- [ ] Firestore security rules (currently permissive for dev)

### Onboarding Polish (LOW)

Scene components already exist in `src/components/onboarding/`. What remains is animation and transition work:

- [ ] Migrate animations from legacy `Animated` API to Reanimated (shared values, springs)
- [ ] Gesture-driven page transitions (swipe controls animation progress)
- [ ] Background color interpolation between pages
- [ ] Text fade/slide choreography
- [ ] Page snap with spring physics + haptic feedback
- [ ] Parallax depth layers on scene illustrations

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

---

## Contacts & Advisors

- **Legal guidance:** VAIL (Mark & Cat), Dr. White
- **Technical consulting:** 40AU (Logan & Andrew)

---

## Tooling Summary

| Tool                                | Role                                | Cost                 | Status                                        |
| ----------------------------------- | ----------------------------------- | -------------------- | --------------------------------------------- |
| Firebase (Auth + Firestore)         | Backend, auth, data                 | Free tier            | **Implemented** (custom native module)        |
| EAS Build                           | iOS/Android builds                  | Free tier            | **Configured and in use**                     |
| react-native-reanimated 4.1.6       | Animations, interpolations, springs | Free                 | Installed, partially used (onboarding)        |
| react-native-gesture-handler 2.28.0 | Pan/tap gesture tracking            | Free                 | Installed, used by router                     |
| expo-linear-gradient 15.0.8         | Gradient backgrounds                | Free                 | Installed, unused                             |
| react-native-svg 15.15.3            | SVG illustrations, timer ring       | Free                 | **In use**                                    |
| expo-haptics 15.0.8                 | Tactile feedback                    | Free                 | **In use**                                    |
| Jest + jest-expo 54.x               | Unit + integration testing          | Free                 | **Configured**                                |
| ESLint 9 + Prettier                 | Linting + formatting                | Free                 | **Configured**                                |
| Stripe                              | Payments (deposits, payouts, KYC)   | Per-transaction fees | **Integrated** (test mode, live keys pending) |
| Figma                               | Design illustrations, export SVGs   | Free                 | Ready                                         |
