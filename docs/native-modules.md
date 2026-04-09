# Native Modules

> Firebase, Screen Time, JITAI, and config plugins.
> See also: [Architecture](./architecture.md) | [Roadmap](./roadmap.md) | [Security](./security.md)

## Firebase (RNFB)

React Native Firebase packages provide Auth and Firestore:

| Package                            | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `@react-native-firebase/app`       | Core initialization (Expo plugin in `app.config.ts`) |
| `@react-native-firebase/auth`      | Google, Apple, email magic link, and phone SMS sign-in |
| `@react-native-firebase/firestore` | User profiles, wallets, sessions, follows              |
| `@react-native-firebase/messaging` | FCM push notifications (token management, foreground)  |

**Config files**: `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) live in `firebase/` (gitignored). Injected at build time by the `withGoogleServicesPlist` and `withGoogleServicesJson` config plugins. `withFirebaseStaticFrameworks` handles CocoaPods static framework linking.

**JS wrapper**: `src/config/firebase.ts` -- all auth, Firestore CRUD, and social helpers.

## Screen Time Module (`modules/niyah-screentime/`)

Custom Expo module bridging iOS Screen Time API to JavaScript.

### Swift Components

| File                                     | Purpose                                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NiyahScreenTimeModule.swift`            | FamilyControls auth, FamilyActivityPicker, ManagedSettings shield (block/unblock). App selection persisted via App Groups `UserDefaults` with `PropertyListEncoder`. Polls for violations and emits `onShieldViolation` events to JS. |
| `AppPickerHostingController.swift`       | SwiftUI wrapper for `FamilyActivityPicker`, presented modally as `UIHostingController`. Supports Done and Cancel callbacks.                                                                                                           |
| `DeviceActivityMonitorExtension.swift`   | App Extension (separate process). Detects blocked app opens during sessions, records violation timestamps to shared `UserDefaults`. Uses named `ManagedSettingsStore(.niyahSession)`.                                                 |
| `ShieldActionExtension.swift`            | Handles user actions on the shield overlay (e.g., "Surrender Session" button tap). Communicates back to main app.                                                                                                                     |
| `ShieldConfigurationExtension.swift`     | Configures custom shield appearance — Niyah-branded overlay with "Stay Focused" / "Surrender Session" buttons instead of generic system block.                                                                                        |

### JS Wrapper

`src/config/screentime.ts` -- typed convenience functions for:

- Authorization (`requestAuthorization`)
- App picker (`presentAppPicker`)
- Blocking (`startBlocking` / `stopBlocking`)
- Violation events (`onShieldViolation` subscription)

### Config Plugins

| Plugin                         | What it does                                                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withScreenTimeEntitlement.js` | Adds FamilyControls, App Groups (`group.com.niyah.app`), Push Notifications entitlements                                                                                     |
| `withDeviceActivityMonitor.js` | Injects DeviceActivityMonitor extension target into Xcode project. Reads `config.version` for dynamic versioning. Extension embed phase currently disabled (see note below). |

### Requirements

- iOS 16+, physical device only (no Simulator)
- FamilyControls entitlement enabled on App ID (Apple Developer portal)

### Status

Swift code is production-quality. JS wrapper complete. Custom shield UI built and branded. Quick-block flow (`quick-block.tsx`) is wired to `startBlocking()`/`stopBlocking()`. Full session lifecycle wiring (calling blocking from `sessionStore.ts` on session start/end) is the remaining step.

The extension embed phase in `withDeviceActivityMonitor.js` is intentionally disabled (caused `lstat` build failures). Will be re-enabled when Screen Time is fully wired into sessions. See [Roadmap](./roadmap.md).

### Custom Shield UX

The custom Niyah-branded shield is implemented via `ShieldConfigurationExtension.swift` and `ShieldActionExtension.swift`:

- User starts a focus session (or quick block) and selects distraction apps
- Opening a restricted app shows a **custom shield screen** with Niyah branding
- Two options: **"Surrender Session"** (lose stake, end session) or **"Stay Focused"** (dismiss, return)
- Button actions handled by `ShieldActionExtension`, which communicates back to the main app

iOS does not allow injecting modals into other apps. The custom shield via `ManagedSettingsStore` is the only API-compliant approach.

## JITAI Module (`src/jitai/`)

Adaptive smartphone overuse intervention engine (research-oriented, simulation-only):

| File                    | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `usageDetector.ts`      | Simulates and analyzes usage episodes, detects anomalous patterns     |
| `contextClassifier.ts`  | Extracts context features, classifies episodes using weighted scoring |
| `interventionEngine.ts` | Multi-armed bandit algorithm for selecting interventions              |
| `humanFeedbackLoop.ts`  | Processes user feedback, adapts intervention strategy                 |

**Status**: Parked. Will integrate with real Screen Time API data when available.

## Key Apple Frameworks Reference

| Framework       | Purpose                                                                |
| --------------- | ---------------------------------------------------------------------- |
| FamilyControls  | Authorization & privacy tokens for selecting apps/websites             |
| ManagedSettings | Apply restrictions (shield apps), `ShieldConfiguration` for custom UI  |
| DeviceActivity  | Monitor usage, execute code on schedules/events, handle shield actions |
