# NIYAH - Project Guide

## Overview

NIYAH is a focus app with financial stakes. Users deposit money, stake it on focus sessions, and earn more than they staked for successful completion. Quit early = lose your stake.

**Problem**: People struggle with phone addiction, spending 7+ hours daily on distracting apps. Existing solutions fail because there are no real consequences for failure.

**Solution**: When checking Instagram costs you $5, behavior changes in ways willpower alone cannot achieve.

## Tech Stack

- **Framework**: React Native 0.81 + Expo SDK 54 (New Architecture enabled)
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router (file-based routing, typed routes)
- **State Management**: Zustand
- **Styling**: React Native StyleSheet, SF Pro Rounded (iOS)
- **Build**: EAS Build (production), `expo-dev-client` (development) -- NOT Expo Go
- **Backend**: Firebase Auth + Firestore via custom native Swift Expo module (`modules/niyah-firebase/`)
- **Auth**: Google Sign-In, Apple Sign-In, Email magic link (passwordless)
- **Testing**: Vitest (unit + integration)
- **Linting**: ESLint 9 + Prettier
- **Package Manager**: pnpm
- **Payments**: Trust model (virtual balances, Venmo/PayPal settlement outside app). Stripe planned but not integrated.

## Project Structure

```
niyah/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx             # Root layout (Firebase auth listener, font loading)
│   ├── index.tsx               # Entry point (redirects to auth or tabs)
│   ├── invite.tsx              # Referral/invite screen
│   ├── (auth)/                 # Unauthenticated screens
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx         # Onboarding/welcome screen
│   │   ├── auth-entry.tsx      # Sign-in options (Google, Apple, Email)
│   │   ├── check-email.tsx     # Magic link email verification
│   │   └── profile-setup.tsx   # First-time profile completion
│   ├── (tabs)/                 # Main app tabs (authenticated)
│   │   ├── _layout.tsx         # Tab bar layout (AnimatedTabBar)
│   │   ├── index.tsx           # Dashboard/Home
│   │   ├── session.tsx         # Start new session
│   │   ├── friends.tsx         # Friends list, social features
│   │   └── profile.tsx         # User profile & settings
│   ├── session/                # Session flow (stack navigation)
│   │   ├── _layout.tsx
│   │   ├── select.tsx          # Select cadence (daily/weekly/monthly)
│   │   ├── confirm.tsx         # Confirm stake
│   │   ├── active.tsx          # Active session with timer
│   │   ├── surrender.tsx       # Surrender confirmation
│   │   ├── complete.tsx        # Session complete celebration
│   │   ├── partner.tsx         # Partner/duo session flow
│   │   ├── deposit.tsx         # Deposit funds
│   │   └── withdraw.tsx        # Withdraw funds
│   └── user/                   # User profile routes
│       └── [uid].tsx           # Public user profile (dynamic route)
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── index.ts            # Barrel export
│   │   ├── AnimatedTabBar.tsx   # Custom animated tab bar
│   │   ├── AppleSignInButton.tsx
│   │   ├── Balance.tsx         # Balance display
│   │   ├── Button.tsx          # Primary button component
│   │   ├── Card.tsx            # Card container
│   │   ├── Confetti.tsx        # Celebration animation
│   │   ├── GoogleSignInButton.tsx
│   │   ├── MoneyPlant.tsx      # Money plant visualization (partner network)
│   │   ├── NumPad.tsx          # Numeric input pad
│   │   ├── OTPInput.tsx        # OTP/code input
│   │   ├── Timer.tsx           # Countdown timer with SVG ring
│   │   └── onboarding/         # Onboarding scene components
│   │       ├── index.ts
│   │       ├── BlobsScene.tsx       # SVG blob characters
│   │       ├── ContinuousScene.tsx
│   │       ├── DebugLayoutEditor.tsx
│   │       ├── GardenScene.tsx
│   │       ├── GrowthScene.tsx
│   │       ├── Onboarding2Scene.tsx
│   │       ├── Onboarding3Scene.tsx
│   │       ├── ShieldScene.tsx
│   │       └── StakeScene.tsx
│   ├── config/
│   │   └── firebase.ts         # Firebase helpers (auth, Firestore, social)
│   ├── context/
│   │   └── ScrollContext.tsx    # Shared scroll context
│   ├── store/                  # Zustand state stores
│   │   ├── authStore.ts        # Auth state, Firebase user, profile
│   │   ├── sessionStore.ts     # Solo session lifecycle
│   │   ├── walletStore.ts      # Balance, transactions, settlements
│   │   ├── partnerStore.ts     # Partner relationships, duo sessions
│   │   ├── groupSessionStore.ts # N-person group sessions, transfers
│   │   └── socialStore.ts      # Following/followers, public profiles
│   ├── hooks/
│   │   └── useCountdown.ts     # Countdown timer hook
│   ├── jitai/                  # JITAI adaptive intervention engine
│   │   ├── index.ts            # Barrel export
│   │   ├── types.ts            # JITAI type definitions
│   │   ├── usageDetector.ts    # Simulated usage episode detection
│   │   ├── contextClassifier.ts # Context feature extraction & classification
│   │   ├── interventionEngine.ts # Multi-armed bandit intervention selection
│   │   └── humanFeedbackLoop.ts  # Feedback processing & adaptation
│   ├── types/
│   │   ├── index.ts            # All app type definitions
│   │   └── test-declarations.d.ts
│   ├── constants/
│   │   ├── colors.ts           # Colors, Spacing, Typography, Font, Radius
│   │   └── config.ts           # Cadences, demo mode, reputation, payment info
│   ├── utils/
│   │   ├── format.ts           # Formatting utilities
│   │   └── payoutAlgorithm.ts  # Group payout calculation (placeholder even-split)
│   ├── __tests__/              # Test suites
│   │   ├── integration/        # Integration tests (session flows)
│   │   └── unit/               # Unit tests (components, hooks, store, utils)
│   └── __mocks__/              # Test mocks
│       └── react-native.ts
├── modules/
│   └── niyah-firebase/         # Custom native Expo module for Firebase
│       ├── expo-module.config.json
│       ├── package.json
│       ├── NiyahFirebase.podspec
│       ├── index.ts
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── NiyahFirebaseAuthModule.ts
│       │   └── NiyahFirestoreModule.ts
│       └── ios/
│           ├── NiyahFirebaseAuthModule.swift   # Firebase Auth bridge
│           └── NiyahFirestoreModule.swift       # Firestore bridge
├── plugins/                    # Expo config plugins
│   ├── withFollyCoroutinesFix.js
│   ├── withGoogleServicesPlist.js
│   └── withFirebaseStaticFrameworks.js
├── scripts/
│   ├── print-dev-url.js
│   └── wsl_dev_setup.ps1
├── assets/                     # Images, fonts, etc.
├── CLAUDE.md                   # This file
├── ROADMAP.md                  # Project roadmap & planning
├── app.json                    # Expo config
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── eslint.config.mjs
```

## Development Commands

```bash
# Install dependencies (use pnpm, not npm)
pnpm install

# Start development server (requires dev client build)
pnpm start
# or: npx expo start --dev-client

# Start with iOS simulator
pnpm ios

# Start with Android emulator
pnpm android

# Clear cache and start
npx expo start --clear

# Type check
pnpm typecheck
# or: npx tsc --noEmit

# Run tests
pnpm test              # Run all tests once
pnpm test:watch        # Watch mode
pnpm test:integration  # Integration tests only
pnpm test:unit         # Unit tests only

# Lint & format
pnpm lint
pnpm lint:fix
pnpm format

# Full CI check
pnpm ci                # lint + typecheck + test

# Build dev client (required before first `pnpm start`)
pnpm build:dev         # iOS dev build via EAS
pnpm build:dev:android # Android dev build via EAS
```

**Important**: This project uses `expo-dev-client`, NOT Expo Go. You must build a dev client first (`pnpm build:dev`) before running `pnpm start`. The native Firebase module and other native dependencies require a custom build.

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
- Use constants from `src/constants/colors.ts` for colors, spacing, typography
- Follow 8px spacing grid (`Spacing.xs/sm/md/lg/xl/xxl`)
- Use `Font.regular/medium/semibold/bold/heavy` for font styles (SF Pro Rounded on iOS)

### State Management (Zustand)

- One store per domain: `authStore`, `sessionStore`, `walletStore`, `partnerStore`, `groupSessionStore`, `socialStore`
- Keep stores flat, avoid nesting
- Stores call each other directly (e.g., `useWalletStore.getState().deductStake()`)
- Persist critical state to AsyncStorage

### Navigation (Expo Router)

- File-based routing in `/app` directory
- Use groups `(groupName)` for layouts
- Use `router.push()` for navigation
- Use `router.replace()` for auth redirects
- Typed routes enabled (`experiments.typedRoutes: true`)

### Native Modules

- Custom Expo modules live in `modules/` directory
- Swift for iOS, bridged via ExpoModulesCore
- Module config in `expo-module.config.json`
- Referenced in `app.json` via `nativeModulesDir: "modules"`

## Core Features

### Authentication (Implemented)

Three sign-in methods, all backed by Firebase Auth:

1. **Google Sign-In** - Native dialog via `@react-native-google-signin/google-signin`
2. **Apple Sign-In** - Native via `expo-apple-authentication` with nonce
3. **Email Magic Link** - Passwordless email link via Firebase

Post-auth flow: `auth-entry.tsx` -> (if new user) `profile-setup.tsx` -> tabs

Auth state is managed by `authStore.ts` which listens to Firebase `onAuthStateChanged` and hydrates user data from Firestore.

### Session Modes

**Solo Session** (`sessionStore.ts`):

1. User selects cadence (Daily/Weekly/Monthly)
2. User confirms stake amount
3. Session starts, timer counts down
4. User can "surrender" early (lose stake) or complete (get stake back)

**Duo Session** (`partnerStore.ts`):

1. User selects a partner from their partner list
2. Both stake the same amount
3. Loser pays winner their stake (settled via Venmo outside app)

**Group Session** (`groupSessionStore.ts`):

1. N participants each stake the same amount
2. Payout algorithm distributes pool based on results
3. Transfer tracking with status flow: pending -> payment_indicated -> settled
4. Venmo deep links for settlement

### Wallet & Transactions (`walletStore.ts`)

- Virtual balance in cents
- Transaction types: deposit, withdrawal, stake, payout, forfeit, settlement_paid, settlement_received
- Demo mode starts with $50 balance

### Social Features

- **Following/Followers** (`socialStore.ts`) - Backed by Firestore `userFollows` collection
- **Public Profiles** (`app/user/[uid].tsx`) - View other users' stats and reputation
- **Reputation System** - 5 tiers: seed (0-20) -> sprout (21-40) -> sapling (41-60) -> tree (61-80) -> oak (81-100). Score based on payment reliability + referral bonuses.
- **Referral System** - Deep link invites, referrer gets reputation boost, new user gets partner connection
- **Contacts Integration** - `expo-contacts` for finding friends

### Payout Structure

| Cadence | Stake | Model                                                      |
| ------- | ----- | ---------------------------------------------------------- |
| Daily   | $5    | stickK model: complete = get stake back, fail = lose stake |
| Weekly  | $25   | Same                                                       |
| Monthly | $100  | Same                                                       |

**Note**: The current payout algorithm (`src/utils/payoutAlgorithm.ts`) is a placeholder that returns even splits. The real algorithm needs to be implemented.

### Trust Model (Current)

Instead of real payments:

1. Users see virtual balance in-app
2. Duo/group settlements tracked with transfer status
3. Venmo deep links generated for actual money transfer
4. Reputation system tracks payment reliability

## Demo Mode

Currently active (`DEMO_MODE = true` in `src/constants/config.ts`):

- **Auth**: Real Firebase authentication (Google, Apple, Email)
- **Profile**: Real Firestore persistence
- **Sessions**: Local mock data, short timer durations (10s daily, 60s weekly, 90s monthly)
- **Wallet**: Local state with $50 starting balance
- **Screen Time blocking**: NOT implemented -- no real app blocking yet
- **Payments**: Trust model (virtual balances, settle outside app)

## Native Modules

### `modules/niyah-firebase/`

Custom Expo module bridging Firebase to JavaScript:

- **NiyahFirebaseAuthModule** (Swift): Sign-in with Google/Apple credentials, email magic link, auth state listener, sign-out
- **NiyahFirestoreModule** (Swift): getDoc, setDoc, updateDoc, deleteDoc with server timestamp support

Firebase is configured via `GoogleService-Info.plist` (iOS) injected by the `withGoogleServicesPlist` plugin.

### Future: `modules/niyah-screentime/` (Not yet built)

Will bridge iOS Screen Time API (FamilyControls, ManagedSettings, DeviceActivity) to detect and block app usage during sessions. This is the primary next technical milestone. See ROADMAP.md.

## JITAI Module (`src/jitai/`)

Adaptive smartphone overuse intervention engine (research-oriented):

- **usageDetector**: Simulates and analyzes usage episodes, detects anomalous patterns
- **contextClassifier**: Extracts context features, classifies episodes using weighted scoring
- **interventionEngine**: Multi-armed bandit algorithm for selecting appropriate interventions
- **humanFeedbackLoop**: Processes user feedback, adapts intervention strategy over time

Currently simulation-only. Will integrate with real Screen Time API data when available.

## Critical Next Steps

1. **Screen Time API** (HIGH) - Build native module for FamilyControls/ManagedSettings/DeviceActivity. Apply for entitlement. This is the core product differentiator.
2. **Onboarding Polish** (LOW) - Scene components exist, needs animation and transition work.
3. **Stripe Integration** (FUTURE) - Not started. Trust model works for now.

See ROADMAP.md for detailed plan.

---

## Legal Framing

NIYAH is a **commitment contract** app, NOT gambling:

- Outcome is 100% effort-based (user controls whether they use their phone)
- Same legal model as stickK and Beeminder (10+ years operating legally)
- App Store category: Productivity (NOT Games)
- Avoid words: "bet," "wager," "gamble," "win"
- Use words: "stake," "commitment," "goal," "complete"

## Contact

- Legal guidance: VAIL (Mark & Cat), Dr. White
- Technical consulting: 40AU (Logan & Andrew)
