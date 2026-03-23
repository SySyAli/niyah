import ShieldConfiguration
import ManagedSettings
import UIKit

/// Custom shield appearance shown when a user opens a blocked app during a
/// NIYAH focus session. iOS discovers this extension automatically when apps
/// are shielded via ManagedSettingsStore.
///
/// Primary button  → "Stay Focused"   (handled by NiyahShieldAction extension)
/// Secondary button → "Surrender Session" (handled by NiyahShieldAction extension)
class NiyahShieldConfigurationDataSource: ShieldConfigurationDataSource {

    // ── Brand colours (must be hardcoded — no access to the main app bundle) ──
    private let backgroundDark   = UIColor(red: 26/255,  green: 23/255,  blue: 20/255,  alpha: 1)  // #1A1714
    private let primaryGreen     = UIColor(red: 45/255,  green: 106/255, blue: 79/255,  alpha: 1)  // #2D6A4F
    private let textPrimary      = UIColor(red: 242/255, green: 237/255, blue: 228/255, alpha: 1)  // #F2EDE4
    private let textSecondary    = UIColor(red: 196/255, green: 186/255, blue: 168/255, alpha: 1)  // #C4BAA8
    private let dangerRed        = UIColor(red: 139/255, green: 37/255,  blue: 0/255,   alpha: 1)  // #8B2500

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
        ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: backgroundDark,
            title: ShieldConfiguration.Label(
                text: "Stay Focused",
                font: .systemFont(ofSize: 28, weight: .heavy),
                color: textPrimary
            ),
            subtitle: ShieldConfiguration.Label(
                text: "This app is blocked during your focus session.\nYour stake is on the line — keep going.",
                font: .systemFont(ofSize: 15, weight: .regular),
                color: textSecondary
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Stay Focused",
                font: .systemFont(ofSize: 17, weight: .semibold),
                color: .white
            ),
            primaryButtonBackgroundColor: primaryGreen,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Surrender Session",
                font: .systemFont(ofSize: 15, weight: .medium),
                color: dangerRed
            )
        )
    }
}
