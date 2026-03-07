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
- **Styling**: React Native StyleSheet, SF Pro Rounded (iOS), dark/light theme system
- **Build**: EAS Build (production), `expo-dev-client` (development) -- NOT Expo Go
- **Backend**: Firebase Auth + Firestore via custom native Swift Expo module (`modules/niyah-firebase/`)
- **Auth**: Google Sign-In, Apple Sign-In, Email magic link (passwordless)
- **Testing**: Jest + jest-expo (unit + integration)
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
│   │   ├── propose.tsx         # Group challenge proposal screen (stake, invitees, schedule)
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
│   │   ├── BlobsBackground.tsx  # Animated SVG blob background (3 variants)
│   │   ├── Button.tsx          # Primary button component
│   │   ├── Card.tsx            # Card container
│   │   ├── Confetti.tsx        # Celebration animation
│   │   ├── GoogleSignInButton.tsx
│   │   ├── MoneyPlant.tsx      # Money plant visualization (partner network)
│   │   ├── NumPad.tsx          # Numeric input pad
│   │   ├── OTPInput.tsx        # OTP/code input
│   │   ├── PeachAvatar.tsx     # Standalone peach blob avatar
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
│   │   ├── firebase.ts         # Firebase helpers (auth, Firestore, social)
│   │   └── screentime.ts       # Screen Time API JS wrapper (typed functions + event subscriptions)
│   ├── context/
│   │   └── ScrollContext.tsx    # Shared scroll context
│   ├── store/                  # Zustand state stores
│   │   ├── authStore.ts        # Auth state, Firebase user, profile
│   │   ├── sessionStore.ts     # Solo session lifecycle
│   │   ├── walletStore.ts      # Balance, transactions, settlements
│   │   ├── partnerStore.ts     # Partner relationships, duo sessions
│   │   ├── groupSessionStore.ts # N-person group sessions, transfers
│   │   ├── socialStore.ts      # Following/followers, public profiles
│   │   └── themeStore.ts       # Dark/light theme with AsyncStorage persistence
│   ├── hooks/
│   │   ├── useCountdown.ts     # Countdown timer hook
│   │   └── useColors.ts        # Returns current theme colors from themeStore
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
│   │   ├── colors.ts           # DarkColors, LightColors, ThemeColorMap, ThemeColors type; Spacing, Typography, Font, Radius
│   │   └── config.ts           # Cadences, DEMO_MODE, INITIAL_BALANCE, reputation levels, payment info
│   ├── utils/
│   │   ├── format.ts           # Formatting utilities
│   │   └── payoutAlgorithm.ts  # Group payout calculation (placeholder even-split -- needs real impl)
│   ├── __tests__/              # Test suites
│   │   ├── integration/        # Integration tests (session flows)
│   │   └── unit/               # Unit tests (components, hooks, store, utils)
│   └── __mocks__/              # Test mocks
│       └── react-native.ts
├── modules/
│   ├── niyah-firebase/         # Custom native Expo module for Firebase
│   │   ├── expo-module.config.json
│   │   ├── package.json
│   │   ├── NiyahFirebase.podspec
│   │   ├── index.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── NiyahFirebaseAuthModule.ts
│   │   │   └── NiyahFirestoreModule.ts
│   │   └── ios/
│   │       ├── NiyahFirebaseAuthModule.swift   # Firebase Auth bridge
│   │       └── NiyahFirestoreModule.swift       # Firestore bridge
│   └── niyah-screentime/       # Custom native Expo module for Screen Time API
│       ├── expo-module.config.json
│       ├── package.json
│       ├── NiyahScreenTime.podspec
│       ├── index.ts
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   └── NiyahScreenTimeModule.ts
│       └── ios/
│           ├── NiyahScreenTimeModule.swift      # Main module (auth, picker, shield)
│           ├── AppPickerHostingController.swift  # SwiftUI FamilyActivityPicker wrapper
│           └── NiyahDeviceActivityMonitor/       # App Extension (separate process)
│               └── DeviceActivityMonitorExtension.swift
├── plugins/                    # Expo config plugins
│   ├── withFollyCoroutinesFix.js
│   ├── withGoogleServicesPlist.js
│   ├── withFirebaseStaticFrameworks.js
│   ├── withScreenTimeEntitlement.js    # FamilyControls + App Groups entitlements
│   └── withDeviceActivityMonitor.js    # Injects extension target into Xcode project
├── scripts/
│   ├── print-dev-url.js
│   └── wsl_dev_setup.ps1
├── assets/                     # Images, fonts, SVGs, onboarding assets
├── CLAUDE.md                   # This file
├── ROADMAP.md                  # Project roadmap & planning
├── app.json                    # Expo config
├── package.json
├── tsconfig.json
├── jest.config.js
├── jest.setup.ts
└── eslint.config.mjs
```

**Note**: `coverage/` directory and `.ipa` build artifacts should not be committed. `GoogleService-Info.plist` and `google-services.json` live in `firebase/` (needed by config plugins) -- do not expose in public repos.

## Development Commands

```bash
# Install dependencies (use pnpm, not npm)
pnpm install

# Start development server (requires dev client build)
pnpm start
# or: npx expo start --dev-client

# Start with Expo Go (limited -- no native modules)
pnpm start:go

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
pnpm test:coverage     # Coverage report
pnpm test:integration  # Integration tests only
pnpm test:unit         # Unit tests only
pnpm test:stores       # Store tests only
pnpm test:components   # Component tests only

# Lint & format
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check

# Full CI check
pnpm ci                # lint + typecheck + test

# Build dev client (required before first `pnpm start`)
pnpm build:dev          # iOS dev build via EAS
pnpm build:dev:android  # Android dev build via EAS
pnpm build:dev:device   # iOS device-specific dev build
pnpm build:preview      # Preview build (all platforms)
pnpm build:production   # Production build (all platforms)
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
- Use `useColors()` hook to get current theme colors (dark/light)
- Colors live in `src/constants/colors.ts` as `DarkColors` and `LightColors`; theme toggle in `themeStore.ts`
- Follow 8px spacing grid (`Spacing.xs/sm/md/lg/xl/xxl`)
- Use `Font.regular/medium/semibold/bold/heavy` for font styles (SF Pro Rounded on iOS)

### State Management (Zustand)

- One store per domain: `authStore`, `sessionStore`, `walletStore`, `partnerStore`, `groupSessionStore`, `socialStore`, `themeStore`
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
5. Proposal UI exists in `app/session/propose.tsx` (UI-complete, backend wiring pending)

### Wallet & Transactions (`walletStore.ts`)

- Virtual balance in cents
- Transaction types: deposit, withdrawal, stake, payout, forfeit, settlement_paid, settlement_received
- Demo mode starts with $50 balance

### Social Features

- **Following/Followers** (`socialStore.ts`) - Backed by Firestore `userFollows` collection
- **Public Profiles** (`app/user/[uid].tsx`) - View other users' stats and reputation
- **Reputation System** - 5 tiers: seed (0-20) -> sprout (21-40) -> sapling (41-60) -> tree (61-80) -> oak (81-100). Score based on payment reliability + referral bonuses.
- **Referral System** - Deep link invites, reputation boost, partner auto-connect
- **Contacts Integration** - `expo-contacts` for finding friends

### Theme System

- Dark/light theme via `themeStore.ts` (persisted to AsyncStorage)
- Access colors in components via `useColors()` hook (returns `ThemeColors`)
- Color definitions in `src/constants/colors.ts`: `DarkColors`, `LightColors`

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
- **Screen Time blocking**: Module scaffolded (production-quality Swift), NOT yet integrated into session lifecycle
- **Payments**: Trust model (virtual balances, settle outside app)

## Native Modules

### `modules/niyah-firebase/`

Custom Expo module bridging Firebase to JavaScript:

- **NiyahFirebaseAuthModule** (Swift): Sign-in with Google/Apple credentials, email magic link, auth state listener, sign-out
- **NiyahFirestoreModule** (Swift): getDoc, setDoc, updateDoc, deleteDoc with server timestamp support

Firebase is configured via `GoogleService-Info.plist` (iOS) injected by the `withGoogleServicesPlist` plugin.

### `modules/niyah-screentime/` (Swift complete, needs device testing + session wiring)

Custom Expo module bridging iOS Screen Time API to JavaScript:

- **NiyahScreenTimeModule** (Swift, 273 lines): FamilyControls authorization, FamilyActivityPicker (app selection), ManagedSettings shield (block/unblock apps). App selection persisted via App Groups shared UserDefaults using `PropertyListEncoder`.
- **AppPickerHostingController** (Swift, 59 lines): SwiftUI wrapper for `FamilyActivityPicker`, presented modally as `UIHostingController`.
- **DeviceActivityMonitorExtension** (Swift, 102 lines): App Extension that runs in a separate process. Detects when user opens a blocked app during an active session, records violation timestamps to shared UserDefaults. Handles `intervalDidEnd`, `eventDidReachThreshold`, `intervalWillEndWarning`.
- **JS wrapper**: `src/config/screentime.ts` (142 lines) provides typed convenience functions for auth, app picker, blocking, and event subscriptions.

**Config plugins:**

- `withScreenTimeEntitlement.js` -- Adds FamilyControls, App Groups (`group.com.niyah.app`), and Push Notifications entitlements.
- `withDeviceActivityMonitor.js` -- Injects the DeviceActivityMonitor App Extension target into the Xcode project.

**Requirements:** iOS 16+, physical device (no Simulator), FamilyControls entitlement enabled on App ID.

**Status:** Swift code is production-quality. JS wrapper complete. **Not yet integrated into `sessionStore.ts`** -- calling `startBlocking()`/`stopBlocking()` from session lifecycle is the remaining wiring step.

### Intended Screen Time UX (Planned)

Instead of silently blocking apps at OS level, the planned UX is:

- User starts a focus session → selects distraction apps to restrict
- When user opens a restricted app: a **custom shield screen** appears (via `ManagedSettings ShieldConfiguration`) showing the Niyah blob and two options:
  - **"Surrender"** → records stake loss, unblocks apps, ends session
  - **"Stay Focused"** → dismisses, returns to previous context
- Shield button actions are handled by the `DeviceActivityMonitorExtension`

Note: iOS does not allow injecting modals into other apps. The custom shield via `ManagedSettingsStore` is the only API-compliant way to show interactive UI at app-open time.

## JITAI Module (`src/jitai/`)

Adaptive smartphone overuse intervention engine (research-oriented):

- **usageDetector**: Simulates and analyzes usage episodes, detects anomalous patterns
- **contextClassifier**: Extracts context features, classifies episodes using weighted scoring
- **interventionEngine**: Multi-armed bandit algorithm for selecting appropriate interventions
- **humanFeedbackLoop**: Processes user feedback, adapts intervention strategy over time

Currently simulation-only. Will integrate with real Screen Time API data when available.

## Critical Next Steps

1. **Group Session Firebase Backend** (HIGH) - `propose.tsx` UI is complete but proposals are not persisted. Need Firebase write for group session creation, real-time listeners, and push notifications for invites.
2. **Push Notifications** (HIGH) - Required for group session invites. APNs entitlement is configured but push notification sending is not implemented.
3. **Screen Time: Session Wiring** (HIGH) - Call `startBlocking()`/`stopBlocking()` from `sessionStore` when session starts/ends. Build the custom shield configuration (`ShieldConfigurationDataSource`) and handle button actions in the extension.
4. **FamilyControls Entitlement** (BLOCKER for Screen Time) - Must enable Development entitlement on App ID in Apple Developer portal before any Screen Time testing.
5. **Real Payout Algorithm** (MEDIUM) - Replace placeholder in `src/utils/payoutAlgorithm.ts` with actual formula.
6. **Onboarding Polish** (LOW) - Scene components exist, needs animation and transition work.
7. **Stripe Integration** (FUTURE) - Not started. Trust model works for now.

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
