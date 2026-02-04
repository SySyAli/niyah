const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disable Watchman to avoid permission issues
config.watchFolders = [];
config.resolver.useWatchman = false;

module.exports = config;
