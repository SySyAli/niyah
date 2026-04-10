# Roadmap

> Development phases, current status, and blockers.
> See also: [Features](./features.md) | [Payments](./payments.md) | [Native Modules](./native-modules.md)

## Current Status (Apr 2026)

| Area                     | Status      | Notes                                                                           |
| ------------------------ | ----------- | ------------------------------------------------------------------------------- |
| Firebase Auth            | Done        | Google, Apple, Email magic link, Phone SMS OTP via RNFB                         |
| Firestore                | Done        | Profiles, wallets, follows, sessions. Crash recovery.                           |
| Solo Sessions            | Done        | Cadence, stake, timer, surrender/complete. Firestore persistence.               |
| Quick Block              | Done        | One-tap blocking without stake (`quick-block.tsx`)                              |
| Duo Sessions             | Done        | Partner store, lifecycle, Venmo deep links                                      |
| Group Sessions (UI)      | Done        | N-person, payout algorithm, transfer tracking, propose, waiting room, invites   |
| Group Sessions (Backend) | Done        | 7 Cloud Functions (create, invite, accept, start, report, cancel, auto-timeout) |
| Social Features          | Done        | Following/followers, public profiles, reputation (5 tiers)                      |
| Contact Discovery        | Done        | `findContactsOnNiyah` Cloud Function, cached in socialStore                     |
| Referral System          | Done        | Deep link invites, reputation boost, partner auto-connect                       |
| Theme System             | Done        | Dark/light via themeStore + useColors hook                                      |
| Onboarding               | Done        | Screen Time setup flow, blob scenes, profile setup                              |
| JITAI Module             | Removed     | Was simulation-only, never wired into app. Deleted Apr 2026.                    |
| Testing                  | Done        | 1018 tests (48 suites), unit + integration coverage                             |
| Screen Time (Swift)      | Done        | Production-quality. Auth, picker, blocking, violation polling, custom shield.   |
| Screen Time (Shield)     | Done        | Custom Niyah-branded shield with "Stay Focused" / "Surrender" buttons           |
| Screen Time (Wiring)     | In Progress | Quick-block wired. Full session lifecycle wiring pending.                       |
| Screen Time (Stats)      | Not Started | DeviceActivityReport not imported                                               |
| Schedule Blocking        | Not Started | scheduleStore, schedule-builder, calendar integration (sprint planned)          |
| Push Notifications       | In Progress | FCM messaging installed, token management scaffolded, wiring pending            |
| Stripe Payments          | Done        | 24 Cloud Functions deployed, deposit/withdrawal/KYC/Plaid bank linking          |
| Legal Acceptance         | Done        | `acceptLegalTerms` Cloud Function, server-timestamped                           |
| Firestore Rules          | Done        | Hardened rules for users, wallets, follows, sessions. Default deny.             |
| Security Audit           | Done        | Server-side validation, rate limiting, SSL pinning, screen protection           |
| Config Externalized      | Done        | Firebase config gitignored, env vars, keys rotated                              |
| Payout Algorithm         | Done        | Solo 2x multiplier, group pool split. Not yet wired to solo store.              |

### Apple Developer Account

- [x] Apple Developer Program ($99) -- active
- [ ] FamilyControls Development entitlement -- **BLOCKER for Phase 1**
- [ ] FamilyControls Distribution entitlement -- requires Apple approval (2-4 weeks)

### Firebase Project

- [x] Firebase project with Auth + Firestore
- [x] 24 Cloud Functions deployed (Stripe, Plaid, session lifecycle, group sessions, social, legal, webhook)
- [x] Firestore security rules hardened and ready to deploy
- [x] Cloud Functions for group sessions (7 functions: create, invite, accept, start, report, cancel, auto-timeout)
- [ ] FCM push notification wiring (messaging package installed, token management scaffolded)

## Launch Strategy

**Group Mode first, free trial (real stakes, no Niyah cut), then solo payout model later.**

Social accountability + financial stakes is the strongest hook. One person invites friends, everyone stakes, completers split the losers' pool.

1. **Phase 1** -- Group Mode MVP (4-person internal test)
2. **Phase 2** -- Beta Cohort (campus launch, 20-100 users, Stripe escrow)
3. **Phase 3** -- Public Launch (App Store)

## Phase 1: Group Mode MVP

**Goal**: 4 developers can create, join, and complete group focus sessions with real stakes, app blocking, and automated settlement.

### 1.1 Group Session Firebase Backend

The `propose.tsx` screen and `groupSessionStore.ts` are built with local state. Missing: multi-user coordination.

**Tasks**: Firestore schema + rules for `groupSessions`/`groupInvites`, Cloud Functions (`createGroupSession`, `joinGroupSession`, `recordParticipantResult`, `completeGroupSession`), real-time listeners, wire `propose.tsx` to backend, incoming invites screen, group dashboard.

**Firestore schema**: see [Payments > Group Settlement](./payments.md#group-payout-formula).

### 1.2 Push Notifications (FCM)

- Create APNs key, configure FCM
- Install `@react-native-firebase/messaging`
- Store FCM device tokens in Firestore
- Cloud Function triggers: invite, all-accepted, complete, settlement reminder

### 1.3 Screen Time Blocking

Wire existing module into session lifecycle. **Blocking only** -- statistics deferred to Phase 2.

1. Enable FamilyControls entitlement on App ID (**BLOCKER**)
2. Re-enable extension embed in `withDeviceActivityMonitor.js`
3. Build new dev client
4. Physical device validation
5. Call `startBlocking()` from session start
6. Call `stopBlocking()` from session complete/surrender
7. Subscribe to `onShieldViolation` in session store

### 1.4 Settlement Model

Honor-based with Venmo deep links. Stripe escrow deferred to Phase 2.

## Phase 2: Beta Cohort

**Goal**: Campus launch with real Stripe payments, screen time stats, polished group UX.

- Stripe escrow flow (collect stakes upfront, auto-distribute payouts)
- Screen Time statistics (`DeviceActivityReport` bridging)
- Custom shield UX (`ShieldConfigurationDataSource` + `ShieldActionExtension`)
- Solo payout model decision (stickK 1x vs multiplier 2x)
- Group settlement dashboard
- App Store review preparation

See [Payments](./payments.md) and [Native Modules > Planned Shield UX](./native-modules.md#planned-shield-ux).

## Phase 3: Public Launch

**Goal**: Production-ready App Store release.

- Stripe live mode, end-to-end payment testing
- FamilyControls Distribution entitlement (Apple approval)
- Firebase App Check (see [Security](./security.md#remaining-security-work))
- Error monitoring (Sentry or Firebase Crashlytics)
- Legal compliance (see [Legal](./legal.md))
- Onboarding animation polish, performance optimization

## Blockers

| Blocker                                | Impact                                                         | Resolution                                                  |
| -------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| FamilyControls Development entitlement | Cannot test Screen Time on device                              | Apply in Apple Developer portal                             |
| Screen Time statistics                 | `DeviceActivityReport` is a SwiftUI view API, not a data query | Evaluate `UIHostingController` bridge or extension approach |
| Firebase App Check                     | Anyone with project ID can call Cloud Functions                | Firebase Console setup + code changes                       |
