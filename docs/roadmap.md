# Roadmap

> Development phases, current status, and blockers.
> See also: [Features](./features.md) | [Payments](./payments.md) | [Native Modules](./native-modules.md)

## Current Status (Apr 12, 2026)

| Area                     | Status    | Notes                                                                           |
| ------------------------ | --------- | ------------------------------------------------------------------------------- |
| Firebase Auth            | Done      | Google, Apple, Email magic link, Phone SMS OTP via RNFB                         |
| Firestore                | Done      | Profiles, wallets, follows, sessions. Crash recovery.                           |
| Solo Sessions (Backend)  | Done      | sessionStore + handleSessionComplete/Forfeit CFs. Full lifecycle.               |
| Solo Sessions (UI)       | Not Wired | Backend ready, needs UI wiring (~7.5h). Planned April 16-18.                    |
| Quick Block              | Done      | One-tap blocking without stake (`quick-block.tsx`)                              |
| Duo Sessions             | Done      | Partner store, lifecycle, Venmo deep links                                      |
| Group Sessions (UI)      | Done      | N-person, payout algorithm, transfer tracking, propose, waiting room, invites   |
| Group Sessions (Backend) | Done      | 7 Cloud Functions (create, invite, accept, start, report, cancel, auto-timeout) |
| Social Features          | Done      | Following/followers, public profiles, reputation (5 tiers)                      |
| Contact Discovery        | Done      | `findContactsOnNiyah` Cloud Function, cached in socialStore                     |
| Referral System          | Done      | Deep link invites, reputation boost, partner auto-connect                       |
| Theme System             | Done      | Dark/light via themeStore + useColors hook                                      |
| Onboarding               | Done      | Screen Time setup flow, blob scenes, profile setup                              |
| Testing                  | Done      | 1018 tests (48 suites), unit + integration coverage                             |
| Screen Time (Swift)      | Done      | Production-quality. Auth, picker, blocking, violation polling, custom shield.   |
| Screen Time (Shield)     | Done      | Custom Niyah-branded shield with "Stay Focused" / "Surrender" buttons           |
| Screen Time (Wiring)     | Done      | Quick-block and group session flows wired. Solo staked wiring pending.          |
| Screen Time (Stats)      | Post-demo | DeviceActivityReport deferred                                                   |
| Schedule Blocking        | Post-demo | scheduleStore, schedule-builder, calendar integration deferred                  |
| Push Notifications       | Done      | FCM token management, 9 notification types wired in Cloud Functions             |
| Stripe Payments          | Done      | 24 Cloud Functions, deposit/withdrawal/Connect Express/Plaid bank linking       |
| Legal Acceptance         | Done      | `acceptLegalTerms` Cloud Function, server-timestamped                           |
| Firestore Rules          | Done      | Hardened rules for users, wallets, follows, sessions. Default deny.             |
| Security Audit           | Done      | Server-side validation, rate limiting, SSL pinning, screen protection           |
| Firebase App Check       | Post-demo | Biggest remaining security gap. Planned for campus launch phase.                |
| Config Externalized      | Done      | Firebase config gitignored, env vars, keys rotated                              |
| Payout Algorithm         | Done      | Solo 1x (stickK model), group pool split with greedy transfer netting           |
| App Icon + Splash        | Done      | New pillow icon, green (#2D6A4F) splash screen                                  |
| Withdrawal Flow          | Done      | Stripe Express onboarding, polished UI, security disclaimer                     |

### Apple Developer Account

- [x] Apple Developer Program ($99) -- active
- [x] FamilyControls Development entitlement -- approved
- [x] FamilyControls Distribution entitlement -- approved 2026-04-09 for `com.niyah.app`
- [ ] FamilyControls Distribution for extensions -- submitted April 10, pending Apple review
  - `com.niyah.app.device-activity-monitor`
  - `com.niyah.app.shield-action`
  - `com.niyah.app.shield-config`

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
- [x] FCM push notifications (9 notification types)

## Launch Strategy

**Positioning**: Financial stakes + social accountability for focus. NOT "cheaper Opal." Unique intersection of commitment contracts (stickK model) + OS-level app blocking (FamilyControls).

**Revenue model**: Free now, subscription later ($3-5/mo for analytics + schedules).

1. **Phase 1** -- Demo Day (April 15) + Final Presentation (April 16)
2. **Phase 2** -- Solo Sessions (April 16-18)
3. **Phase 3** -- Campus Launch "Lock In For Finals" (April 19 - May 5)
4. **Phase 4** -- Post-Graduation Product Build (May 8+)
5. **Phase 5** -- Public Launch + Fundraise

## Phase 1: Demo Day (April 15-16)

**Goal**: Zero crashes during live demo. Group sessions with real money.

- Stabilize demo flow on physical device
- Deploy Cloud Functions with live keys
- E2E test deposit → session → shield → complete → withdrawal
- Test group session on 2+ devices
- Rehearse demo 3x
- Poster for Immersion Showcase (36x48, product-focused)

See [Sprint Plan](./sprint-april15.md) for detailed checklist.

## Phase 2: Solo Sessions (April 16-18)

**Goal**: Any user can stake money alone on day 1. Removes chicken-and-egg problem.

~7.5 hours of UI wiring. Backend + Cloud Functions already 100% built.

- Add "Solo Focus" entry on Session tab
- Wire select → confirm → active → complete/surrender for solo staked mode
- Read from `sessionStore` instead of `groupSessionStore` for solo
- Test full lifecycle: stake → block → complete/surrender → payout/forfeit

## Phase 3: Campus Launch (April 19 - May 5)

**"Lock In For Finals"** — targeting Vanderbilt students during finals season.

- **Hard blocker**: Extension entitlements must be approved for TestFlight distribution
- Posters/flyers with QR code to TestFlight
- Promo: "Complete 5 sessions with friends → earn $5 free" ($100 pool, 4 teammates × $25)
- Firebase App Check implementation (safe post-demo with new native build)
- Crash monitoring (Sentry)
- Analytics: DAU, completion rate, avg stake, retention
- Target: 50+ active users with measurable retention

## Phase 4: Post-Graduation Product (May 8+)

Priority order:

1. Schedule-based blocking (DeviceActivitySchedule API) — compete with Opal on features
2. DeviceActivityReport analytics — screen time statistics, trends, streaks
3. Custom in-app KYC — replace Stripe Express with native verification
4. Plant social credit system — plant health = app habit score
5. Interactive blob maker — pick shape, color, expression
6. Subscription tier — $3-5/mo for analytics + schedules
7. Android investigation — different blocking API (AccessibilityService / UsageStatsManager)

## Phase 5: Public Launch + Fundraise

- App Store public release
- Pitch deck with real campus metrics (DAU, retention, completion rate)
- Unit economics model (CAC, LTV, take rate from forfeited stakes)
- Competitive positioning deck
- Legal compliance review for additional states

## Blockers

| Blocker                                    | Impact                                                            | Resolution                                                             | Status             |
| ------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------ |
| ~~FamilyControls Development entitlement~~ | ~~Cannot test Screen Time on device~~                             | ~~Apply in Apple Developer portal~~                                    | **Resolved**       |
| ~~FamilyControls Distribution (main app)~~ | ~~Cannot distribute via TestFlight/App Store~~                    | ~~Apple approved 2026-04-09~~                                          | **Resolved**       |
| FamilyControls Distribution (3 extensions) | Extensions may not work in TestFlight builds                      | Submit for `device-activity-monitor`, `shield-action`, `shield-config` | Submitted April 10 |
| ~~Shield surrender desync bug~~            | ~~Shield unblocks apps but Niyah app still shows session active~~ | ~~Fixed: shield sets flag + opens app, JS listener catches it~~        | **Resolved**       |
| Firebase App Check                         | Anyone with project ID can call Cloud Functions                   | Firebase Console setup + code changes. Planned for campus launch.      | Post-demo          |
| Stripe bank verification                   | Withdrawal demo may fail if micro-deposits not cleared            | Verify bank by April 14, or demo UI only                               | Pending            |
