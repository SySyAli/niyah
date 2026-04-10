import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Custom shield appearance shown when a user opens a blocked app during a
/// Niyah focus session. iOS discovers this extension automatically when apps
/// are shielded via ManagedSettingsStore.
///
/// Primary button  → "Stay Focused"     (returns user to home screen)
/// Secondary button → "Surrender Session" (forfeits stake, ends session)
class NiyahShieldConfigurationDataSource: ShieldConfigurationDataSource {

    // ── Brand colours (must be hardcoded — no access to the main app bundle) ──
    private let backgroundDark   = UIColor(red: 15/255,  green: 15/255,  blue: 20/255,  alpha: 1)  // deeper near-black with blue tint
    private let primaryGreen     = UIColor(red: 45/255,  green: 106/255, blue: 79/255,  alpha: 1)  // #2D6A4F
    private let accentGreen      = UIColor(red: 82/255,  green: 183/255, blue: 136/255, alpha: 1)  // brighter for the icon
    private let textPrimary      = UIColor(red: 242/255, green: 237/255, blue: 228/255, alpha: 1)  // #F2EDE4
    private let textSecondary    = UIColor(red: 170/255, green: 170/255, blue: 180/255, alpha: 1)  // softer grey
    private let dangerRed        = UIColor(red: 220/255, green: 60/255,  blue: 60/255,  alpha: 1)  // softer red

    // SF Symbol icon, rendered large and tinted green. Shows prominently at
    // the top of the shield — the single biggest differentiator from Apple's
    // default grey "App Restricted" screen.
    private var brandIcon: UIImage? {
        let config = UIImage.SymbolConfiguration(pointSize: 72, weight: .semibold)
        return UIImage(systemName: "hourglass.circle.fill", withConfiguration: config)?
            .withTintColor(accentGreen, renderingMode: .alwaysOriginal)
    }

    // ── ShieldConfigurationDataSource overrides ────────────────────────────────

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        makeConfiguration()
    }

    override func configuration(
        shielding application: Application,
        in category: ActivityCategory
    ) -> ShieldConfiguration {
        makeConfiguration()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        makeConfiguration()
    }

    override func configuration(
        shielding webDomain: WebDomain,
        in category: ActivityCategory
    ) -> ShieldConfiguration {
        makeConfiguration()
    }

    // ── App Group for reading session context from main app ─────────────────

    private let appGroupID = "group.com.niyah.app"
    private let sessionContextKey = "niyah_session_context"

    // ── Shared config factory ─────────────────────────────────────────────────

    private func makeConfiguration() -> ShieldConfiguration {
        let subtitleText = buildSubtitle()

        ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: backgroundDark,
            icon: brandIcon,
            title: ShieldConfiguration.Label(
                text: "Stay Focused",
                color: textPrimary
            ),
            subtitle: ShieldConfiguration.Label(
                text: subtitleText,
                color: textSecondary
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Back to Focus",
                color: .white
            ),
            primaryButtonBackgroundColor: primaryGreen,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Unlock & forfeit stake",
                color: dangerRed
            )
        )
    }

    /// Build a dynamic subtitle based on session context from the main app.
    /// For group sessions, shows participant names and fun messages.
    /// Falls back to the default solo message if no context is available.
    private func buildSubtitle() -> String {
        guard let defaults = UserDefaults(suiteName: appGroupID),
              let json = defaults.string(forKey: sessionContextKey),
              let data = json.data(using: .utf8),
              let context = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let names = context["names"] as? [String],
              !names.isEmpty else {
            // Solo / quick-block — default message
            return "Real money is on the line.\nYour stake is safe as long as this app stays closed.\n\nUnlocking will forfeit your stake and return you to your home screen — from there, you can tap the app to use it."
        }

        let namesList = formatNames(names)
        let stake = context["stake"] as? Int ?? 0
        let stakeStr = stake > 0 ? String(format: "$%.2f", Double(stake) / 100.0) : nil

        // Rotate fun messages based on the current minute — each time the user
        // opens a blocked app they may see a different quip.
        let messages: [String] = buildMessages(namesList: namesList, stakeStr: stakeStr)
        let index = Int(Date().timeIntervalSince1970 / 60) % messages.count

        return messages[index] + "\n\nUnlocking will forfeit your stake and return you to your home screen."
    }

    private func buildMessages(namesList: String, stakeStr: String?) -> [String] {
        var messages = [
            "\(namesList) are counting on you.\nStay strong!",
            "\(namesList) will know if you open this app.\nDon't be the one who quits.",
            "Your friends are focusing right now.\n\(namesList) stayed off their phones — can you?",
        ]
        if let stake = stakeStr {
            messages.append("\(stake) says you can't stay off this app.\nProve them wrong.")
            messages.append("\(namesList) have \(stake) riding on this.\nDon't let them down.")
        }
        return messages
    }

    /// Format ["Sarah", "Mike", "Jake"] → "Sarah, Mike, and Jake"
    private func formatNames(_ names: [String]) -> String {
        switch names.count {
        case 1: return names[0]
        case 2: return "\(names[0]) and \(names[1])"
        default:
            let allButLast = names.dropLast().joined(separator: ", ")
            return "\(allButLast), and \(names.last!)"
        }
    }
}
