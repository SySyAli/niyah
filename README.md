**Put your money where your mind is.**

## Problem

You want to stop doomscrolling. Screen time apps don't work because there's no real consequence. Willpower alone isn't enough.

## Solution

Trap your own money. Rescue it through discipline. Hit streaks and earn even more.

**Solo Mode**: Deposit money, block distracting apps, track screen time. More screen time = lose money. Less screen time = earn money.

**Pool Mode**: Pool money with friends, block distracting apps, compete on screen time. Lower usage = bigger share of the pool.

## Development Setup

### Prerequisites

- **Node.js** v18+
- **pnpm** (`npm install -g pnpm`)
- **Xcode** (iOS) -- install from Mac App Store, then `xcode-select --install`
- **Android SDK** (Android) -- via [Android Studio](https://developer.android.com/studio)

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in values:

```
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

You also need Firebase config files (not in repo):

- `firebase/GoogleService-Info.plist` -- download from Firebase Console > Project Settings > iOS
- `firebase/google-services.json` -- download from Firebase Console > Project Settings > Android

### Build & Run

This project uses `expo-dev-client`, **NOT** Expo Go. You must build a dev client first.

**iOS (physical device via USB):**

```bash
pnpm build:local    # Build + install on device
pnpm start          # Start dev server (phone on same WiFi)
```

**iOS Simulator:**

```bash
pnpm build:local:sim  # Build for Simulator
pnpm start
# Press 'i' to open on iOS Simulator
```

**Android Emulator:**

```bash
npx expo prebuild --platform android --clean
npx expo run:android
```

For subsequent runs after building, just start the dev server:

```bash
pnpm start
# Press 'i' for iOS Simulator, 'a' for Android emulator
```

### Testing & Code Quality

```bash
pnpm test        # Run all tests (401 tests)
pnpm typecheck   # TypeScript strict mode check
pnpm lint        # ESLint
pnpm ci          # Full CI: lint + typecheck + test
```

---

### iOS Device (team distribution, no Mac required)

1. Register device:

```bash
eas device:create
```

2. Build for device:

```bash
eas build --profile development-device --platform ios --local
```

3. Upload the `.ipa` to [diawi.com](https://diawi.com) and share link to team.

4. Run `pnpm start`, enter the Manual URL in the app.

5. `.ts` changes update instantly. Native changes (Swift, push notifications, Screen Time) require a new build (step 2).

---

### Troubleshooting

**Clear cache:**

```bash
npx expo start --clear
```

**Reinstall node_modules:**

```bash
rm -rf node_modules
pnpm install
```

**iOS rebuild:**

```bash
rm -rf ios
npx expo prebuild --platform ios --clean
npx expo run:ios
```

**Android rebuild:**

```bash
rm -rf android
npx expo prebuild --platform android --clean
npx expo run:android
```

**Clean everything:**

```bash
rm -rf node_modules ios android .expo
pnpm install
npx expo prebuild --clean
npx expo run:ios
```

### Android Environment Setup

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
```

Create AVD: Android Studio > Virtual Device Manager > Pixel 9 / API 35.

If the dev client doesn't auto-connect:

```bash
adb reverse tcp:8081 tcp:8081
```

### Windows (WSL) Setup

Run on every restart in PowerShell as Administrator:

```powershell
.\wsl_dev_setup.ps1
```

Then from WSL:

```bash
npx expo start --dev-client --host lan
```

Connect phone to `http://<YOUR_WIFI_IP>:8081`.

---

## Documentation

Detailed docs are in the [`docs/`](docs/) directory:

- [Architecture](docs/architecture.md) -- project structure, directory tree
- [Development](docs/development.md) -- full command reference, env vars, Cloud Functions
- [Features](docs/features.md) -- auth, sessions, wallet, social, demo mode
- [Native Modules](docs/native-modules.md) -- Firebase, Screen Time, JITAI
- [Security](docs/security.md) -- SSL pinning, key management, Firestore rules
- [Roadmap](docs/roadmap.md) -- current status, phases, blockers
- [Payments](docs/payments.md) -- Stripe, payout formulas, settlement models
- [Legal](docs/legal.md) -- commitment contract framing, App Store strategy
- [UI & Animation](docs/ui-animation.md) -- animation libraries, onboarding plans
