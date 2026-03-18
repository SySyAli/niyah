# NIYAH - Project Guide

> Focus app with financial stakes. Users deposit money, stake it on focus sessions, and earn more for completing them. Quit early = lose your stake.
>
> **Detailed docs**: [Architecture](docs/architecture.md) | [Development](docs/development.md) | [Features](docs/features.md) | [Native Modules](docs/native-modules.md) | [Security](docs/security.md) | [Roadmap](docs/roadmap.md) | [Payments](docs/payments.md) | [Legal](docs/legal.md) | [UI & Animation](docs/ui-animation.md)

## Tech Stack

- **Framework**: React Native 0.81 + Expo SDK 54 (New Architecture)
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router (file-based routing, typed routes)
- **State**: Zustand (one store per domain)
- **Styling**: StyleSheet, SF Pro Rounded, dark/light theme
- **Build**: EAS Build (production), `expo-dev-client` (dev) -- NOT Expo Go
- **Backend**: Firebase Auth + Firestore via `@react-native-firebase/*`
- **Auth**: Google Sign-In, Apple Sign-In, Email magic link
- **Payments**: Stripe (`@stripe/stripe-react-native`, Cloud Functions backend)
- **Testing**: Jest + jest-expo (401 tests)
- **Linting**: ESLint 9 + Prettier
- **Package Manager**: pnpm

## Quick Reference

```bash
pnpm install           # Install deps
pnpm start             # Dev server (build dev client first)
pnpm build:local       # iOS build to USB device
pnpm test              # Run all tests
pnpm ci                # lint + typecheck + test
pnpm typecheck         # TypeScript check
```

Full command list: [docs/development.md](docs/development.md)

## Project Layout

```
app/              # Expo Router screens (file-based routing)
  (auth)/         #   Sign-in, onboarding, profile setup
  (tabs)/         #   Dashboard, session, friends, profile
  session/        #   Session flow (select, confirm, active, surrender, complete)
  user/           #   Public user profiles
src/
  components/     # Reusable UI (Balance, Button, Card, Timer, NumPad, ...)
  config/         # Firebase, Cloud Functions client, Screen Time wrapper, SSL pinning
  store/          # Zustand stores (auth, session, wallet, partner, group, social, theme)
  hooks/          # useCountdown, useColors, useScreenProtection
  jitai/          # Adaptive intervention engine (simulation-only)
  types/          # TypeScript type definitions
  constants/      # Colors, spacing, config (DEMO_MODE, cadences)
  utils/          # Formatting, payout algorithm, logger
modules/          # Custom native Expo modules (Screen Time)
functions/        # Firebase Cloud Functions (13 deployed)
plugins/          # Expo config plugins (Firebase, Screen Time, entitlements)
firebase/         # Config files (gitignored) + Firestore rules
docs/             # Detailed documentation (architecture, roadmap, security, ...)
```

Full tree: [docs/architecture.md](docs/architecture.md)

## Key Conventions

### TypeScript

- Strict mode. Types in `src/types/index.ts`
- Prefer interfaces over types for object shapes

### Components

- Functional only, hooks for state/effects
- Keep under 150 lines. Props interface above component.

### Styling

- `StyleSheet.create()` at bottom of file
- `useColors()` for theme colors. 8px spacing grid (`Spacing.*`).
- `Font.regular/medium/semibold/bold/heavy` for font weights

### State (Zustand)

- One store per domain, keep flat
- Stores call each other via `getState()`. Lazy `require()` for circular deps.
- Firestore writes are fire-and-forget (local state = source of truth)

### Navigation

- File-based routing in `app/`. Groups for layouts.
- `router.push()` to navigate, `router.replace()` for auth redirects
- Typed routes: `experiments.typedRoutes: true`

### Native Modules

- Custom modules in `modules/`, Swift via ExpoModulesCore
- Config in `expo-module.config.json`, referenced via `nativeModulesDir: "modules"` in `app.config.ts`

## Config & Secrets

| What                  | Where                                   |
| --------------------- | --------------------------------------- |
| Client env vars       | `.env` (see `.env.example`)             |
| Stripe secret/webhook | Firebase Secret Manager                 |
| Firebase config files | `firebase/` (gitignored, local only)    |
| EAS cloud builds      | Upload config files as EAS file secrets |

`app.config.ts` reads env vars at build time. No secrets hardcoded in source. See [docs/security.md](docs/security.md).

## Current Phase

**Phase 1: Group Mode MVP** (4-person internal test)

Key remaining work:

- Group session Firebase backend (Firestore + Cloud Functions)
- FCM push notifications
- Screen Time blocking wired into session lifecycle
- FamilyControls entitlement (BLOCKER)

Full status and phases: [docs/roadmap.md](docs/roadmap.md)

## Demo Mode

`DEMO_MODE = true` in `src/constants/config.ts`. Real Firebase auth, short session timers, $50 starting balance, Cloud Function calls skipped. See [docs/features.md](docs/features.md#demo-mode).

## Legal

NIYAH is a **commitment contract** app, NOT gambling. Same model as stickK and Beeminder.

- Avoid: "bet," "wager," "gamble," "win"
- Use: "stake," "commitment," "goal," "complete"
- App Store category: Productivity

Full analysis: [docs/legal.md](docs/legal.md)

## Contacts

- **Legal**: VAIL (Mark & Cat), Dr. White
- **Technical**: 40AU (Logan & Andrew)
