import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

/// DeviceActivityMonitor App Extension.
///
/// iOS launches this extension in a separate process when device activity
/// events occur (interval start/end, threshold reached). It runs independently
/// of the main NIYAH app.
///
/// For NIYAH, we use it to:
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
@available(iOS 16.0, *)
class NiyahDeviceActivityMonitorExtension: DeviceActivityMonitor {

  private static let appGroupID = "group.com.niyah.app"
  private static let violationsKey = "niyah_shield_violations"
  private static let blockingKey = "niyah_is_blocking"

  private var sharedDefaults: UserDefaults {
    UserDefaults(suiteName: Self.appGroupID) ?? .standard
  }

  // ------------------------------------------------------------------
  // MARK: - DeviceActivityMonitor callbacks
  // ------------------------------------------------------------------

  /// Called when a monitored activity interval begins.
  /// We use this to re-apply shields at the start of a NIYAH session
  /// (belt-and-suspenders with the main app's startBlocking call).
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    // The main app already applies shields via ManagedSettingsStore.
    // This callback is a safety net -- no action needed unless we want
    // to re-apply shields from the extension side.
  }

  /// Called when a monitored activity interval ends.
  /// This fires when the NIYAH session timer expires.
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)

    // Clear shields when session ends (backup -- main app also calls stopBlocking)
    let store = ManagedSettingsStore()
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil

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
