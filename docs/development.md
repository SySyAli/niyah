# Development

> Commands, environment setup, and build workflow.
> See also: [Architecture](./architecture.md) | [Security](./security.md)

## Prerequisites

- **Node.js** v18+
- **pnpm** (`npm install -g pnpm`)
- **Xcode** (iOS) -- install from Mac App Store, then `xcode-select --install`
- **Android SDK** (Android) -- via [Android Studio](https://developer.android.com/studio)
- **EAS CLI** -- `npm install -g eas-cli` (for cloud builds)

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable                               | Purpose                                                           |
| -------------------------------------- | ----------------------------------------------------------------- |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID`      | Firebase project ID (used in dynamic config, Cloud Functions URL) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`     | Google OAuth web client ID                                        |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`     | Google OAuth iOS client ID (also derives URL scheme)              |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID                                    |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | Stripe publishable key (`pk_test_...` or `pk_live_...`)           |

**Server-side secrets** (never in `.env`):

- `STRIPE_SECRET_KEY` -- Firebase Secret Manager (`firebase functions:secrets:set`)
- `STRIPE_WEBHOOK_SECRET` -- Firebase Secret Manager

**Firebase config files** (gitignored, required on disk):

- `firebase/GoogleService-Info.plist` -- download from Firebase Console > Project Settings > iOS app
- `firebase/google-services.json` -- download from Firebase Console > Project Settings > Android app

For EAS cloud builds, upload these as file secrets:

```bash
eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value firebase/GoogleService-Info.plist
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value firebase/google-services.json
```

## Commands

### Development Server

```bash
pnpm start             # Start dev server over LAN (requires dev client build first)
pnpm start:tunnel      # Start dev server over Expo tunnel (best for Windows+iPhone)
pnpm start:device      # Start with USB port forwarding (physical device, Mac only)
pnpm ios               # Start with iOS simulator
pnpm android           # Start with Android emulator
npx expo start --clear # Clear cache and start
```

### Testing

```bash
pnpm test              # All tests once (401 tests, 20 suites)
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
pnpm test:integration  # Integration tests only
pnpm test:unit         # Unit tests only
pnpm test:stores       # Store tests only
pnpm test:components   # Component tests only
```

### Code Quality

```bash
pnpm typecheck         # TypeScript strict mode check
pnpm lint              # ESLint 9
pnpm lint:fix          # Auto-fix lint issues
pnpm format            # Prettier format
pnpm format:check      # Check formatting
pnpm ci                # lint + typecheck + test (full CI check)
```

### Building

```bash
pnpm build:local       # iOS local build to USB device (fastest, requires Xcode)
pnpm build:local:sim   # iOS local build to Simulator
pnpm build:dev         # iOS dev build via EAS (cloud)
pnpm build:dev:android # Android dev build via EAS (cloud)
pnpm build:dev:device  # iOS device-specific dev build via EAS
pnpm build:dev:device:local # iOS device-specific dev build via local EAS on Mac
pnpm build:preview     # Preview build (all platforms)
pnpm build:production  # Production build (all platforms)
```

**Important**: This project uses `expo-dev-client`, NOT Expo Go. Build a dev client first (`pnpm build:local` or `pnpm build:dev`) before running `pnpm start`.

**Important**: Windows/Linux developers cannot build iPhone binaries locally. Use a shared `development-device` build from EAS or a Mac, then connect that app to Metro for day-to-day JS/TS work.

## Physical Device Development

Two approaches for iOS device testing:

### Tunnel (recommended for Windows + iPhone)

This avoids same-WiFi discovery issues and most WSL2/firewall problems.

```bash
pnpm start:tunnel
```

If Expo asks for ngrok, install it once with `npm i -g @expo/ngrok` and rerun the command.

Open the installed dev client on your iPhone and scan the QR code or open the recent project.

### WiFi (simpler)

Ensure phone and laptop are on the same WiFi network, then `pnpm start`. The dev client auto-discovers the server. This is faster than tunneling, but WSL2 and Windows firewall settings can block LAN access.

### USB (scripts/dev-device.sh)

Uses `iproxy` (from `libimobiledevice`) for USB port forwarding. No WiFi needed.

```bash
brew install libimobiledevice  # one-time
pnpm build:local               # build + install on device
pnpm start:device              # connect via USB (skips build)
```

## Windows + iPhone teammate workflow

1. A Mac owner or EAS cloud creates an iPhone dev client with `pnpm build:dev:device` or `pnpm build:dev:device:local`.
2. Each teammate device must be registered first with `eas device:create` so Apple includes it in the provisioning profile.
3. Teammates install that build once on their iPhones, then develop with `pnpm start:tunnel` (recommended) or `pnpm start` plus `scripts/wsl_dev_setup.ps1` for LAN.
4. If the installed app behaves like a fixed standalone app and never connects to Metro, it was built as a regular release/archive build instead of a `development-device` build and must be rebuilt.
5. JS/TS changes hot-reload immediately. Native dependency, config-plugin, entitlement, or Info.plist changes require a fresh iPhone dev-client build from EAS or a Mac.

## Cloud Functions

13 Cloud Functions deployed to Firebase:

| Function                  | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `createPaymentIntent`     | Stripe deposit PaymentIntent              |
| `verifyAndCreditDeposit`  | Verify payment + credit wallet            |
| `createConnectAccount`    | Create Stripe Connect account             |
| `createAccountLink`       | Generate Stripe Connect onboarding URL    |
| `getConnectAccountStatus` | Check Connect account status              |
| `handleSessionComplete`   | Process session completion + payout       |
| `handleSessionForfeit`    | Process session surrender + forfeit       |
| `requestWithdrawal`       | Initiate Stripe payout                    |
| `distributeGroupPayouts`  | Calculate + distribute group session pool |
| `awardReferral`           | Process referral bonus                    |
| `followUserFn`            | Follow a user                             |
| `unfollowUserFn`          | Unfollow a user                           |
| `stripeWebhook`           | Handle Stripe webhook events              |

Deploy: `firebase deploy --only functions`
Deploy rules: `firebase deploy --only firestore:rules`

**Note**: `functions/package.json` has a `"lint": "tsc --noEmit"` script required by `firebase.json` predeploy hooks.
