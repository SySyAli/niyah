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
  ],
  testTimeout: 15000,
};
