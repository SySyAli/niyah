/**
 * Expo config plugin that adds entitlements required for the iOS Screen Time
 * API and related capabilities.
 *
 * Adds:
 *   - FamilyControls entitlement (authorization & app selection)
 *   - App Groups entitlement (data sharing between main app and
 *     DeviceActivityMonitor extension)
 *   - Push Notifications entitlement (session reminders, partner nudges)
 *   - NSFamilyControlsUsageDescription (required Info.plist key)
 *
 * The FamilyControls Development entitlement is available immediately after
 * enabling the capability on the App ID in the Apple Developer portal.
 * The Distribution entitlement requires separate Apple approval (2-4 weeks).
 */
const { withEntitlementsPlist, withInfoPlist } = require("expo/config-plugins");

const APP_GROUP_ID = "group.com.niyah.app";

function withScreenTimeEntitlement(config) {
  // 1. Add entitlements
  config = withEntitlementsPlist(config, (config) => {
    // FamilyControls — required for Screen Time API
    config.modResults["com.apple.developer.family-controls"] = true;

    // App Groups — required for main app <-> DeviceActivityMonitor extension
    // data sharing (UserDefaults suite, shared container)
    config.modResults["com.apple.security.application-groups"] = [APP_GROUP_ID];

    // Push Notifications
    config.modResults["aps-environment"] = "development";

    return config;
  });

  // 2. Add Info.plist usage descriptions
  config = withInfoPlist(config, (config) => {
    config.modResults["NSFamilyControlsUsageDescription"] =
      "NIYAH needs Screen Time access to block distracting apps during your focus sessions.";
    return config;
  });

  return config;
}

module.exports = withScreenTimeEntitlement;
