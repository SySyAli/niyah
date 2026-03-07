/**
 * Expo config plugin that copies google-services.json from firebase/ into
 * android/app/ so Firebase works on Android during expo prebuild / EAS Build.
 *
 * Mirrors withGoogleServicesPlist.js which does the same for iOS.
 * Required because the @react-native-google-signin/google-signin plugin is
 * configured with `iosUrlScheme`, which routes it through the Firebase-free
 * path that skips AndroidConfig.GoogleServices.withGoogleServicesFile.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withGoogleServicesJson(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;

      const src = path.join(projectRoot, "firebase", "google-services.json");
      const dest = path.join(androidRoot, "app", "google-services.json");

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      } else {
        console.warn(
          "[withGoogleServicesJson] google-services.json not found at firebase/google-services.json",
        );
      }

      return config;
    },
  ]);
}

module.exports = withGoogleServicesJson;
