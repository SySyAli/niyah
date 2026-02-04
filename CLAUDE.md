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

## Research Findings

### Screen Time API

- iOS: Requires FamilyControls entitlement (parental controls category)
- Android: UsageStatsManager with special permission
- Existing packages: `react-native-screen-time-api` (limited, unmaintained)
- Will need custom native modules

### Legal Considerations

- Pool mode may constitute gambling (zero-sum)
- Solo mode ($5 → $10) needs legal review
- "Commitment contract" framing may help
- Consult VAIL/law school for guidance

### App Store

- iOS requires parental controls classification for Screen Time access
- May conflict with payment processing
- Research how Opal handles this

## Contact

- Professor feedback: De-risk Screen Time API, legal/gambling, and payments first
- Consult: VAIL (Mark & Cat), Dr. White for legal guidance
- Reference: 40AU (Logan & Andrew) for technical consulting
