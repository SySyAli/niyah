/**
 * Hook to prevent screenshots, screen recording, and hide content in iOS
 * app switcher for as long as the calling component is mounted.
 *
 * Uses expo-screen-capture under the hood:
 * - usePreventScreenCapture: blocks screenshots + screen recording (iOS 13+, Android)
 * - enableAppSwitcherProtectionAsync: blurs content in iOS app switcher
 *
 * Usage: Add a single line to any screen with sensitive financial data:
 *   useScreenProtection("deposit");
 *
 * Fails gracefully if the native module isn't available — a missing screen
 * protection feature should never crash the app.
 *
 * Requires native rebuild after install: pnpm build:local
 */

import { useEffect } from "react";
import { logger } from "../utils/logger";

let ScreenCapture: typeof import("expo-screen-capture") | null = null;
try {
  ScreenCapture = require("expo-screen-capture");
} catch {
  logger.warn("expo-screen-capture not available — screen protection disabled");
}

/**
 * @param key Unique key to prevent conflicts between multiple protected screens.
 */
export function useScreenProtection(key: string) {
  // Block screenshots + screen recording while this component is mounted
  useEffect(() => {
    if (!ScreenCapture) return;

    let cancelled = false;

    ScreenCapture.preventScreenCaptureAsync(key).catch((err: unknown) => {
      if (!cancelled) logger.warn("preventScreenCapture failed:", err);
    });

    ScreenCapture.enableAppSwitcherProtectionAsync(0.8).catch(
      (err: unknown) => {
        if (!cancelled) logger.warn("enableAppSwitcherProtection failed:", err);
      },
    );

    return () => {
      cancelled = true;
      ScreenCapture?.allowScreenCaptureAsync(key).catch(() => {});
      ScreenCapture?.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, [key]);
}
