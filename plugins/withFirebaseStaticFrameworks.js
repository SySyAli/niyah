/**
 * Expo config plugin that fixes Firebase + React Native static framework
 * build conflicts.
 *
 * Problem:
 *   Firebase iOS SDK v11+ is written in Swift and requires building as
 *   frameworks (not static libraries). Several Firebase sub-pods depend
 *   on Obj-C pods that lack modulemaps. CocoaPods refuses to integrate
 *   them as static libraries unless modular_headers are enabled.
 *
 * Solution:
 *   1. Enable modular headers for specific Firebase dependency pods
 *      (NOT globally, because that breaks gRPC-Core).
 *   2. Set CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
 *      for all pod targets in the post_install hook.
 *
 * Requires: ios.useFrameworks = "static" in Podfile.properties.json
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_MARKER = "# [withFirebaseStaticFrameworks]";

// Pods that need :modular_headers => true for Firebase static framework builds
const MODULAR_HEADER_PODS = [
  "FirebaseAuthInterop",
  "FirebaseAppCheckInterop",
  "FirebaseFirestoreInternal",
  "GoogleUtilities",
  "RecaptchaInterop",
  "FirebaseCoreExtension",
];

function withFirebaseStaticFrameworks(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;

      // Ensure ios.useFrameworks = "static" is set in Podfile.properties.json
      // so that `use_frameworks! :linkage => :static` is activated in the Podfile.
      const propsPath = path.join(iosRoot, "Podfile.properties.json");
      if (fs.existsSync(propsPath)) {
        const props = JSON.parse(fs.readFileSync(propsPath, "utf8"));
        if (props["ios.useFrameworks"] !== "static") {
          props["ios.useFrameworks"] = "static";
          fs.writeFileSync(propsPath, JSON.stringify(props, null, 2) + "\n");
        }
      }

      const podfilePath = path.join(iosRoot, "Podfile");
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes(PATCH_MARKER)) {
        return config;
      }

      // 1. Add per-pod modular headers after use_expo_modules!
      const modularHeaderLines = MODULAR_HEADER_PODS.map(
        (pod) => `  pod '${pod}', :modular_headers => true`,
      ).join("\n");

      const modularHeaderPatch = `\n  ${PATCH_MARKER} Enable modular headers for Firebase deps\n${modularHeaderLines}\n`;

      // Insert after use_expo_modules!
      const useExpoModulesIdx = podfile.indexOf("use_expo_modules!");
      if (useExpoModulesIdx !== -1) {
        const insertAfter = useExpoModulesIdx + "use_expo_modules!".length;
        podfile =
          podfile.slice(0, insertAfter) +
          modularHeaderPatch +
          podfile.slice(insertAfter);
      }

      // 2. Add CLANG_ALLOW_NON_MODULAR_INCLUDES post_install patch
      const postInstallPatch = `
    ${PATCH_MARKER} Allow non-modular includes for Firebase + RN bridge compatibility
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      const postInstallMatch = podfile.match(
        /(post_install\s+do\s*\|installer\|[\s\S]*?)(^  end)/m,
      );

      if (postInstallMatch) {
        const insertIndex = postInstallMatch.index + postInstallMatch[1].length;
        podfile =
          podfile.slice(0, insertIndex) +
          postInstallPatch +
          podfile.slice(insertIndex);
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
}

module.exports = withFirebaseStaticFrameworks;
