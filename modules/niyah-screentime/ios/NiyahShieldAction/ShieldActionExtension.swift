import ManagedSettings
import DeviceActivity

/// Handles user interactions with the Niyah shield screen.
///
/// Primary button   "Stay Focused"      → dismisses shield, stays blocked.
/// Secondary button "Surrender Session" → writes a flag to shared App Group
///                                        UserDefaults so the main app can
///                                        detect and process the surrender,
///                                        then dismisses the shield.
///
/// The main app polls the surrender flag in NiyahScreenTimeModule's
/// checkForNewViolations() loop and emits an "onSurrenderRequested" event.
class NiyahShieldActionExtension: ShieldActionDelegate {

    // ── Shared storage ─────────────────────────────────────────────────────────
    private static let appGroupID       = "group.com.niyah.app"
    private static let surrenderKey     = "niyah_surrender_requested"

    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: Self.appGroupID) ?? .standard
    }

    // ── ShieldActionDelegate overrides ─────────────────────────────────────────

    override func handle(
        _ action: ShieldAction,
        for application: Application,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handleAction(action, completionHandler: completionHandler)
    }

    override func handle(
        _ action: ShieldAction,
        for webDomain: WebDomain,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handleAction(action, completionHandler: completionHandler)
    }

    override func handle(
        _ action: ShieldAction,
        for category: ActivityCategory,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handleAction(action, completionHandler: completionHandler)
    }

    // ── Shared handler ─────────────────────────────────────────────────────────

    private func handleAction(
        _ action: ShieldAction,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        switch action {
        case .primaryButtonPressed:
            // "Stay Focused" — close the shield, return to Home Screen.
            // Blocking stays active.
            completionHandler(.close)

        case .secondaryButtonPressed:
            // "Surrender Session" — flag the request so the main app can
            // detect it on next foreground, then dismiss the shield.
            sharedDefaults.set(true, forKey: Self.surrenderKey)
            sharedDefaults.synchronize()
            completionHandler(.close)

        @unknown default:
            completionHandler(.close)
        }
    }
}
