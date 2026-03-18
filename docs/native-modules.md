# Native Modules

> Firebase, Screen Time, JITAI, and config plugins.
> See also: [Architecture](./architecture.md) | [Roadmap](./roadmap.md) | [Security](./security.md)

## Firebase (RNFB)

React Native Firebase packages provide Auth and Firestore:

| Package                            | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `@react-native-firebase/app`       | Core initialization (Expo plugin in `app.config.ts`) |
| `@react-native-firebase/auth`      | Google, Apple, and email magic link sign-in          |
| `@react-native-firebase/firestore` | User profiles, wallets, sessions, follows            |

**Config files**: `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) live in `firebase/` (gitignored). Injected at build time by the `withGoogleServicesPlist` and `withGoogleServicesJson` config plugins. `withFirebaseStaticFrameworks` handles CocoaPods static framework linking.

**JS wrapper**: `src/config/firebase.ts` -- all auth, Firestore CRUD, and social helpers.

## Screen Time Module (`modules/niyah-screentime/`)

Custom Expo module bridging iOS Screen Time API to JavaScript.

### Swift Components

| File                                   | Purpose                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NiyahScreenTimeModule.swift`          | FamilyControls auth, FamilyActivityPicker, ManagedSettings shield (block/unblock). App selection persisted via App Groups `UserDefaults` with `PropertyListEncoder`. Polls for violations and emits `onShieldViolation` events to JS. |
| `AppPickerHostingController.swift`     | SwiftUI wrapper for `FamilyActivityPicker`, presented modally as `UIHostingController`. Supports Done and Cancel callbacks.                                                                                                           |
| `DeviceActivityMonitorExtension.swift` | App Extension (separate process). Detects blocked app opens during sessions, records violation timestamps to shared `UserDefaults`. Uses named `ManagedSettingsStore(.niyahSession)`.                                                 |

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

Swift code is production-quality. JS wrapper complete. **Not yet integrated into `sessionStore.ts`** -- calling `startBlocking()`/`stopBlocking()` from session lifecycle is the remaining wiring step.

The extension embed phase in `withDeviceActivityMonitor.js` is intentionally disabled (caused `lstat` build failures). Will be re-enabled when Screen Time is wired into sessions. See [Roadmap > Phase 1](./roadmap.md#13-screen-time-blocking).

### Planned Shield UX

Instead of silently blocking apps, the planned UX uses `ManagedSettings ShieldConfiguration`:

- User starts a focus session and selects distraction apps
- Opening a restricted app shows a **custom shield screen** with the Niyah blob
- Two options: **"Surrender"** (lose stake, end session) or **"Stay Focused"** (dismiss, return)
- Button actions handled by the `DeviceActivityMonitorExtension`

iOS does not allow injecting modals into other apps. The custom shield via `ManagedSettingsStore` is the only API-compliant approach. Custom shield UI (`ShieldConfigurationDataSource` + `ShieldActionExtension`) is planned for [Phase 2](./roadmap.md#phase-2-beta-cohort).

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
