/**
 * Expo config plugin that adds two Shield App Extension targets to the
 * Xcode project:
 *
 *   NiyahShieldConfiguration — ShieldConfigurationDataSource
 *     Shows custom Niyah branding instead of Apple's default shield screen
 *     when a user opens a blocked app during a focus session.
 *     NSExtensionPointIdentifier: com.apple.managed-settings.shield-config
 *
 *   NiyahShieldAction — ShieldActionDelegate
 *     Handles "Stay Focused" (close) and "Surrender Session" (flag +
 *     close) button taps on the shield screen.
 *     NSExtensionPointIdentifier: com.apple.managed-settings.shield-action
 *
 * Both extensions share the main app's App Group so the shield action can
 * write a surrender flag that the main app reads via violation polling.
 *
 * Swift source lives in:
 *   modules/niyah-screentime/ios/NiyahShieldConfiguration/
 *   modules/niyah-screentime/ios/NiyahShieldAction/
 */
const { withXcodeProject, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP_ID = "group.com.niyah.app";

// ---------------------------------------------------------------------------
// Extension descriptors
// ---------------------------------------------------------------------------

const SHIELD_CONFIG = {
  name: "NiyahShieldConfiguration",
  bundleSuffix: ".shield-config",
  sourceFile: "ShieldConfigurationExtension.swift",
  extensionPoint: "com.apple.managed-settings.shield-config",
  principalClass: "$(PRODUCT_MODULE_NAME).NiyahShieldConfigurationDataSource",
  frameworks: ["ShieldConfiguration", "ManagedSettings", "UIKit"],
};

const SHIELD_ACTION = {
  name: "NiyahShieldAction",
  bundleSuffix: ".shield-action",
  sourceFile: "ShieldActionExtension.swift",
  extensionPoint: "com.apple.managed-settings.shield-action",
  principalClass: "$(PRODUCT_MODULE_NAME).NiyahShieldActionExtension",
  frameworks: ["ManagedSettings", "DeviceActivity"],
};

const EXTENSIONS = [SHIELD_CONFIG, SHIELD_ACTION];

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

function withShieldExtensions(config) {
  const mainBundleId = config.ios?.bundleIdentifier ?? "com.niyah.app";
  const appVersion = config.version ?? "1.0.0";

  // ── Step 1: Copy source files and write Info.plist + entitlements ──────────
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const projectRoot = config.modRequest.projectRoot;

      for (const ext of EXTENSIONS) {
        const extDir = path.join(iosRoot, ext.name);
        const extensionBundleId = mainBundleId + ext.bundleSuffix;

        if (!fs.existsSync(extDir)) {
          fs.mkdirSync(extDir, { recursive: true });
        }

        // Copy Swift source
        const srcFile = path.join(
          projectRoot,
          "modules",
          "niyah-screentime",
          "ios",
          ext.name,
          ext.sourceFile,
        );
        const destFile = path.join(extDir, ext.sourceFile);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
        }

        // Info.plist
        const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>${ext.name}</string>
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
\t<string>${appVersion}</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>${ext.extensionPoint}</string>
\t\t<key>NSExtensionPrincipalClass</key>
\t\t<string>${ext.principalClass}</string>
\t</dict>
</dict>
</plist>`;
        fs.writeFileSync(path.join(extDir, "Info.plist"), infoPlist);

        // Entitlements — both extensions need FamilyControls + App Groups
        // so ManagedSettings APIs and shared UserDefaults are accessible.
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
          path.join(extDir, `${ext.name}.entitlements`),
          entitlements,
        );

        console.log(
          `[withShieldExtensions] Prepared ${ext.name} → ${extensionBundleId}`,
        );
      }

      return config;
    },
  ]);

  // ── Step 2: Add extension targets to Xcode project ─────────────────────────
  // NOTE: addTarget() with type "app_extension" automatically creates a
  // "Copy Files" embed phase on the main target, so we must NOT add our own.
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const mainTarget = project.getFirstTarget();

    for (const ext of EXTENSIONS) {
      const extensionBundleId = mainBundleId + ext.bundleSuffix;

      // Skip if target already exists (idempotent)
      if (project.pbxTargetByName(ext.name)) {
        continue;
      }

      // --- Create the extension target ---
      // This also creates a "Copy Files" phase on the main target that
      // embeds the .appex into the app bundle (dstSubfolderSpec 13).
      const target = project.addTarget(
        ext.name,
        "app_extension",
        ext.name,
        extensionBundleId,
      );

      // --- Add PBXGroup for the extension files ---
      const groupKey = project.pbxCreateGroup(ext.name, ext.name);
      project.addFile(`${ext.name}/${ext.sourceFile}`, groupKey, {
        target: target.uuid,
        lastKnownFileType: "sourcecode.swift",
      });

      // Attach group to main project group
      const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
      project.addToPbxGroup(groupKey, mainGroupKey);

      // --- Configure build settings for device-only iOS build ---
      const configurations = project.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        const buildConfig = configurations[key];
        if (
          typeof buildConfig === "object" &&
          buildConfig.buildSettings &&
          buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER ===
            `"${extensionBundleId}"`
        ) {
          // Build the -weak_framework linker flags for Screen Time frameworks
          const frameworkFlags = ext.frameworks
            .map((fw) => `-weak_framework ${fw}`)
            .join(" ");
          Object.assign(buildConfig.buildSettings, {
            IPHONEOS_DEPLOYMENT_TARGET: "16.0",
            SWIFT_VERSION: "5.9",
            CODE_SIGN_ENTITLEMENTS: `${ext.name}/${ext.name}.entitlements`,
            CODE_SIGN_STYLE: "Automatic",
            TARGETED_DEVICE_FAMILY: '"1"',
            GENERATE_INFOPLIST_FILE: "NO",
            INFOPLIST_FILE: `${ext.name}/Info.plist`,
            CURRENT_PROJECT_VERSION: "1",
            MARKETING_VERSION: appVersion,
            // Shield extensions use ManagedSettings — device-only framework.
            // Restricting to iphoneos prevents simulator build failures.
            SUPPORTED_PLATFORMS: "iphoneos",
            SDKROOT: "iphoneos",
            LD_RUNPATH_SEARCH_PATHS:
              '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
            OTHER_LDFLAGS: `"$(inherited) ${frameworkFlags}"`,
          });
        }
      }

      // --- Add target dependency so extensions build before the main app ---
      project.addTargetDependency(mainTarget.uuid, [target.uuid]);

      console.log(`[withShieldExtensions] Registered ${ext.name} in Xcode`);
    }

    return config;
  });

  return config;
}

module.exports = withShieldExtensions;
