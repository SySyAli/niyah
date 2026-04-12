# Features

> Core app features and their implementation.
> See also: [Architecture](./architecture.md) | [Payments](./payments.md) | [Native Modules](./native-modules.md)

## Authentication

Four sign-in methods, all backed by Firebase Auth:

1. **Google Sign-In** -- native dialog via `@react-native-google-signin/google-signin`
2. **Apple Sign-In** -- native via `expo-apple-authentication` with nonce
3. **Email Magic Link** -- passwordless email link via Firebase
4. **Phone SMS OTP** -- Firebase phone auth with SMS verification code

**Flow**: `auth-entry.tsx` -> (phone: `phone-entry.tsx` -> `verify-phone.tsx`) -> (if new user) `profile-setup.tsx` -> `screentime-setup.tsx` -> tabs

Auth state managed by `authStore.ts`, which listens to Firebase `onAuthStateChanged` and hydrates user data from Firestore.

**Key files**: `src/config/firebase.ts` (auth helpers), `src/store/authStore.ts`, `app/(auth)/`

## Session Modes

### Solo Session

**Store**: `sessionStore.ts` | **Screens**: `app/session/`

1. User selects cadence (Daily/Weekly/Monthly)
2. User confirms stake amount
3. Session starts, timer counts down
4. User can "surrender" early (lose stake) or complete (get stake back)

Sessions persist to Firestore `sessions` collection with crash recovery via `recoverActiveSession`. Cloud Function calls gated behind `DEMO_MODE`.

### Quick Block (Solo, No Stake)

**Screen**: `app/session/quick-block.tsx`

One-tap app blocking without money. User picks a duration (25 min / 1 hr / 2 hr / 4 hr / Until tonight), taps "Block Apps", and selected apps are shielded immediately. Reuses the active session timer view. Part of the April 15 sprint rearchitecture toward schedule-based blocking.

### Duo Session

**Store**: `partnerStore.ts` | **Screen**: `app/session/partner.tsx`

1. User selects a partner from their partner list
2. Both stake the same amount
3. Loser pays winner (settled via Venmo deep links outside app)

### Group Session

**Store**: `groupSessionStore.ts` | **Screen**: `app/session/propose.tsx`

1. Proposer creates session, selects stake amount and invites friends
2. Invitees accept (stake deducted) or decline
3. All participants mark online in waiting room, proposer starts session
4. Screen Time blocking activates on all devices, live leaderboard tracks progress
5. On complete: server-side payout distribution splits losers' pool among completers
6. 9 FCM push notification types for real-time group coordination

**Status**: Full stack complete — 7 Cloud Functions deployed, real-time Firestore listeners, Stripe escrow, custom shield blocking.

## Wallet & Transactions

**Store**: `walletStore.ts` | **Screens**: `deposit.tsx`, `withdraw.tsx`

- Virtual balance tracked in cents
- Transaction types: `deposit`, `withdrawal`, `stake`, `payout`, `forfeit`, `settlement_paid`, `settlement_received`
- Demo mode starts with $50 balance (`INITIAL_BALANCE`)
- Non-demo mode hydrates from Firestore `wallets/{uid}`

See [Payments](./payments.md) for Stripe integration and payout formulas.

## Social Features

**Store**: `socialStore.ts` | **Screens**: `app/(tabs)/friends.tsx`, `app/user/[uid].tsx`

- **Following/Followers** -- backed by Firestore `userFollows` collection
- **Public Profiles** -- view other users' stats and reputation
- **Contacts Integration** -- `expo-contacts` for friend discovery via `findContactsOnNiyah` Cloud Function, cached in `socialStore` with 5-min staleness check

### Reputation System

5 tiers based on payment reliability + referral bonuses:

| Tier    | Score Range |
| ------- | ----------- |
| Seed    | 0-20        |
| Sprout  | 21-40       |
| Sapling | 41-60       |
| Tree    | 61-80       |
| Oak     | 81-100      |

### Referral System

- Deep link invites via `app/invite.tsx`
- Reputation boost for both inviter and invitee
- Partner auto-connect on referral acceptance

## Theme System

**Store**: `themeStore.ts` | **Hook**: `useColors()`

- Dark/light theme persisted to AsyncStorage
- Colors defined in `src/constants/colors.ts` (`DarkColors`, `LightColors`)
- Access via `useColors()` hook which returns `ThemeColors`

## Demo Mode

Controlled by env var (`EXPO_PUBLIC_DEMO_MODE=true`):

| Area        | Behavior                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Auth        | Real Firebase authentication (Google, Apple, Email, Phone)                                                                           |
| Profile     | Real Firestore persistence (reads + writes)                                                                                          |
| Sessions    | Short timers (10s daily, 60s weekly, 90s monthly). Persisted to Firestore with crash recovery. Cloud Function calls skipped.         |
| Wallet      | Starts at $50. Non-demo hydrates from Firestore.                                                                                     |
| Screen Time | Module production-quality, onboarding flow built (`screentime-setup.tsx`), quick-block wired. Full session lifecycle wiring pending. |
| Payments    | Trust model (virtual balances, settle outside app)                                                                                   |

## Trust Model (Current)

Instead of real payments:

1. Users see virtual balance in-app
2. Duo/group settlements tracked with transfer status
3. Venmo deep links generated for actual money transfer
4. Reputation system tracks payment reliability

Trust model active while `DEMO_MODE = true`. Real Stripe escrow planned for [Phase 2](./roadmap.md#phase-2-beta-cohort).
