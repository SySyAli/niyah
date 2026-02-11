// JITAI Variant 3: Intervention Delivery Engine
// Delivers graduated interventions based on usage context and severity.
// Uses Thompson Sampling for adaptive intervention selection.

import type {
  Intervention,
  InterventionLevel,
  UsageContext,
  UsagePattern,
  BanditArm,
  AdaptationState,
} from "./types";

// ── Intervention Level Definitions ───────────────────────────────────────

const INTERVENTION_MESSAGES: Record<
  InterventionLevel,
  (stats: { pickups: number; minutes: number; progress?: number }) => string
> = {
  awareness_nudge: (s) =>
    `You've picked up your phone ${s.pickups} times in the last hour. That's ${s.minutes} minutes of screen time.`,
  friction_delay: (_s) =>
    "Taking a moment before opening this app. 5... 4... 3... 2... 1...",
  reflection_prompt: (_s) =>
    "Before you continue — what were you planning to do? If you can't answer in 3 seconds, this might be a habit pickup.",
  usage_summary: (s) =>
    `Today so far: ${s.pickups} pickups, ${s.minutes} minutes of screen time. Your focus session is ${s.progress ?? 0}% complete.`,
  soft_lock: (_s) =>
    "Distracting apps are paused for 5 minutes. Take a breath — you're building something valuable here.",
  full_lock: (_s) =>
    "All non-essential apps are locked. Your focus session needs your full attention right now.",
};

/**
 * Intrusiveness ordering for graduated response.
 */
const INTRUSIVENESS_ORDER: InterventionLevel[] = [
  "awareness_nudge",
  "friction_delay",
  "reflection_prompt",
  "usage_summary",
  "soft_lock",
  "full_lock",
];

// ── Intervention Selection ───────────────────────────────────────────────

/**
 * Selects and creates an appropriate intervention based on context and usage pattern.
 *
 * Uses a graduated response model:
 * 1. First pickup in context → awareness nudge
 * 2. Repeated pickups → friction or reflection
 * 3. During focus session with compulsive pattern → soft/full lock
 *
 * The adaptation engine (Thompson Sampling) refines which level works
 * best for each context for this specific user.
 *
 * @param context - Classified usage context
 * @param pattern - Current usage pattern
 * @param adaptationState - Learned adaptation state
 * @param episodeId - ID of the triggering usage episode
 * @param inFocusSession - Whether user is in active focus session
 * @returns Intervention to deliver, or null if no intervention warranted
 */
export function selectIntervention(
  context: UsageContext,
  pattern: UsagePattern,
  adaptationState: AdaptationState,
  episodeId: string,
  inFocusSession: boolean,
): Intervention | null {
  // Check suppressed contexts
  if (adaptationState.suppressedContexts.includes(context)) {
    return null;
  }

  // Check quiet hours
  const currentHour = new Date().getHours();
  for (const [start, end] of adaptationState.quietHours) {
    if (start <= currentHour && currentHour < end) {
      return null;
    }
  }

  // Context-based filtering: intentional tasks don't need intervention
  if (context === "intentional_task" || context === "work_break") {
    // Only intervene during focus sessions
    if (!inFocusSession) return null;
  }

  // Select intervention level
  const level = selectLevel(context, pattern, adaptationState, inFocusSession);

  if (!level) return null;

  const message = INTERVENTION_MESSAGES[level]({
    pickups: pattern.pickupCount,
    minutes: Math.round(pattern.totalScreenTime / 60),
    progress: 0, // Would be filled from session state
  });

  return {
    id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    level,
    triggeringEpisodeId: episodeId,
    message,
    acknowledged: false,
    feedback: null,
    outcome: null,
  };
}

/**
 * Selects the intervention level using Thompson Sampling + graduated response.
 */
function selectLevel(
  context: UsageContext,
  pattern: UsagePattern,
  state: AdaptationState,
  inFocusSession: boolean,
): InterventionLevel | null {
  // Find arms matching this context
  const contextArms = state.arms.filter((arm) => arm.context === context);

  if (contextArms.length === 0) {
    // No learned data: use graduated response heuristic
    return graduatedResponse(pattern, inFocusSession);
  }

  // Thompson Sampling: sample from each arm's Beta distribution
  const samples = contextArms.map((arm) => ({
    arm,
    sample: betaSample(arm.alpha, arm.beta),
  }));

  // Select arm with highest sample
  samples.sort((a, b) => b.sample - a.sample);
  const selectedArm = samples[0].arm;

  // Apply graduated response constraint: don't jump to high intrusiveness
  // if compulsiveness is low
  if (
    pattern.compulsivenessScore < 0.3 &&
    INTRUSIVENESS_ORDER.indexOf(selectedArm.level) > 2
  ) {
    return graduatedResponse(pattern, inFocusSession);
  }

  return selectedArm.level;
}

/**
 * Simple graduated response heuristic (used when no bandit data exists).
 */
function graduatedResponse(
  pattern: UsagePattern,
  inFocusSession: boolean,
): InterventionLevel {
  if (inFocusSession) {
    if (pattern.compulsivenessScore > 0.6) return "soft_lock";
    if (pattern.pickupFrequency > 8) return "reflection_prompt";
    return "friction_delay";
  }

  if (pattern.compulsivenessScore > 0.7) return "reflection_prompt";
  if (pattern.pickupFrequency > 10) return "usage_summary";
  if (pattern.pickupFrequency > 6) return "friction_delay";
  return "awareness_nudge";
}

// ── Adaptation State Management ──────────────────────────────────────────

/**
 * Initializes the adaptation state with uniform priors.
 */
export function initializeAdaptation(): AdaptationState {
  const arms: BanditArm[] = [];

  const contexts: UsageContext[] = [
    "boredom_habit",
    "anxiety_check",
    "transition_moment",
    "social_response",
  ];

  const levels: InterventionLevel[] = [
    "awareness_nudge",
    "friction_delay",
    "reflection_prompt",
    "soft_lock",
  ];

  for (const context of contexts) {
    for (const level of levels) {
      arms.push({
        context,
        level,
        alpha: 1, // Beta(1,1) = uniform prior
        beta: 1,
        totalPulls: 0,
      });
    }
  }

  return {
    arms,
    suppressedContexts: [],
    quietHours: [],
    totalInterventions: 0,
    totalFeedback: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Updates the bandit arm based on intervention outcome.
 *
 * @param state - Current adaptation state
 * @param context - Context of the intervention
 * @param level - Level that was used
 * @param success - Whether the outcome was positive
 * @returns Updated adaptation state
 */
export function updateAdaptation(
  state: AdaptationState,
  context: UsageContext,
  level: InterventionLevel,
  success: boolean,
): AdaptationState {
  const newState = {
    ...state,
    arms: state.arms.map((arm) => {
      if (arm.context === context && arm.level === level) {
        return {
          ...arm,
          alpha: arm.alpha + (success ? 1 : 0),
          beta: arm.beta + (success ? 0 : 1),
          totalPulls: arm.totalPulls + 1,
        };
      }
      return arm;
    }),
    totalInterventions: state.totalInterventions + 1,
    totalFeedback: state.totalFeedback + 1,
    lastUpdated: new Date().toISOString(),
  };

  return newState;
}

/**
 * Gets the estimated success rate for each (context, level) pair.
 */
export function getArmEstimates(state: AdaptationState): Array<{
  context: UsageContext;
  level: InterventionLevel;
  estimatedSuccessRate: number;
  totalPulls: number;
  confidence: number;
}> {
  return state.arms.map((arm) => ({
    context: arm.context,
    level: arm.level,
    estimatedSuccessRate: arm.alpha / (arm.alpha + arm.beta),
    totalPulls: arm.totalPulls,
    confidence: 1 - 1 / Math.sqrt(arm.totalPulls + 1),
  }));
}

// ── Utilities ────────────────────────────────────────────────────────────

/**
 * Sample from a Beta distribution using the Joehnk method.
 */
function betaSample(alpha: number, beta: number): number {
  // For alpha, beta >= 1, use the basic method
  if (alpha <= 0) alpha = 0.01;
  if (beta <= 0) beta = 0.01;

  // Generate gamma variates
  const x = gammaSample(alpha);
  const y = gammaSample(beta);

  return x / (x + y);
}

/**
 * Sample from a Gamma distribution using Marsaglia and Tsang's method.
 */
function gammaSample(shape: number): number {
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;

    do {
      x = gaussianRandom();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
