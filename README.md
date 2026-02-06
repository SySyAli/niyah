# Niya - نیت - नीयत - নিয়ত —_Intention_

**Put your money where your mind is.**

## Problem

You want to stop doomscrolling. Screen time apps don't work because there's no real consequence. Willpower alone isn't enough.

## Solution

Trap your own money. Rescue it through discipline. Hit streaks and earn even more.

Mode 1: Solo

1. Deposit money, block distracting apps, and track screen time.
2. More screentime = lose money.
3. Less screentime = earn money.

Mode 2: Pool

1. Pool money with friend, block distracting apps, and track screen time together.
2. More screentime = get less from pool.
3. Less screentime = get more from pool.

## Cheating

We don't spy on your usage. We track when you give up.

All distracting apps are blocked by default. Want to scroll? Tap "Take a break" and we log it. Finish a session without quitting and you earn. Random check-ins make sure you're actually there.

## Ways to Start

| Option        | How It Works                                                   |
| ------------- | -------------------------------------------------------------- |
| Deposit Match | Put in $30, we add $10. Earn back $40 or more.                 |
| Locked Card   | Get a prepaid Visa that unlocks as you focus.                  |
| Try First     | Free for 7 days. See what you'd earn. Then deposit to collect. |
| Defend Credit | Start with $30 credit. Lose $1 each day you fail.              |

## How We Make Money

Users who don't finish streaks lose some of their deposit. That funds bonuses for users who do. We also offer tiered plans at $30, $60, and $100, plus an enterprise version for companies.

## Why This Works

| Other Apps                       | NIYA                          |
| -------------------------------- | ----------------------------- |
| Guilt and reminders              | Real money on the line        |
| Track your usage (broken on iOS) | Track your surrenders (works) |
| Nothing to lose                  | Something to rescue and grow  |

## Development Setup

### Prerequisites

- **Node.js** (v18+)
- **pnpm** (`npm install -g pnpm`)
- **Xcode** (for iOS) — install from Mac App Store, then run `xcode-select --install`
- **Android SDK** (for Android) — install via [Android Studio](https://developer.android.com/studio) or standalone SDK tools

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
```

---

### iOS Simulator

**1. First time:**

```bash
npx expo prebuild --platform ios --clean
npx expo run:ios
```

**2. Subsequent runs:**

```bash
pnpm start
i
```

If you get a white screen, kill < PID >, then reopen the app.

---

### Android Emulator

**1. Set up environment variables** (add to `~/.zshrc` or `~/.bashrc`):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
```

Then restart your terminal or run `source ~/.zshrc`.

**2. Create an AVD:**

Open Android Studio → Virtual Device Manager → Create Device → select Pixel 9 / API 35.

Or via CLI:

```bash
sdkmanager "system-images;android-35;google_apis;arm64-v8a"
avdmanager create avd -n Pixel_9_API_35 -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_9
```

**3. Boot the emulator:**

```bash
emulator -avd Pixel_9_API_35
```

**4. First time (generates native project and builds):**

```bash
npx expo prebuild --platform android --clean
npx expo run:android
```

**5. Subsequent runs:**

```bash
pnpm start
# Then press 'a' to open on Android emulator
```

**Note:** If the app shows the dev client launcher but doesn't auto-connect, set up port forwarding:

```bash
adb reverse tcp:8081 tcp:8081
```

Then tap `http://10.0.2.2:8081` in the launcher screen.

---

### Troubleshooting

These may help with any issues you encounter.

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
cd ios && pod cache clean --all && rm -rf Pods && pod install && cd ..
# OR
rm -rf ios
npx expo prebuild --platform ios --clean
npx expo run:ios
```

**Android rebuild:**

```bash
cd android && ./gradlew clean && cd ..
# OR
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

---
