import Foundation
import ManagedSettings

// The named ManagedSettingsStore is shared by name across processes within
// the same team. Both the main app and this extension must use the same
// name to read/write the same shield state — that's how we can clear the
// shields from this extension when the user surrenders.
extension ManagedSettingsStore.Name {
    static let niyahSession = Self("niyah.session")
}

/// Handles user interactions with the Niyah shield screen.
///
/// Primary button   "Stay Focused"      → returns user to home screen, blocking
///                                        stays active so the next launch is
///                                        also blocked.
/// Secondary button "Surrender Session" → clears the shield immediately (so
///                                        the user can use their apps again),
///                                        writes a flag to shared UserDefaults
///                                        so the main app processes the
///                                        surrender on next foreground, and
///                                        attempts to launch the main app via
///                                        a custom URL scheme.
class NiyahShieldActionExtension: ShieldActionDelegate {

    // ── Shared storage ─────────────────────────────────────────────────────────
    private static let appGroupID       = "group.com.niyah.app"
    private static let surrenderKey     = "niyah_surrender_requested"
    private static let blockingKey      = "niyah_is_blocking"

    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: Self.appGroupID) ?? .standard
    }

    // ── ShieldActionDelegate overrides ─────────────────────────────────────────

    override func handle(
        action: ShieldAction,
        for application: ApplicationToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handleAction(action, completionHandler: completionHandler)
    }

    override func handle(
        action: ShieldAction,
        for webDomain: WebDomainToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        handleAction(action, completionHandler: completionHandler)
    }

    override func handle(
        action: ShieldAction,
        for category: ActivityCategoryToken,
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
            // "Stay Focused" — return user to Home Screen. Blocking stays active.
            completionHandler(.close)

        case .secondaryButtonPressed:
            // "Surrender Session" — set a flag and open the main app.
            // Blocking stays ACTIVE until the user confirms surrender in the
            // Niyah app (type QUIT). This prevents the desync where the shield
            // used to unblock apps immediately but the app still showed the
            // session as active.
            //
            //   1. Write the surrender flag to shared UserDefaults so the main
            //      app can detect the request on foreground.
            //   2. Attempt to launch Niyah via the custom URL scheme so the
            //      user lands directly in the surrender confirmation flow.
            //   3. Do NOT clear shields — the app will call stopBlocking()
            //      after the user confirms surrender.
            NSLog("[NiyahShieldAction] Surrender tapped — setting flag, keeping shields active")
            sharedDefaults.set(true, forKey: Self.surrenderKey)
            sharedDefaults.synchronize()
            openMainApp(urlString: "niyah://surrender")
            completionHandler(.close)

        @unknown default:
            completionHandler(.close)
        }
    }

    /// Opens the Niyah main app from within the shield extension process.
    ///
    /// The documented Apple API does NOT support launching the host app from
    /// a ShieldActionExtension — the only officially supported responses are
    /// `.close`, `.defer`, and `.none`. However, instantiating a fresh
    /// `NSExtensionContext` and calling `open(_:completionHandler:)` on it
    /// bypasses that restriction. This is the same trick used by Opal and
    /// the widely-adopted kingstinct library.
    private func openMainApp(urlString: String) {
        guard let url = URL(string: urlString) else { return }
        NSExtensionContext().open(url) { _ in }
    }
}
