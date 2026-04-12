# Roadmap

> Development phases, current status, and blockers.
> See also: [Features](./features.md) | [Payments](./payments.md) | [Native Modules](./native-modules.md)

## Current Status (Apr 2026)

| Area                     | Status       | Notes                                                                           |
| ------------------------ | ------------ | ------------------------------------------------------------------------------- |
| Firebase Auth            | Done         | Google, Apple, Email magic link, Phone SMS OTP via RNFB                         |
| Firestore                | Done         | Profiles, wallets, follows, sessions. Crash recovery.                           |
| Solo Sessions            | Done         | Cadence, stake, timer, surrender/complete. Firestore persistence.               |
| Quick Block              | Done         | One-tap blocking without stake (`quick-block.tsx`)                              |
| Duo Sessions             | Done         | Partner store, lifecycle, Venmo deep links                                      |
| Group Sessions (UI)      | Done         | N-person, payout algorithm, transfer tracking, propose, waiting room, invites   |
| Group Sessions (Backend) | Done         | 7 Cloud Functions (create, invite, accept, start, report, cancel, auto-timeout) |
| Social Features          | Done         | Following/followers, public profiles, reputation (5 tiers)                      |
| Contact Discovery        | Done         | `findContactsOnNiyah` Cloud Function, cached in socialStore                     |
| Referral System          | Done         | Deep link invites, reputation boost, partner auto-connect                       |
| Theme System             | Done         | Dark/light via themeStore + useColors hook                                      |
| Onboarding               | Done         | Screen Time setup flow, blob scenes, profile setup                              |
| JITAI Module             | Removed      | Was simulation-only, never wired into app. Deleted Apr 2026.                    |
| Testing                  | Done         | 1018 tests (48 suites), unit + integration coverage                             |
| Screen Time (Swift)      | Done         | Production-quality. Auth, picker, blocking, violation polling, custom shield.   |
| Screen Time (Shield)     | Done         | Custom Niyah-branded shield with "Stay Focused" / "Surrender" buttons           |
| Screen Time (Wiring)     | In Progress  | Quick-block wired. Full session lifecycle wiring pending.                       |
| Screen Time (Stats)      | Cut for demo | DeviceActivityReport deferred post-demo                                         |
| Schedule Blocking        | Cut for demo | scheduleStore, schedule-builder, calendar integration deferred post-demo        |
| Push Notifications       | Done         | FCM token management, 9 notification types wired in Cloud Functions             |
| Stripe Payments          | Done         | 24 Cloud Functions deployed, deposit/withdrawal/KYC/Plaid bank linking          |
| Legal Acceptance         | Done         | `acceptLegalTerms` Cloud Function, server-timestamped                           |
| Firestore Rules          | Done         | Hardened rules for users, wallets, follows, sessions. Default deny.             |
| Security Audit           | Done         | Server-side validation, rate limiting, SSL pinning, screen protection           |
| Config Externalized      | Done         | Firebase config gitignored, env vars, keys rotated                              |
| Payout Algorithm         | Done         | Solo 2x multiplier, group pool split. Not yet wired to solo store.              |

### Apple Developer Account

- [x] Apple Developer Program ($99) -- active
- [x] FamilyControls Development entitlement -- approved
- [x] FamilyControls Distribution entitlement -- approved 2026-04-09 for `com.niyah.app`
- [ ] FamilyControls Distribution for extensions -- submit ASAP for `device-activity-monitor`, `shield-action`, `shield-config`

### Business & Payments (as of 2026-04-10)

- [x] Niyah, Inc. incorporated with EIN
- [x] Stripe live mode -- business account active, live API keys available
- [x] Plaid production -- approved, pay-as-you-go ($1.50/initial Link call)
- [x] Landing page live at niyah.live
- [ ] Live keys deployed to .env + Firebase Secret Manager
- [ ] Stripe production webhook endpoint configured

### Firebase Project

- [x] Firebase project with Auth + Firestore
- [x] 24 Cloud Functions deployed (Stripe, Plaid, session lifecycle, group sessions, social, legal, webhook)
- [x] Firestore security rules hardened and ready to deploy
- [x] Cloud Functions for group sessions (7 functions: create, invite, accept, start, report, cancel, auto-timeout)
- [x] FCM push notifications (9 notification types: group invite, accept, decline, ready, start, surrender, complete, violation, cancel)

## Launch Strategy

**Group Mode first, free trial (real stakes, no Niyah cut), then solo payout model later.**

Social accountability + financial stakes is the strongest hook. One person invites friends, everyone stakes, completers split the losers' pool.

1. **Phase 1** -- Group Mode MVP (4-person internal test)
2. **Phase 2** -- Beta Cohort (campus launch, 20-100 users, Stripe escrow)
3. **Phase 3** -- Public Launch (App Store)

## Phase 1: Group Mode MVP

**Goal**: 4 developers can create, join, and complete group focus sessions with real stakes, app blocking, and automated settlement.

### 1.1 Group Session Firebase Backend -- DONE

7 Cloud Functions deployed: `createGroupSession`, `respondToGroupInvite`, `markOnlineForSession`, `startGroupSession`, `reportShieldViolation`, `cancelGroupSession`, `autoTimeoutGroupSessions`. Plus `distributeGroupPayouts` for settlement. Real-time Firestore listeners wired in `groupSessionStore.ts`.

### 1.2 Push Notifications (FCM) -- DONE

FCM fully wired: token management, foreground/background handlers, 9 notification types (group invite, accept, decline, ready, start, surrender, complete, violation, cancel). Deep link navigation from notifications to appropriate screens.

### 1.3 Screen Time Blocking -- DONE

FamilyControls entitlement approved. Quick-block and group session flows call `startBlocking()`/`stopBlocking()`. Shield violation events subscribed in `active.tsx`. Custom Niyah-branded shield with "Stay Focused" / "Surrender Session" buttons.

### 1.4 Settlement Model -- DONE

Stripe escrow: stakes collected upfront via Cloud Functions, server-side payout distribution on session complete. Plaid bank linking for withdrawals.

## Phase 2: Beta Cohort

**Goal**: Campus launch with real Stripe payments, screen time stats, polished group UX.

- Stripe escrow flow (collect stakes upfront, auto-distribute payouts)
- Screen Time statistics (`DeviceActivityReport` bridging)
- Custom shield UX (`ShieldConfigurationDataSource` + `ShieldActionExtension`)
- Solo payout model decision (stickK 1x vs multiplier 2x)
- Group settlement dashboard
- App Store review preparation

See [Payments](./payments.md) and [Native Modules > Custom Shield UX](./native-modules.md#custom-shield-ux).

## Phase 3: Public Launch

**Goal**: Production-ready App Store release.

- Stripe live mode, end-to-end payment testing
- FamilyControls Distribution entitlement (Apple approval)
- Firebase App Check (see [Security](./security.md#remaining-security-work))
- Error monitoring (Sentry or Firebase Crashlytics)
- Legal compliance (see [Legal](./legal.md))
- Onboarding animation polish, performance optimization

## Blockers

| Blocker                                    | Impact                                                            | Resolution                                                             | Status        |
| ------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------- |
| ~~FamilyControls Development entitlement~~ | ~~Cannot test Screen Time on device~~                             | ~~Apply in Apple Developer portal~~                                    | **Resolved**  |
| ~~FamilyControls Distribution (main app)~~ | ~~Cannot distribute via TestFlight/App Store~~                    | ~~Apple approved 2026-04-09~~                                          | **Resolved**  |
| FamilyControls Distribution (3 extensions) | Extensions may not work in TestFlight builds                      | Submit for `device-activity-monitor`, `shield-action`, `shield-config` | Submit Apr 10 |
| ~~Shield surrender desync bug~~            | ~~Shield unblocks apps but Niyah app still shows session active~~ | ~~Fixed: shield sets flag + opens app, JS listener catches it~~        | **Resolved**  |
| Screen Time statistics                     | `DeviceActivityReport` is a SwiftUI view API, not a data query    | Deferred post-demo                                                     | Cut for demo  |
| Firebase App Check                         | Anyone with project ID can call Cloud Functions                   | Firebase Console setup + code changes                                  | Post-demo     |
