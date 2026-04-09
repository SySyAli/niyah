/**
 * Expo config plugin that patches the fmt library after pod install to
 * fix a build failure on Xcode 26.4+.
 *
 * Xcode 26.4's Apple Clang is stricter about C++20 consteval functions.
 * The fmt 11.x library (vendored by React Native 0.81) uses consteval
 * in a way that no longer compiles under this compiler, producing:
 *
 *   error: call to consteval function
 *   'fmt::basic_format_string<char, unsigned int>::basic_format_string'
 *   is not a constant expression
 *
 * The upstream fix is in React Native 0.83+. For RN 0.81 the workaround
 * is to disable FMT_USE_CONSTEVAL in fmt/base.h, which falls back to a
 * runtime format string check (negligible perf impact in dev builds).
 *
 * Reference: https://github.com/expo/expo/issues/44229
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PATCH_MARKER = "# [withFmtConstevalFix]";

const PATCH_RUBY = `
    ${PATCH_MARKER} Disable fmt consteval for Xcode 26.4+ (RN 0.81 compat)
    # In RN 0.81 the fmt headers are shipped inside the prebuilt
    # ReactNativeDependencies pod, not a standalone fmt pod. The files are
    # read-only (chmod 0444) so we have to chmod before writing. The public
    # headers directory is a symlink — patching the real file updates both.
    [
      File.join(installer.sandbox.root.to_s, 'ReactNativeDependencies', 'Headers', 'fmt', 'base.h'),
      File.join(installer.sandbox.root.to_s, 'ReactNativeDependencies', 'framework', 'packages', 'react-native', 'ReactNativeDependencies.xcframework', 'Headers', 'fmt', 'base.h'),
    ].each do |fmt_base|
      next unless File.exist?(fmt_base) && !File.symlink?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '#  define FMT_USE_CONSTEVAL 0 // [niyah] Xcode 26.4 compat')
      next if patched == content
      File.chmod(0644, fmt_base)
      File.write(fmt_base, patched)
    end
`;

function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes(PATCH_MARKER)) {
        return config;
      }

      // Insert before the final `end` of the post_install block, matching
      // the pattern used by withFollyCoroutinesFix.
      const postInstallMatch = podfile.match(
        /(post_install\s+do\s*\|installer\|[\s\S]*?)(^  end)/m,
      );

      if (postInstallMatch) {
        const insertIndex = postInstallMatch.index + postInstallMatch[1].length;
        podfile =
          podfile.slice(0, insertIndex) +
          PATCH_RUBY +
          podfile.slice(insertIndex);
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
}

module.exports = withFmtConstevalFix;
