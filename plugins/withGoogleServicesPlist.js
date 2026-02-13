/**
 * Expo config plugin that copies GoogleService-Info.plist into the iOS project
 * AND adds it to the Xcode project so it's included in the app bundle.
 * Replaces the @react-native-firebase/app plugin's plist handling.
 *
 * We cannot use xcodeProject.addResourceFile() because the xcode library's
 * correctForResourcesPath() crashes when there is no "Resources" group in
 * the Xcode project (Expo-generated projects don't have one). Instead we
 * manually add the PBXFileReference, PBXBuildFile, PBXGroup entry, and
 * PBXResourcesBuildPhase entry.
 */
const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withGoogleServicesPlist(config) {
  // Step 1: Copy the file into the ios/<ProjectName>/ directory
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName;

      const src = path.join(projectRoot, "GoogleService-Info.plist");
      const dest = path.join(iosRoot, projectName, "GoogleService-Info.plist");

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      } else {
        console.warn(
          "[withGoogleServicesPlist] GoogleService-Info.plist not found at project root",
        );
      }

      return config;
    },
  ]);

  // Step 2: Add the file to the Xcode project's resources so it gets bundled
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName;
    const plistPath = `${projectName}/GoogleService-Info.plist`;

    // Don't add if it's already there
    if (xcodeProject.hasFile(plistPath)) {
      return config;
    }

    const fileRefUuid = xcodeProject.generateUuid();
    const buildFileUuid = xcodeProject.generateUuid();

    // 1. Add PBXFileReference
    xcodeProject.addToPbxFileReferenceSection({
      uuid: fileRefUuid,
      fileRef: fileRefUuid,
      basename: "GoogleService-Info.plist",
      path: plistPath,
      sourceTree: '"<group>"',
      lastKnownFileType: "text.plist.xml",
      group: "Resources",
    });

    // 2. Add PBXBuildFile (links the file ref to the target)
    xcodeProject.addToPbxBuildFileSection({
      uuid: buildFileUuid,
      fileRef: fileRefUuid,
      basename: "GoogleService-Info.plist",
      group: "Resources",
    });

    // 3. Add to the main project group (e.g., "NIYAH")
    const groups = xcodeProject.hash.project.objects["PBXGroup"];
    for (const key of Object.keys(groups)) {
      const group = groups[key];
      if (typeof group === "string") continue;
      if (group.name === projectName || group.path === projectName) {
        if (!group.children) group.children = [];
        group.children.push({
          value: fileRefUuid,
          comment: "GoogleService-Info.plist",
        });
        break;
      }
    }

    // 4. Add to PBXResourcesBuildPhase of the first target
    const target = xcodeProject.getFirstTarget().uuid;
    const buildPhases =
      xcodeProject.hash.project.objects["PBXResourcesBuildPhase"];
    for (const key of Object.keys(buildPhases)) {
      const phase = buildPhases[key];
      if (typeof phase === "string") continue;
      if (phase.files) {
        phase.files.push({
          value: buildFileUuid,
          comment: "GoogleService-Info.plist in Resources",
        });
        break;
      }
    }

    return config;
  });

  return config;
}

module.exports = withGoogleServicesPlist;
