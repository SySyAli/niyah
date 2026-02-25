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

/**
 * Screen Time API is iOS 16+ only, and requires a physical device.
 * This flag lets the rest of the app gate Screen Time features cleanly.
 */
export const isScreenTimeAvailable =
  Platform.OS === "ios" && parseInt(Platform.Version as string, 10) >= 16;

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * Request Screen Time (FamilyControls) authorization.
 * Shows the native iOS dialog. Returns the resulting status.
 */
export const requestScreenTimeAuth = async (): Promise<AuthorizationStatus> => {
  if (!isScreenTimeAvailable) return "denied";
  return NiyahScreenTime.requestAuthorization();
};

/**
 * Get current authorization status without prompting the user.
 */
export const getScreenTimeAuthStatus = (): AuthorizationStatus => {
  if (!isScreenTimeAvailable) return "denied";
  return NiyahScreenTime.getAuthorizationStatus();
};

// ---------------------------------------------------------------------------
// App selection
// ---------------------------------------------------------------------------

/**
 * Present the native FamilyActivityPicker for the user to choose
 * which apps to block during sessions.
 */
export const presentAppPicker = async (): Promise<AppSelectionToken> => {
  if (!isScreenTimeAvailable) {
    throw new Error("Screen Time API is not available on this device");
  }
  return NiyahScreenTime.presentAppPicker();
};

/**
 * Get the currently saved app selection (null if user hasn't picked yet).
 */
export const getSavedAppSelection = (): AppSelectionToken | null => {
  if (!isScreenTimeAvailable) return null;
  return NiyahScreenTime.getSavedSelection();
};

/**
 * Clear the saved app selection.
 */
export const clearAppSelection = async (): Promise<void> => {
  if (!isScreenTimeAvailable) return;
  return NiyahScreenTime.clearSelection();
};

// ---------------------------------------------------------------------------
// Session blocking
// ---------------------------------------------------------------------------

/**
 * Start blocking selected apps. Call when a NIYAH session begins.
 * Applies ManagedSettings shields to all apps the user selected.
 */
export const startBlocking = async (): Promise<void> => {
  if (!isScreenTimeAvailable) return;
  return NiyahScreenTime.startBlocking();
};

/**
 * Stop blocking. Call when a session ends (complete or surrender).
 * Removes all ManagedSettings shields.
 */
export const stopBlocking = async (): Promise<void> => {
  if (!isScreenTimeAvailable) return;
  return NiyahScreenTime.stopBlocking();
};

/**
 * Check if apps are currently being blocked.
 */
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

/**
 * Subscribe to authorization status changes.
 */
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
