/**
 * Expo config plugin that adds the DeviceActivityMonitor App Extension target
 * to the Xcode project.
 *
 * DeviceActivityMonitor is an App Extension that runs in a separate process
 * from the main app. iOS launches it when device activity events occur
 * (interval start/end, usage threshold reached).
 *
 * This plugin:
 *   1. Copies extension source files into the ios/ build directory
 *   2. Creates the extension target with proper build phases
 *   3. Configures entitlements (FamilyControls, App Groups)
 *   4. Adds a target dependency + embed phase to the main app target
 *
 * The actual Swift code lives in:
 *   modules/niyah-screentime/ios/NiyahDeviceActivityMonitor/
 */
const { withXcodeProject, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const EXTENSION_NAME = "NiyahDeviceActivityMonitor";
const EXTENSION_BUNDLE_ID_SUFFIX = ".device-activity-monitor";
const APP_GROUP_ID = "group.com.niyah.app";

function withDeviceActivityMonitor(config) {
  const mainBundleId = config.ios?.bundleIdentifier ?? "com.niyah.app";
  const extensionBundleId = mainBundleId + EXTENSION_BUNDLE_ID_SUFFIX;

  // Step 1: Copy extension source files into ios/ build directory
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const extDir = path.join(iosRoot, EXTENSION_NAME);

      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir, { recursive: true });
      }

      // Copy Swift source
      const srcFile = path.join(
        config.modRequest.projectRoot,
        "modules",
        "niyah-screentime",
        "ios",
        "NiyahDeviceActivityMonitor",
        "DeviceActivityMonitorExtension.swift",
      );
      const destFile = path.join(
        extDir,
        "DeviceActivityMonitorExtension.swift",
      );
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
      }

      // Write Info.plist
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>${EXTENSION_NAME}</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
\t<key>CFBundleShortVersionString</key>
\t<string>1.0</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.deviceactivitymonitor</string>
\t\t<key>NSExtensionPrincipalClass</key>
\t\t<string>$(PRODUCT_MODULE_NAME).NiyahDeviceActivityMonitorExtension</string>
\t</dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extDir, "Info.plist"), infoPlist);

      // Write entitlements
      const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.family-controls</key>
\t<true/>
\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>${APP_GROUP_ID}</string>
\t</array>
</dict>
</plist>`;
      fs.writeFileSync(
        path.join(extDir, `${EXTENSION_NAME}.entitlements`),
        entitlements,
      );

      return config;
    },
  ]);

  // Step 2: Add extension target to Xcode project
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;

    // Skip if target already exists
    if (project.pbxTargetByName(EXTENSION_NAME)) {
      return config;
    }

    // --- Create the extension target ---
    // addTarget creates: PBXNativeTarget, product reference, default build configs
    const target = project.addTarget(
      EXTENSION_NAME,
      "app_extension",
      EXTENSION_NAME,
      extensionBundleId,
    );

    // --- Add PBXGroup for the extension files ---
    const groupKey = project.pbxCreateGroup(EXTENSION_NAME, EXTENSION_NAME);

    // Add file references to the group
    const swiftFileRef = project.addFile(
      `${EXTENSION_NAME}/DeviceActivityMonitorExtension.swift`,
      groupKey,
      { target: target.uuid, lastKnownFileType: "sourcecode.swift" },
    );

    // Add the group to the main project group
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(groupKey, mainGroupKey);

    // --- Configure build settings ---
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (
        typeof buildConfig === "object" &&
        buildConfig.buildSettings &&
        buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER ===
          `"${extensionBundleId}"`
      ) {
        Object.assign(buildConfig.buildSettings, {
          IPHONEOS_DEPLOYMENT_TARGET: "16.0",
          SWIFT_VERSION: "5.9",
          CODE_SIGN_ENTITLEMENTS: `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`,
          CODE_SIGN_STYLE: "Automatic",
          TARGETED_DEVICE_FAMILY: '"1,2"',
          GENERATE_INFOPLIST_FILE: "NO",
          INFOPLIST_FILE: `${EXTENSION_NAME}/Info.plist`,
          CURRENT_PROJECT_VERSION: "1",
          MARKETING_VERSION: "1.0",
          // Ensure the extension can import DeviceActivity etc.
          LD_RUNPATH_SEARCH_PATHS:
            '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
        });
      }
    }

    // --- Add target dependency from main app to extension ---
    const mainTarget = project.getFirstTarget();
    if (mainTarget && mainTarget.firstTarget) {
      project.addTargetDependency(mainTarget.firstTarget.uuid, [target.uuid]);
    }

    return config;
  });

  return config;
}

module.exports = withDeviceActivityMonitor;
