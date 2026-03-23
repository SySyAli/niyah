import { Platform } from "react-native";
import {
  NiyahScreenTime,
  type AuthorizationStatus,
  type AppSelectionToken,
  type ShieldViolationEvent,
} from "../../modules/niyah-screentime";

// ---------------------------------------------------------------------------
// Feature availability
// ---------------------------------------------------------------------------

// iOS 16+ physical device only.
export const isScreenTimeAvailable =
  Platform.OS === "ios" && parseInt(Platform.Version as string, 10) >= 16;

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

export const requestScreenTimeAuth = async (): Promise<AuthorizationStatus> => {
  if (!isScreenTimeAvailable) return "denied";
  return NiyahScreenTime.requestAuthorization();
};

export const getScreenTimeAuthStatus = (): AuthorizationStatus => {
  if (!isScreenTimeAvailable) return "denied";
  return NiyahScreenTime.getAuthorizationStatus();
};

// ---------------------------------------------------------------------------
// App selection
// ---------------------------------------------------------------------------

export const presentAppPicker = async (): Promise<AppSelectionToken> => {
  if (!isScreenTimeAvailable) {
    throw new Error("Screen Time API is not available on this device");
  }
  return NiyahScreenTime.presentAppPicker();
};

export const getSavedAppSelection = (): AppSelectionToken | null => {
  if (!isScreenTimeAvailable) return null;
  return NiyahScreenTime.getSavedSelection();
};

export const clearAppSelection = async (): Promise<void> => {
  if (!isScreenTimeAvailable) return;
  return NiyahScreenTime.clearSelection();
};

// ---------------------------------------------------------------------------
// Session blocking
// ---------------------------------------------------------------------------

export const startBlocking = async (): Promise<void> => {
  if (!isScreenTimeAvailable) return;
  return NiyahScreenTime.startBlocking();
};

export const stopBlocking = async (): Promise<void> => {
  if (!isScreenTimeAvailable) return;
  return NiyahScreenTime.stopBlocking();
};

export const isBlocking = (): boolean => {
  if (!isScreenTimeAvailable) return false;
  return NiyahScreenTime.isBlocking();
};

// ---------------------------------------------------------------------------
// Violation events
// ---------------------------------------------------------------------------

/**
 * Subscribe to shield violation events (user opened a blocked app).
 * Returns an unsubscribe function.
 *
 * Usage:
 *   const unsub = onShieldViolation((event) => {
 *     console.log("Violation at", event.timestamp);
 *     // Deduct money from wallet
 *   });
 *   // Later: unsub();
 */
export const onShieldViolation = (
  callback: (event: ShieldViolationEvent) => void,
): (() => void) => {
  if (!isScreenTimeAvailable) return () => {};

  const subscription = NiyahScreenTime.addListener(
    "onShieldViolation",
    callback,
  );
  return () => subscription.remove();
};

export const onAuthorizationChange = (
  callback: (status: AuthorizationStatus) => void,
): (() => void) => {
  if (!isScreenTimeAvailable) return () => {};

  const subscription = NiyahScreenTime.addListener(
    "onAuthorizationChange",
    (event) => callback(event.status),
  );
  return () => subscription.remove();
};

/**
 * Subscribe to surrender requests from the custom shield screen.
 * Fired when the user taps "Surrender Session" on the NiyahShieldAction
 * extension. The main app should call surrenderSession() in response.
 * Returns an unsubscribe function.
 */
export const onSurrenderRequested = (callback: () => void): (() => void) => {
  if (!isScreenTimeAvailable) return () => {};

  const subscription = NiyahScreenTime.addListener(
    "onSurrenderRequested",
    callback,
  );
  return () => subscription.remove();
};
