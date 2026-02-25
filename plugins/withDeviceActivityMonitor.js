/**
 * Expo config plugin that adds the DeviceActivityMonitor App Extension target
 * to the Xcode project.
 *
 * DeviceActivityMonitor is an App Extension that runs in a separate process
 * from the main app. iOS launches it when device activity events occur
 * (interval start/end, usage threshold reached).
 *
 * This plugin:
 *   1. Creates a new "NiyahDeviceActivityMonitor" target in the Xcode project
 *   2. Adds the extension's Swift source file
 *   3. Configures entitlements (FamilyControls, App Groups)
 *   4. Sets the correct bundle ID, deployment target, and build settings
 *   5. Creates the extension's Info.plist
 *
 * The actual Swift code lives in:
 *   modules/niyah-screentime/ios/NiyahDeviceActivityMonitor/
 */
const {
  withXcodeProject,
  withDangerousMod,
  withEntitlementsPlist,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const EXTENSION_NAME = "NiyahDeviceActivityMonitor";
const EXTENSION_BUNDLE_ID_SUFFIX = ".device-activity-monitor";
const APP_GROUP_ID = "group.com.niyah.app";

function withDeviceActivityMonitor(config) {
  const mainBundleId = config.ios?.bundleIdentifier ?? "com.niyah.app";
  const extensionBundleId = mainBundleId + EXTENSION_BUNDLE_ID_SUFFIX;

  // 1. Copy extension source files into the ios/ build directory
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const extDir = path.join(iosRoot, EXTENSION_NAME);

      // Create extension directory
      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir, { recursive: true });
      }

      // Copy the Swift source file from the module
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

      // Write Info.plist for the extension
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>${EXTENSION_NAME}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.deviceactivitymonitor</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).NiyahDeviceActivityMonitorExtension</string>
  </dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extDir, "Info.plist"), infoPlist);

      // Write entitlements for the extension
      const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.family-controls</key>
  <true/>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP_ID}</string>
  </array>
</dict>
</plist>`;
      fs.writeFileSync(
        path.join(extDir, `${EXTENSION_NAME}.entitlements`),
        entitlements,
      );

      return config;
    },
  ]);

  // 2. Add the extension target to the Xcode project
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectRoot = config.modRequest.platformProjectRoot;

    // Check if target already exists
    const existingTarget = project.pbxTargetByName(EXTENSION_NAME);
    if (existingTarget) {
      return config;
    }

    // Add the extension target
    const target = project.addTarget(
      EXTENSION_NAME,
      "app_extension",
      EXTENSION_NAME,
      extensionBundleId,
    );

    // Add source file to the target's build phase
    const extDir = path.join(projectRoot, EXTENSION_NAME);
    const swiftFile = path.join(extDir, "DeviceActivityMonitorExtension.swift");

    if (fs.existsSync(swiftFile)) {
      project.addSourceFile(
        `${EXTENSION_NAME}/DeviceActivityMonitorExtension.swift`,
        { target: target.uuid },
        project.findPBXGroupKey({ name: EXTENSION_NAME }) ||
          project.addPbxGroup(
            [
              "DeviceActivityMonitorExtension.swift",
              "Info.plist",
              `${EXTENSION_NAME}.entitlements`,
            ],
            EXTENSION_NAME,
            EXTENSION_NAME,
          ).uuid,
      );
    }

    // Configure build settings for the extension target
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config = configurations[key];
      if (
        typeof config === "object" &&
        config.buildSettings &&
        config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER ===
          `"${extensionBundleId}"`
      ) {
        config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = "16.0";
        config.buildSettings.SWIFT_VERSION = "5.9";
        config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`;
        config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
        config.buildSettings.GENERATE_INFOPLIST_FILE = "NO";
        config.buildSettings.INFOPLIST_FILE = `${EXTENSION_NAME}/Info.plist`;
        config.buildSettings.CURRENT_PROJECT_VERSION = "1";
        config.buildSettings.MARKETING_VERSION = "1.0";
      }
    }

    // Embed the extension in the main app
    const mainTarget = project.getFirstTarget();
    if (mainTarget) {
      project.addBuildPhase(
        [`${EXTENSION_NAME}.appex`],
        "PBXCopyFilesBuildPhase",
        "Embed App Extensions",
        mainTarget.uuid,
        "app_extension",
      );
    }

    return config;
  });

  return config;
}

module.exports = withDeviceActivityMonitor;
