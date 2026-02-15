// JITAI Variant 3: Adaptive Smartphone Overuse JITAI with Human-AI Loop
// Type definitions for usage detection and context-aware interventions

/**
 * A single phone pickup/usage episode.
 */
export interface UsageEpisode {
  id: string;
  /** When the phone was picked up */
  startTime: string;
  /** When the phone was put down (null if ongoing) */
  endTime: string | null;
  /** Duration in seconds */
  duration: number;
  /** Category of app used */
  appCategory: AppCategory;
  /** Specific app name (if available) */
  appName?: string;
  /** Whether this was during an active NIYAH session */
  duringFocusSession: boolean;
  /** Context as classified by the system */
  classifiedContext: UsageContext;
  /** Whether user confirmed/corrected the context classification */
  userCorrectedContext?: UsageContext;
}

export type AppCategory =
  | "social_media" // Instagram, TikTok, Twitter, etc.
  | "messaging" // iMessage, WhatsApp, Telegram
  | "entertainment" // YouTube, Netflix, games
  | "productivity" // Email, calendar, notes
  | "utility" // Maps, calculator, settings
  | "health" // Fitness, meditation
  | "education" // Learning apps, reading
  | "unknown";

/**
 * Inferred context for why the user picked up their phone.
 */
export type UsageContext =
  | "intentional_task" // Looking up something specific
  | "work_break" // Scheduled or earned break
  | "social_response" // Responding to a notification
  | "boredom_habit" // Habitual pickup with no purpose
  | "anxiety_check" // Checking phone due to anxiety/FOMO
  | "transition_moment" // Between activities (commute, waiting)
  | "unknown";

/**
 * Temporal usage pattern summary over a time window.
 */
export interface UsagePattern {
  /** Time window start */
  windowStart: string;
  /** Time window end */
  windowEnd: string;
  /** Total pickups in window */
  pickupCount: number;
  /** Total screen time in seconds */
  totalScreenTime: number;
  /** Average episode duration in seconds */
  avgEpisodeDuration: number;
  /** Most used app category */
  dominantCategory: AppCategory;
  /** Pickup frequency (per hour) */
  pickupFrequency: number;
  /** Compulsiveness score (0-1): ratio of short, aimless pickups */
  compulsivenessScore: number;
  /** Time of day distribution */
  hourlyDistribution: number[];
}

/**
 * Context classification features used by the classifier.
 */
export interface ContextFeatures {
  /** Time since last pickup (seconds) */
  timeSinceLastPickup: number;
  /** Current hour of day (0-23) */
  hourOfDay: number;
  /** Whether a notification triggered the pickup */
  notificationTriggered: boolean;
  /** Duration of the episode so far (seconds) */
  currentDuration: number;
  /** App category being used */
  appCategory: AppCategory;
  /** Number of pickups in the last hour */
  recentPickupCount: number;
  /** Whether user is in a focus session */
  inFocusSession: boolean;
  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number;
  /** Average pickup interval for this hour (from history) */
  avgPickupIntervalForHour: number;
}

/**
 * Intervention types, ordered by intrusiveness (graduated response).
 */
export type InterventionLevel =
  | "awareness_nudge" // Gentle: "You've picked up your phone 12 times this hour"
  | "friction_delay" // Moderate: 5-second delay before app opens
  | "reflection_prompt" // Active: "What were you going to do?" before proceeding
  | "usage_summary" // Informative: Show today's stats
  | "soft_lock" // Strong: Block distracting apps for 5 min
  | "full_lock"; // Maximum: Block all non-essential apps

/**
 * An intervention delivered to the user.
 */
export interface Intervention {
  id: string;
  /** When the intervention was triggered */
  timestamp: string;
  /** Intervention level */
  level: InterventionLevel;
  /** The usage episode that triggered it */
  triggeringEpisodeId: string;
  /** Message shown to user */
  message: string;
  /** Whether the user saw/acknowledged the intervention */
  acknowledged: boolean;
  /** User feedback (null if not yet provided) */
  feedback: InterventionFeedback | null;
  /** What happened after the intervention */
  outcome: InterventionOutcome | null;
}

/**
 * Lightweight user feedback on an intervention.
 */
export interface InterventionFeedback {
  /** Was this intervention helpful? */
  helpful: boolean;
  /** Optional: was the context classification correct? */
  contextCorrect?: boolean;
  /** If context was wrong, what was the real context? */
  correctedContext?: UsageContext;
  /** Optional free-text reason */
  reason?: string;
  /** Timestamp */
  timestamp: string;
}

export type InterventionOutcome =
  | "stopped_usage" // User put phone down
  | "reduced_usage" // User switched to productive app
  | "continued_usage" // User dismissed and kept scrolling
  | "increased_usage" // User spent even more time (reactance)
  | "uninstalled_app"; // Nuclear option (user left)

/**
 * Thompson Sampling arm for the bandit policy.
 * Each arm represents a (context, intervention_level) pair.
 */
export interface BanditArm {
  /** Context this arm applies to */
  context: UsageContext;
  /** Intervention level */
  level: InterventionLevel;
  /** Beta distribution alpha parameter (successes + 1) */
  alpha: number;
  /** Beta distribution beta parameter (failures + 1) */
  beta: number;
  /** Total times this arm was pulled */
  totalPulls: number;
}

/**
 * Adaptation engine state.
 */
export interface AdaptationState {
  /** Thompson Sampling arms */
  arms: BanditArm[];
  /** Contexts where user has opted out of interventions */
  suppressedContexts: UsageContext[];
  /** Global do-not-disturb windows [startHour, endHour][] */
  quietHours: Array<[number, number]>;
  /** Total interventions delivered */
  totalInterventions: number;
  /** Total feedback received */
  totalFeedback: number;
  /** Last updated */
  lastUpdated: string;
}
