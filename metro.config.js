const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Watchman lacks permission to this directory; use Node crawler instead
config.resolver.useWatchman = false;

// pnpm uses symlinks in node_modules — Metro needs to follow them and also
// be aware of the .pnpm store so that it can resolve peer-dependency variants.
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
