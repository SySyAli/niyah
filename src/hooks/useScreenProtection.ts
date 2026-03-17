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
 * Requires native rebuild after install: pnpm build:local
 */

import { useEffect } from "react";
import { usePreventScreenCapture } from "expo-screen-capture";
import * as ScreenCapture from "expo-screen-capture";

/**
 * @param key Unique key to prevent conflicts between multiple protected screens.
 */
export function useScreenProtection(key: string) {
  // Block screenshots + screen recording while this component is mounted
  usePreventScreenCapture(key);

  // iOS: blur content in app switcher / background snapshots
  useEffect(() => {
    ScreenCapture.enableAppSwitcherProtectionAsync(0.8);

    return () => {
      ScreenCapture.disableAppSwitcherProtectionAsync();
    };
  }, []);
}
