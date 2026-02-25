// ---------------------------------------------------------------------------
// Screen Time module types
// ---------------------------------------------------------------------------

/**
 * Authorization status for FamilyControls.
 * - "notDetermined": User hasn't been prompted yet
 * - "approved": User granted Screen Time access
 * - "denied": User denied access
 */
export type AuthorizationStatus = "notDetermined" | "approved" | "denied";

/**
 * Represents the current blocking state of the Screen Time module.
 * - "idle": No session active, no apps blocked
 * - "blocking": Session active, selected apps are shielded
 */
export type BlockingState = "idle" | "blocking";

/**
 * An opaque token representing a user's app selection from FamilyActivityPicker.
 * This token is stored natively -- JS never sees the actual app identifiers
 * (Apple's privacy model). We just pass it by reference ID.
 */
export interface AppSelectionToken {
  /** Unique ID for this saved selection (stored on the native side) */
  id: string;
  /** Number of apps in the selection */
  appCount: number;
  /** Number of categories in the selection */
  categoryCount: number;
  /** Human-readable label (e.g. "5 apps, 2 categories") */
  label: string;
}

/**
 * Event fired when a user opens a shielded/blocked app during a session.
 * This is the key event that triggers money deduction in NIYAH.
 */
export interface ShieldViolationEvent {
  /** Timestamp (ms since epoch) when the violation occurred */
  timestamp: number;
}

/**
 * Events emitted by the NiyahScreenTime native module.
 */
export type NiyahScreenTimeModuleEvents = {
  /** Fired when the user attempts to open a blocked app */
  onShieldViolation: (event: ShieldViolationEvent) => void;
  /** Fired when authorization status changes */
  onAuthorizationChange: (event: { status: AuthorizationStatus }) => void;
};
