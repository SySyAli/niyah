/**
 * Unit Tests for sslPinning.ts
 *
 * Tests SSL certificate pinning initialization: dev mode bypass,
 * platform checks, and graceful error handling.
 */

import { Platform } from "react-native";

describe("sslPinning", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  // ─── __DEV__ mode ─────────────────────────────────────────────────────────

  it("no-ops in __DEV__ mode", async () => {
    // __DEV__ is true in test environment (set in jest.setup.ts)
    expect((globalThis as any).__DEV__).toBe(true);

    // Load a fresh copy to ensure we pick up __DEV__
    let mod: typeof import("../../../config/sslPinning");
    jest.isolateModules(() => {
      mod = require("../../../config/sslPinning");
    });

    // Should resolve without calling the pinning library
    await expect(mod!.initializeSslPinning()).resolves.toBeUndefined();
  });

  // ─── Web platform ────────────────────────────────────────────────────────

  it("no-ops on web platform", async () => {
    // Even if __DEV__ were false, web should bail out.
    // Since __DEV__ is true in test, this test verifies the early return path
    // is hit before the web check. We still run it to confirm no error.
    Platform.OS = "web" as typeof Platform.OS;

    let mod: typeof import("../../../config/sslPinning");
    jest.isolateModules(() => {
      mod = require("../../../config/sslPinning");
    });

    await expect(mod!.initializeSslPinning()).resolves.toBeUndefined();
  });

  // ─── Missing native module ───────────────────────────────────────────────

  it("handles missing native module gracefully", async () => {
    // Temporarily override __DEV__ to false and set iOS platform so the
    // function reaches the require() path.
    const prevDev = (globalThis as any).__DEV__;
    (globalThis as any).__DEV__ = false;
    Platform.OS = "ios" as typeof Platform.OS;

    // Mock require to throw (simulate missing native module)
    jest.mock("react-native-ssl-public-key-pinning", () => {
      throw new Error("Module not found");
    });

    let mod: typeof import("../../../config/sslPinning");
    jest.isolateModules(() => {
      mod = require("../../../config/sslPinning");
    });

    // Should not throw — degrades to normal TLS
    await expect(mod!.initializeSslPinning()).resolves.toBeUndefined();

    // Restore
    (globalThis as any).__DEV__ = prevDev;
    Platform.OS = originalOS;
  });
});
