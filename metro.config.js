const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Watchman lacks permission to this directory; use Node crawler instead
config.resolver.useWatchman = false;

module.exports = config;
