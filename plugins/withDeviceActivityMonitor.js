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
  // Extension version MUST match the main app or Xcode rejects the build
  const appVersion = config.version ?? "1.0.0";

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
	<key>CFBundleShortVersionString</key>
\t<string>${appVersion}</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.deviceactivity.monitor-extension</string>
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
    const sourceFileName = "DeviceActivityMonitorExtension.swift";

    // NOTE: Do NOT use addSourceFile here. The xcode npm package's
    // addSourceFile with { target } option is broken — it compares target
    // UUIDs against build-phase UUIDs (which never match), so the file
    // always lands in the main app target's Sources phase. Additionally,
    // addTarget("app_extension") does NOT create a Sources build phase
    // for the extension target. We construct everything manually.

    // 1. Create PBXFileReference and add to the extension's group
    const file = project.addFile(sourceFileName, groupKey, {});

    // 2. Create PBXBuildFile referencing the source file
    const buildFileUuid = project.generateUuid();
    project.hash.project.objects["PBXBuildFile"][buildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: file.fileRef,
      fileRef_comment: sourceFileName,
    };
    project.hash.project.objects["PBXBuildFile"][buildFileUuid + "_comment"] =
      `${sourceFileName} in Sources`;

    // 3. Create a Sources build phase for the extension target
    const sourcesPhaseUuid = project.generateUuid();
    project.hash.project.objects["PBXSourcesBuildPhase"][sourcesPhaseUuid] = {
      isa: "PBXSourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [
        { value: buildFileUuid, comment: `${sourceFileName} in Sources` },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };
    project.hash.project.objects["PBXSourcesBuildPhase"][
      sourcesPhaseUuid + "_comment"
    ] = "Sources";

    // 4. Register the Sources phase on the extension target
    const extNative = project.pbxNativeTargetSection()[target.uuid];
    extNative.buildPhases.push({
      value: sourcesPhaseUuid,
      comment: "Sources",
    });

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
          DEVELOPMENT_TEAM: "4R55F73KCP",
          TARGETED_DEVICE_FAMILY: '"1,2"',
          GENERATE_INFOPLIST_FILE: "NO",
          INFOPLIST_FILE: `${EXTENSION_NAME}/Info.plist`,
          CURRENT_PROJECT_VERSION: "1",
          MARKETING_VERSION: appVersion,
          // Ensure the extension can import DeviceActivity etc.
          LD_RUNPATH_SEARCH_PATHS:
            '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
          // DeviceActivityMonitor uses Screen Time APIs — not available on the
          // simulator. Restricting to iphoneos prevents the extension from being
          // embedded in simulator builds (which would cause install failures).
          SUPPORTED_PLATFORMS: "iphoneos",
          SDKROOT: "iphoneos",
          OTHER_LDFLAGS:
            '"$(inherited) -weak_framework DeviceActivity -weak_framework ManagedSettings"',
        });
      }
    }

    // Add target dependency so the extension builds before the main app.
    // addTarget("app_extension") already creates a "Copy Files" embed phase
    // on the main target (same as withShieldExtensions.js). The original
    // lstat failures were caused by missing SDKROOT: "iphoneos" — without
    // it, the build system tried to compile for simulator and hit device-only
    // frameworks.
    const mainTarget = project.getFirstTarget();
    project.addTargetDependency(mainTarget.uuid, [target.uuid]);

    return config;
  });

  return config;
}

module.exports = withDeviceActivityMonitor;
