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

    // ── Shared config factory ─────────────────────────────────────────────────

    private func makeConfiguration() -> ShieldConfiguration {
        // NOTE: ShieldConfiguration.Label only accepts (text, color). Apple
        // controls fonts for shield UI consistency — no font override allowed.
        // The icon is the biggest visual lever we have.
        //
        // Copy sets expectations for the two-tap surrender flow — iOS does
        // not let a shield extension continue the user INTO the blocked app,
        // only dismiss the shield and return to home. Making this explicit
        // prevents confusion about "why didn't it just let me in".
        ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: backgroundDark,
            icon: brandIcon,
            title: ShieldConfiguration.Label(
                text: "Stay Focused",
                color: textPrimary
            ),
            subtitle: ShieldConfiguration.Label(
                text: "Real money is on the line.\nYour stake is safe as long as this app stays closed.\n\nUnlocking will forfeit your stake and return you to your home screen — from there, you can tap the app to use it.",
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
}
