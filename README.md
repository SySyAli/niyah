# Niyah - نیت - नीयत - নিয়ত —_Intention_

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

### iOS Device (no Mac required)

Apple Developer account runs this, sends the link to team, and they download the build.

```bash
eas device:create
```

After downloading, run:

```bash
pnpm start
```

Then, open the NIYAH app, it connects automatically over Wi-Fi. Rebuild when non-typescript things are edited:

```bash
eas build --profile development-device --platform ios
```

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
