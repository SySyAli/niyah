import { NativeModule, requireNativeModule } from "expo";
import type {
  NiyahScreenTimeModuleEvents,
  AuthorizationStatus,
  AppSelectionToken,
} from "./types";

declare class NiyahScreenTimeModuleClass extends NativeModule<NiyahScreenTimeModuleEvents> {
  // ------------------------------------------------------------------
  // Authorization
  // ------------------------------------------------------------------

  /** Request FamilyControls authorization from the user. */
  requestAuthorization(): Promise<AuthorizationStatus>;

  /** Get the current authorization status without prompting. */
  getAuthorizationStatus(): AuthorizationStatus;

  // ------------------------------------------------------------------
  // App selection
  // ------------------------------------------------------------------

  /**
   * Present the native FamilyActivityPicker so the user can choose
   * which apps/categories to block during sessions.
   *
   * The actual app tokens stay on the native side (Apple privacy model).
   * Returns a summary of what was selected.
   */
  presentAppPicker(): Promise<AppSelectionToken>;

  /** Get the currently saved app selection (if any). */
  getSavedSelection(): AppSelectionToken | null;

  /** Clear the saved app selection. */
  clearSelection(): Promise<void>;

  // ------------------------------------------------------------------
  // Blocking (session lifecycle)
  // ------------------------------------------------------------------

  /**
   * Start blocking the selected apps.
   * Call this when a NIYAH session begins.
   * Applies a ManagedSettings shield to all selected apps.
   */
  startBlocking(): Promise<void>;

  /**
   * Stop blocking. Call when session ends (complete or surrender).
   * Removes the ManagedSettings shield.
   */
  stopBlocking(): Promise<void>;

  /** Check if apps are currently being blocked. */
  isBlocking(): boolean;
}

export default requireNativeModule<NiyahScreenTimeModuleClass>(
  "NiyahScreenTime",
);
