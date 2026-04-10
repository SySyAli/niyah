# Niyah: Technical Spec + Implementation Plan (v2)

## Progress (as of Apr 4, 2026)

| Phase | Item                                                              | Status      |
| ----- | ----------------------------------------------------------------- | ----------- |
| 0A    | ManagedSettingsStore.Name fix + custom shield branding            | Done        |
| 0B    | linkBankAccount error handling + idempotency                      | Done        |
| 0C    | Withdraw text fix                                                 | Done        |
| 0D    | findContactsOnNiyah rate limit + socialStore caching              | Done        |
| 0E    | Quick flow fixes (profile, propose, sessionStore)                 | Partial     |
| 1     | One-tap quick block (`quick-block.tsx`)                           | Done        |
| 1     | DeviceActivitySchedule integration (scheduled blocking)           | Not Started |
| 1     | `scheduleStore.ts`                                                | Not Started |
| 2     | Calendar integration (`schedule-builder.tsx`, `calendarUtils.ts`) | Not Started |
| 3     | DeviceActivityReport chart (`niyah-report/`, `usage-report.tsx`)  | Not Started |
| 4     | Threshold nudges                                                  | Not Started |
| 5     | Group session `scheduledStartAt` wiring                           | Not Started |

Also completed (not in original sprint scope):

- Phone SMS OTP auth (`phone-entry.tsx`, `verify-phone.tsx`)
- Screen Time onboarding flow (`screentime-setup.tsx`)
- Contact invite list (enhanced `friends.tsx`)
- Group session Cloud Functions (7 new functions)

---

## Context

Fardeen tested the app on 2026-03-27 and surfaced bugs + a strategic rearchitecture before the April 15 demo (18 days). Core shift: from "money-staked cadence sessions" → "schedule-based app blocker with calendar intelligence (solo) + money-staked group challenges." Everything below is decided and ready to implement.

**Confirmed decisions:**

- Fix shield first, then build on top
- Solo mode: remove money, add scheduling, no money staking
- Usage data: both DeviceActivityReport chart (display-only) + threshold nudge tracking
- Calendar: full daily schedule generator (read Apple/Google/Outlook, show events + gaps, user confirms focus blocks)
- One-tap quick block as the fast alternative path
- Bank connection: keep at withdrawal (no change)
- Referral links: deferred post-April 15

---

## HARD REALITY CHECK

You want ~30+ days of work in 18 days, solo. The plan below is sequenced so the most critical demo pieces land first. If you fall behind, the cut list is at the bottom — follow it.

---

## Phase 0: Bug Fixes + Shield Verification (Days 1-3)

**Gate: Do not start Phase 1 until shield works on device.**

### 0A. Fix `ManagedSettingsStore.Name` in Extension Targets

**Root cause:** `DeviceActivityMonitorExtension.swift` uses `.niyahSession` (the named store), but that extension on `ManagedSettingsStore.Name` is only declared in the main app's `NiyahScreenTimeModule.swift`, NOT in the extension target. This causes silent failure or crash — the shield renders as a generic system block instead of the custom UI.

**Fix:**

- `modules/niyah-screentime/ios/NiyahDeviceActivityMonitor/DeviceActivityMonitorExtension.swift`: Add declaration at top:
  ```swift
  extension ManagedSettingsStore.Name {
    static let niyahSession = Self("niyah.session")
  }
  ```
- Check `NiyahShieldAction/ShieldActionExtension.swift` and `NiyahShieldConfiguration/ShieldConfigurationExtension.swift` — add same declaration if they reference `.niyahSession`
- `npx expo prebuild --clean --platform ios && pnpm build:local`
- **Verify**: Start a session, open a blocked app → confirm custom shield UI ("Stay Focused" / "Surrender Session" buttons) appears

### 0B. `linkBankAccount` 500/400 Error

**Root cause:** Plaid-Stripe integration likely not enabled in Plaid dashboard. Also, on retry the processor token (single-use) has already been consumed.

**Fix:**

- `functions/src/index.ts`: Wrap each API call in its own try/catch with specific error logging (which step failed: token exchange, account details, processor token, Stripe account, external account attach)
- Add idempotency guard: if user already has `stripeAccountId` + `linkedBank` in Firestore, return existing data without re-calling Plaid/Stripe
- Add `tos_acceptance.date` and `tos_acceptance.ip` to Stripe Custom account creation
- **Operational step**: Enable Stripe integration in Plaid dashboard → Settings > Integrations > Stripe

### 0C. Withdraw "Instant bank deposit" Text + Alert Bug

**Fixes:**

- `app/session/withdraw.tsx:326`: Change "Instant bank deposit" → "Instant bank transfer"
- After Plaid link success, the success alert text was showing wrong amount. Change alert to: `"${result.bankName} ending in ${result.bankMask} linked. Tap 'Withdraw' to continue."`

### 0D. `findContactsOnNiyah` 429 Rate Limit

**Fix:**

- `functions/src/index.ts`: Change `{ maxCalls: 5, windowMs: 600_000 }` → `{ maxCalls: 10, windowMs: 3_600_000 }` (10/hour)
- `app/(tabs)/friends.tsx`: Move `contactMatches` and `lastContactSyncAt` into `socialStore.ts`. Skip re-fetch if < 5 minutes since last sync.

### 0E. Quick Flow Fixes

- `app/(tabs)/profile.tsx`: Remove `<PaymentHandlesCard>` (Venmo/Zelle). Add a `<LinkedBankCard>` showing institution name + mask from `user?.linkedBank` with "Change Bank" button.
- `src/components/profile/index.ts`: Remove `PaymentHandlesCard` export.
- `app/session/propose.tsx`: Add `useEffect` that calls `loadMyFollows(user.id)` on mount + loads profiles for followed users. This fixes the empty friend list in group proposal.
- `src/store/sessionStore.ts`: In `startSession()`, subscribe to `onShieldViolation` events → increment `violationCount` in store state + fire-and-forget Firestore write. `app/session/active.tsx`: Read from store instead of local useState.

---

## Phase 1: Solo Mode Rearchitecture (Days 4-8)

### One-Tap Quick Block (Fast Path)

Replace money-staked cadence sessions with a simple "block now for X minutes" flow:

**New screen: `app/session/quick-block.tsx`**

- Time picker chips: 25 min (Pomodoro), 1 hr, 2 hrs, 4 hrs, Until tonight
- "Block Apps" button → calls existing `startBlocking()` with a countdown timer
- No money, no cadence, no stake
- Reuses existing `app/session/active.tsx` for the active blocking view (with a mode prop to hide money UI)
- On end: `stopBlocking()`, show summary ("Blocked for 2 hours")

**Files to modify:**

- `app/session/_layout.tsx`: Add `quick-block` route
- `app/(tabs)/index.tsx`: Replace "Start Session" CTA with "Block Apps Now" → routes to `quick-block`
- `app/session/active.tsx`: Add `mode` param (`"solo_quick" | "solo_scheduled" | "group"`) to conditionally render money UI
- `src/constants/config.ts`: Add `SOLO_MODE_V2 = true` flag

### DeviceActivitySchedule Integration (Timed Blocking)

New Swift methods in `modules/niyah-screentime/ios/NiyahScreenTimeModule.swift`:

```swift
AsyncFunction("startScheduledBlocking") { (startHour: Int, startMinute: Int, endHour: Int, endMinute: Int, activityName: String) in
  let center = DeviceActivityCenter()
  let schedule = DeviceActivitySchedule(
    intervalStart: DateComponents(hour: startHour, minute: startMinute),
    intervalEnd: DateComponents(hour: endHour, minute: endMinute),
    repeats: true
  )
  try center.startMonitoring(DeviceActivityName(activityName), during: schedule)
}

AsyncFunction("stopScheduledBlocking") { (activityName: String) in
  DeviceActivityCenter().stopMonitoring([DeviceActivityName(activityName)])
}

AsyncFunction("stopAllScheduledBlocking") { in
  DeviceActivityCenter().stopMonitoring()
}
```

**Update `DeviceActivityMonitorExtension.swift` `intervalDidStart`** (currently a no-op) to apply shields:

```swift
override func intervalDidStart(for activity: DeviceActivityName) {
  let store = ManagedSettingsStore(named: .niyahSession)
  let defaults = UserDefaults(suiteName: "group.com.niyah.app")
  guard let data = defaults?.data(forKey: "niyah_app_selection"),
        let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
  else { return }
  if !selection.applicationTokens.isEmpty {
    store.shield.applications = selection.applicationTokens
  }
  if !selection.categoryTokens.isEmpty {
    store.shield.applicationCategories = .specific(selection.categoryTokens)
  }
}

override func intervalDidEnd(for activity: DeviceActivityName) {
  ManagedSettingsStore(named: .niyahSession).clearAllSettings()
}
```

**New TS wrapper** in `src/config/screentime.ts`: Export `startScheduledBlocking`, `stopScheduledBlocking`, `stopAllScheduledBlocking`.

**New Zustand store**: `src/store/scheduleStore.ts`

- `schedules: BlockSchedule[]` (see types below)
- `createSchedule()`, `deleteSchedule()`, `toggleSchedule()`
- Persists to AsyncStorage
- On create: calls `startScheduledBlocking()` for each time range in the schedule

**New types in `src/types/index.ts`:**

```typescript
interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}
interface BlockSchedule {
  id: string;
  name: string;
  appSelectionId: string;
  timeRanges: TimeRange[];
  dateStart: Date;
  dateEnd: Date;
  isActive: boolean;
  createdAt: Date;
  source: "manual" | "calendar";
}
```

---

## Phase 2: Calendar Integration (Days 9-12)

### expo-calendar Integration

**New screen: `app/session/schedule-builder.tsx`** — the "Smart Schedule Maker"

**Flow:**

1. Request calendar permission (`expo-calendar` — already available in Expo SDK 54)
2. Read today's events (and optionally this week's)
3. Compute free gaps > 20 minutes between events
4. Request Screen Time auth if not granted
5. Show the full daily schedule view (see UX below)
6. User confirms → create `BlockSchedule` entries via `scheduleStore`

**Calendar UX: "Generate a daily schedule"**

Show an interactive timeline for the day:

```
6 AM ─────────────────────────────
     [CALENDAR EVENT: CS3251 9-10:30am] (greyed)
     ████ FOCUS BLOCK 10:30-12:00 ████ (green, suggested)
     [CALENDAR EVENT: Lunch 12-1pm] (greyed)
     ████ FOCUS BLOCK 1:00-3:00 ████ (green, suggested)
     [CALENDAR EVENT: Study group 3-4pm] (greyed)
     ████ FOCUS BLOCK 4:00-7:00 ████ (green, suggested)
10 PM ────────────────────────────
```

- User can tap any green block to remove it or adjust times
- "Confirm Schedule" → creates `BlockSchedule` for each green block
- "Make this a daily routine" checkbox → sets `repeats: true` for weekday schedules

**Files:**

- `app/session/schedule-builder.tsx` (new)
- `src/utils/calendarUtils.ts` (new) — gap computation, event parsing
- `app/(tabs)/index.tsx` — add "Build Smart Schedule" button alongside "Block Apps Now"
- `app/session/_layout.tsx` — add `schedule-builder` route

**Calendar sources:** `expo-calendar` on iOS reads all calendars synced to the device (iCloud, Google, Outlook) without separate per-service auth. Just one `requestCalendarPermissionsAsync()` call.

---

## Phase 3: DeviceActivityReport Chart (Days 9-11, parallel with calendar)

### New Extension Target

Add a fourth app extension: `NiyahDeviceActivityReport` — conforms to `DeviceActivityReportExtension`.

**Implementation in Swift:**

```swift
struct NiyahActivityReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    DeviceActivityReport(.init("top-apps")) { data in
      TopAppsView(activityData: data)
    }
  }
}
```

`TopAppsView` renders a SwiftUI list of apps sorted by `totalActivityDuration` with bar charts.

**Bridge to React Native:**

- New Expo native module: `NiyahUsageReportModule.swift`
- Wraps `DeviceActivityReport` SwiftUI view in a `UIHostingController`
- Exposes as a native view component: `<UsageReportView filter={filter} />`
- Use `DeviceActivityFilter` to scope to last 7 days

**New screen: `app/session/usage-report.tsx`**

- Renders `<UsageReportView>` (display-only — data stays in extension sandbox)
- Header: "Your Screen Time" with day/week toggle
- Footer: "Block your top apps →" button → opens `FamilyActivityPicker`

**Config plugin update**: Add the report extension to `withShieldExtensions.js` or a new `withReportExtension.js`.

---

## Phase 4: Threshold Nudges (Days 13-15)

### Expand DeviceActivityMonitor with Time Thresholds

For each monitored app category (Entertainment, Social, Games), set threshold events at 30min, 1hr, 2hr intervals.

**In `DeviceActivityMonitorExtension.swift` `eventDidReachThreshold`:**

```swift
override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
  // Parse time from event name: "entertainment.30min", "social.1hr" etc.
  let parts = event.rawValue.split(separator: ".")
  guard parts.count == 2 else { return }
  let category = String(parts[0])
  let duration = String(parts[1])

  var record = defaults?.dictionary(forKey: "niyah_usage_thresholds") ?? [:]
  let key = "\(category)_\(duration)_\(dateKey())"
  record[key] = Date().timeIntervalSince1970
  defaults?.set(record, forKey: "niyah_usage_thresholds")
}
```

**Main app reads threshold data** in `scheduleStore` to infer approximate usage:

- "entertainment_1hr" key present for today → user spent 1+ hour on entertainment
- Nudge: "You've used 1h+ of Entertainment apps today. Block them for your next focus block?"

**New notification type**: Local push notification sent when threshold fires during a free slot in the user's calendar schedule.

---

## Phase 5: Group Session + Polish (Days 10-14, parallel)

### Wire `scheduledStartAt` in Group Sessions

- `app/session/propose.tsx`: Compute actual `scheduledStartAt` Date from selected Day + Time chips
- `functions/src/index.ts` `createGroupSession`: Accept and store `scheduledStartAt`
- `app/session/waiting-room.tsx`: If `scheduledStartAt` > now, show countdown; gate "I'm Ready" button until that time

### Fix Group Friend List

Already covered in Phase 0 (0E) — `loadMyFollows` called on mount in `propose.tsx`.

---

## Cut List (in order — cut from bottom when behind)

1. **First cut**: Threshold nudges (Phase 4) — most risk, least visible in demo
2. **Second cut**: DeviceActivityReport chart (Phase 3) — display-only, no functional impact
3. **Third cut**: Calendar smart schedule (Phase 2, full UX) → simplify to gap list with checkboxes instead of full timeline
4. **Fourth cut**: DeviceActivitySchedule recurring blocks → fall back to one-tap quick blocks only
5. **NEVER cut**: Shield fix, bug fixes, one-tap blocking, group sessions E2E, deposit/withdraw

---

## File Change Summary

| File                                                                                           | Change                                                                                                               | Phase     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- |
| `modules/niyah-screentime/ios/NiyahDeviceActivityMonitor/DeviceActivityMonitorExtension.swift` | Add `ManagedSettingsStore.Name.niyahSession`, implement `intervalDidStart`/`intervalDidEnd`, add threshold recording | 0A, 1, 4  |
| `modules/niyah-screentime/ios/NiyahScreenTimeModule.swift`                                     | Add `startScheduledBlocking`, `stopScheduledBlocking`, `stopAllScheduledBlocking`                                    | 1         |
| `modules/niyah-screentime/src/NiyahScreenTimeModule.ts`                                        | Add TS declarations for new methods                                                                                  | 1         |
| `src/config/screentime.ts`                                                                     | Export new scheduling functions                                                                                      | 1         |
| `src/store/scheduleStore.ts`                                                                   | NEW — schedule state management                                                                                      | 1         |
| `src/types/index.ts`                                                                           | Add `BlockSchedule`, `TimeRange`                                                                                     | 1         |
| `app/session/quick-block.tsx`                                                                  | NEW — one-tap blocking screen                                                                                        | 1         |
| `app/session/active.tsx`                                                                       | Add `mode` prop to hide money UI for solo                                                                            | 1         |
| `app/(tabs)/index.tsx`                                                                         | Update CTAs for scheduling                                                                                           | 1, 2      |
| `app/session/schedule-builder.tsx`                                                             | NEW — smart schedule maker with calendar                                                                             | 2         |
| `src/utils/calendarUtils.ts`                                                                   | NEW — gap computation from calendar events                                                                           | 2         |
| `modules/niyah-report/`                                                                        | NEW extension target for DeviceActivityReport                                                                        | 3         |
| `app/session/usage-report.tsx`                                                                 | NEW — usage chart screen                                                                                             | 3         |
| `functions/src/index.ts`                                                                       | linkBankAccount idempotency, rate limit fix, scheduledStartAt in createGroupSession                                  | 0B, 0D, 5 |
| `app/session/withdraw.tsx`                                                                     | Fix "deposit" text, fix success alert                                                                                | 0C        |
| `app/(tabs)/friends.tsx`                                                                       | Cache contact matches in socialStore                                                                                 | 0D        |
| `src/store/socialStore.ts`                                                                     | Add contactMatches, lastContactSyncAt                                                                                | 0D        |
| `app/(tabs)/profile.tsx`                                                                       | Remove PaymentHandlesCard, add LinkedBankCard                                                                        | 0E        |
| `app/session/propose.tsx`                                                                      | Load follows on mount, wire scheduledStartAt                                                                         | 0E, 5     |
| `src/store/sessionStore.ts`                                                                    | Subscribe to onShieldViolation                                                                                       | 0E        |
| `src/constants/config.ts`                                                                      | Add SOLO_MODE_V2 flag                                                                                                | 1         |

---

## Verification Gates

**After Phase 0 (Day 3):**

- `pnpm run ci` passes
- `firebase deploy --only functions` succeeds
- `npx expo prebuild --clean --platform ios && pnpm build:local`
- Shield UI appears on device when opening blocked app
- Group session E2E works on 2 phones

**After Phase 1 (Day 8):**

- One-tap quick block → apps blocked → custom shield appears → surrender/end works
- DeviceActivitySchedule: set a schedule for 5 minutes from now → apps auto-block at that time (even with app killed)

**After Phase 2 (Day 12):**

- Calendar events visible in schedule builder
- Focus blocks generated correctly in gaps
- Confirming schedule creates blocking schedules

**After Phase 3 (Day 11):**

- Usage report chart renders inside app
- No crash from extension memory limit

**Full demo run (Day 17):**

1. Open app → show usage chart (top apps, time-of-day)
2. Build smart schedule from calendar (shows events + suggested focus blocks)
3. Confirm → schedule created, blocking activates at the right time
4. Open blocked app → custom Niyah shield appears
5. Group session: invite friend, both accept, both go active, timer counts, complete + payout
6. Deposit via Apple Pay, withdraw to bank
