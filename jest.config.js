/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.ts"],
  clearMocks: true,
  testMatch: [
    "<rootDir>/src/**/*.{test,spec}.{ts,tsx}",
    "<rootDir>/tests/**/*.{test,spec}.{ts,tsx}",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/", "/android/", "/ios/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/types/**",
    "!src/constants/**",
    // Exclude purely visual/animation components — no testable logic
    "!src/components/onboarding/**",
    "!src/components/BlobsBackground.tsx",
    "!src/components/Confetti.tsx",
    "!src/components/MoneyPlant.tsx",
    "!src/components/PeachAvatar.tsx",
    "!src/components/BottomTabs.tsx",
  ],
  testTimeout: 15000,
  // Watchman requires Full Disk Access on macOS; skip it and use the Node
  // crawler directly. Tests still run at full speed — Watchman only matters
  // for watch mode re-runs, which use --watchAll anyway.
  watchman: false,
};
