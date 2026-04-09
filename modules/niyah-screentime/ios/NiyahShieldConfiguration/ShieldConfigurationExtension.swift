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
    private let backgroundDark   = UIColor(red: 15/255,  green: 15/255,  blue: 15/255,  alpha: 1)  // near-black
    private let primaryGreen     = UIColor(red: 45/255,  green: 106/255, blue: 79/255,  alpha: 1)  // #2D6A4F
    private let textPrimary      = UIColor(red: 242/255, green: 237/255, blue: 228/255, alpha: 1)  // #F2EDE4
    private let textSecondary    = UIColor(red: 160/255, green: 160/255, blue: 160/255, alpha: 1)  // light grey
    private let dangerRed        = UIColor(red: 220/255, green: 60/255,  blue: 60/255,  alpha: 1)  // softer red

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

    // ── Shared config factory ─────────────────────────────────────────────────

    private func makeConfiguration() -> ShieldConfiguration {
        // NOTE: ShieldConfiguration.Label only accepts (text, color). Apple
        // controls fonts for shield UI consistency — no font override allowed.
        ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: backgroundDark,
            icon: nil,
            title: ShieldConfiguration.Label(
                text: "Niyah",
                color: textPrimary
            ),
            subtitle: ShieldConfiguration.Label(
                text: "This app was blocked during\nyour focus session.\n\nYou're saving time.\nKeep going.",
                color: textSecondary
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Stay Focused",
                color: .white
            ),
            primaryButtonBackgroundColor: primaryGreen,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Surrender Session",
                color: dangerRed
            )
        )
    }
}
