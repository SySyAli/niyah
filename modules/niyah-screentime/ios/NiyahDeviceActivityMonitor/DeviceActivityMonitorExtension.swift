import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

/// DeviceActivityMonitor App Extension.
///
/// iOS launches this extension in a separate process when device activity
/// events occur (interval start/end, threshold reached). It runs independently
/// of the main Niyah app.
///
/// For Niyah, we use it to:
///   1. Detect when a user opens a shielded app during a session
///   2. Record the violation timestamp to shared UserDefaults
///   3. The main app polls or observes shared defaults to trigger money deduction
///
/// Communication with main app:
///   - Shared UserDefaults via App Group ("group.com.niyah.app")
///   - The extension writes violation events; the main app reads them.
///
/// IMPORTANT: This extension has no access to the main app's memory, Expo
/// modules, or React Native runtime. It can only use Foundation, the Screen
/// Time frameworks, and the shared App Group container.

// The extension runs in a separate process and cannot access the main app's sources,
// so we must redeclare the named store here.
@available(iOS 16.0, *)
extension ManagedSettingsStore.Name {
  static let niyahSession = Self("niyah.session")
}

@available(iOS 16.0, *)
class NiyahDeviceActivityMonitorExtension: DeviceActivityMonitor {

  private static let appGroupID = "group.com.niyah.app"
  private static let selectionKey = "niyah_app_selection"
  private static let violationsKey = "niyah_shield_violations"
  private static let blockingKey = "niyah_is_blocking"

  private var sharedDefaults: UserDefaults {
    UserDefaults(suiteName: Self.appGroupID) ?? .standard
  }

  // ------------------------------------------------------------------
  // MARK: - DeviceActivityMonitor callbacks
  // ------------------------------------------------------------------

  /// Called when a monitored activity interval begins.
  /// Re-applies shields from the extension side. This is critical for scheduled
  /// blocking — the main app may not be running, so the extension must read the
  /// saved FamilyActivitySelection from shared UserDefaults and apply it.
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    applyShieldsFromSavedSelection()
    sharedDefaults.set(true, forKey: Self.blockingKey)
  }

  /// Called when a monitored activity interval ends.
  /// This fires when the Niyah session timer expires.
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)

    // Clear shields when session ends (backup -- main app also calls stopBlocking).
    // MUST use the same named store (.niyahSession) as the main app.
    let store = ManagedSettingsStore(named: .niyahSession)
    store.clearAllSettings()

    sharedDefaults.set(false, forKey: Self.blockingKey)
  }

  /// Called when a usage threshold is reached for a specific event.
  /// We use this to detect "user attempted to use a blocked app"
  /// by setting very short thresholds on shielded apps.
  override func eventDidReachThreshold(
    _ event: DeviceActivityEvent.Name,
    activity: DeviceActivityName
  ) {
    super.eventDidReachThreshold(event, activity: activity)

    // Only record if we're in an active blocking session
    guard sharedDefaults.bool(forKey: Self.blockingKey) else { return }

    // Record the violation timestamp
    recordViolation()
  }

  /// Called when the user tries to use a shielded app and the warning is shown.
  /// This is the most direct signal that a user hit a blocked app.
  override func intervalWillStartWarning(for activity: DeviceActivityName) {
    super.intervalWillStartWarning(for: activity)
    // Not used for our current flow -- we rely on shield + threshold events.
  }

  override func intervalWillEndWarning(for activity: DeviceActivityName) {
    super.intervalWillEndWarning(for: activity)
    // Could show a "session ending soon" notification in the future.
  }

  // ------------------------------------------------------------------
  // MARK: - Shield application from saved selection
  // ------------------------------------------------------------------

  /// Reads the FamilyActivitySelection that the main app persisted to shared
  /// UserDefaults and applies shields to the named ManagedSettingsStore.
  /// This allows the extension to block apps even when the main app isn't running.
  private func applyShieldsFromSavedSelection() {
    let store = ManagedSettingsStore(named: .niyahSession)
    guard let data = sharedDefaults.data(forKey: Self.selectionKey),
          let selection = try? PropertyListDecoder().decode(
            FamilyActivitySelection.self, from: data
          )
    else { return }

    if !selection.applicationTokens.isEmpty {
      store.shield.applications = selection.applicationTokens
    }
    if !selection.categoryTokens.isEmpty {
      store.shield.applicationCategories =
        ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
    }
    if !selection.webDomainTokens.isEmpty {
      store.shield.webDomains = selection.webDomainTokens
    }
  }

  // ------------------------------------------------------------------
  // MARK: - Violation recording
  // ------------------------------------------------------------------

  /// Append a violation timestamp to the shared defaults array.
  /// The main app reads this array to deduct money and show UI.
  private func recordViolation() {
    var violations = sharedDefaults.array(forKey: Self.violationsKey) as? [Double] ?? []
    violations.append(Date().timeIntervalSince1970 * 1000) // JS-compatible ms timestamp
    sharedDefaults.set(violations, forKey: Self.violationsKey)
  }
}
