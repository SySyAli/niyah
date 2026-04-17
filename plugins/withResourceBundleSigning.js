const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# withResourceBundleSigning";

const INJECT = `
    ${MARKER}
    # Runs at tail of post_install, overrides settings set by react_native_post_install.
    installer.target_installation_results.pod_target_installation_results.each do |pod_name, result|
      result.resource_bundle_targets.each do |rbt|
        rbt.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
          config.build_settings['CODE_SIGN_IDENTITY'] = ''
          config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = '-'
        end
      end
    end
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == 'com.apple.product-type.bundle'
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
          config.build_settings['CODE_SIGN_IDENTITY'] = ''
          config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = '-'
        end
      end
    end
`;

module.exports = function withResourceBundleSigning(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes(MARKER)) return cfg;

      // Match the closing `  end` of post_install immediately followed by
      // `end` of target block at end of file. Inject before the post_install end.
      const re = /(\n  end\nend\s*)$/;
      if (!re.test(podfile)) {
        throw new Error(
          "withResourceBundleSigning: could not locate end of post_install block in Podfile",
        );
      }
      podfile = podfile.replace(re, `${INJECT}\n  end\nend\n`);

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
