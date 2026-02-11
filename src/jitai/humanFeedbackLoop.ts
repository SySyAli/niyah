// JITAI Variant 3: Human-AI Feedback Loop
// Collects user feedback on interventions and context classifications,
// feeding corrections back into both the context classifier and
// the intervention selection policy.

import type {
  Intervention,
  InterventionFeedback,
  InterventionOutcome,
  UsageContext,
  UsageEpisode,
  AdaptationState,
} from "./types";
import {
  type ContextWeights,
  updateWeightsFromFeedback,
  extractFeatures,
} from "./contextClassifier";
import { updateAdaptation } from "./interventionEngine";

// ── Feedback Collection ──────────────────────────────────────────────────

/**
 * Records user feedback on an intervention.
 *
 * This is the core of the human-in-the-loop system. Each feedback event:
 * 1. Updates the intervention record
 * 2. If context was corrected, updates the context classifier
 * 3. Updates the Thompson Sampling bandit for intervention selection
 *
 * @param intervention - The intervention that was delivered
 * @param feedback - User's feedback
 * @param outcome - What happened after the intervention
 * @param episode - The usage episode that triggered the intervention
 * @param recentEpisodes - Recent usage history for feature extraction
 * @param classifierWeights - Current context classifier weights
 * @param adaptationState - Current bandit adaptation state
 * @returns Updated weights and state
 */
export function processFeedback(
  intervention: Intervention,
  feedback: InterventionFeedback,
  outcome: InterventionOutcome,
  episode: UsageEpisode,
  recentEpisodes: UsageEpisode[],
  classifierWeights: ContextWeights,
  adaptationState: AdaptationState,
): {
  updatedIntervention: Intervention;
  updatedClassifierWeights: ContextWeights;
  updatedAdaptationState: AdaptationState;
} {
  // 1. Update the intervention record
  const updatedIntervention: Intervention = {
    ...intervention,
    acknowledged: true,
    feedback,
    outcome,
  };

  // 2. Update context classifier if user corrected the context
  let updatedClassifierWeights = classifierWeights;
  if (
    feedback.contextCorrect === false &&
    feedback.correctedContext &&
    feedback.correctedContext !== episode.classifiedContext
  ) {
    const features = extractFeatures(episode, recentEpisodes);
    updatedClassifierWeights = updateWeightsFromFeedback(
      classifierWeights,
      features,
      episode.classifiedContext,
      feedback.correctedContext,
    );
  }

  // 3. Update the bandit for intervention selection
  const success = isPositiveOutcome(outcome, feedback.helpful);
  const updatedAdaptationState = updateAdaptation(
    adaptationState,
    episode.classifiedContext,
    intervention.level,
    success,
  );

  return {
    updatedIntervention,
    updatedClassifierWeights,
    updatedAdaptationState,
  };
}

// ── Feedback Prompt Generation ───────────────────────────────────────────

/**
 * Generates the feedback prompt to show after an intervention.
 * Keeps it lightweight — one tap for helpful/not helpful,
 * optional context correction.
 */
export function generateFeedbackPrompt(
  intervention: Intervention,
  classifiedContext: UsageContext,
): {
  question: string;
  contextLabel: string;
  contextOptions: Array<{ value: UsageContext; label: string }>;
} {
  return {
    question: "Was this nudge helpful?",
    contextLabel: `We thought this was: ${contextDisplayName(classifiedContext)}`,
    contextOptions: [
      { value: "intentional_task", label: "I was doing something specific" },
      { value: "work_break", label: "Taking a break" },
      { value: "social_response", label: "Responding to someone" },
      { value: "boredom_habit", label: "Just a habit" },
      { value: "anxiety_check", label: "Checking out of anxiety" },
      { value: "transition_moment", label: "Between activities" },
    ],
  };
}

// ── Adaptation Analytics ─────────────────────────────────────────────────

/**
 * Computes how much the human feedback has improved the system.
 *
 * @param feedbackHistory - All feedback received
 * @returns Improvement metrics
 */
export function computeAdaptationMetrics(
  feedbackHistory: Array<{
    feedback: InterventionFeedback;
    outcome: InterventionOutcome;
    timestamp: string;
  }>,
): {
  totalFeedback: number;
  helpfulRate: number;
  contextCorrectionRate: number;
  outcomeImprovement: number;
  adaptationPhase: "learning" | "adapting" | "stable";
} {
  if (feedbackHistory.length === 0) {
    return {
      totalFeedback: 0,
      helpfulRate: 0,
      contextCorrectionRate: 0,
      outcomeImprovement: 0,
      adaptationPhase: "learning",
    };
  }

  const totalFeedback = feedbackHistory.length;
  const helpfulCount = feedbackHistory.filter((f) => f.feedback.helpful).length;
  const correctionCount = feedbackHistory.filter(
    (f) => f.feedback.contextCorrect === false,
  ).length;

  // Compare first half vs. second half to measure improvement
  const mid = Math.floor(totalFeedback / 2);
  const firstHalf = feedbackHistory.slice(0, mid);
  const secondHalf = feedbackHistory.slice(mid);

  const firstHalfPositiveRate =
    firstHalf.length > 0
      ? firstHalf.filter((f) =>
          isPositiveOutcome(f.outcome, f.feedback.helpful),
        ).length / firstHalf.length
      : 0;

  const secondHalfPositiveRate =
    secondHalf.length > 0
      ? secondHalf.filter((f) =>
          isPositiveOutcome(f.outcome, f.feedback.helpful),
        ).length / secondHalf.length
      : 0;

  const outcomeImprovement = secondHalfPositiveRate - firstHalfPositiveRate;

  // Determine adaptation phase
  let adaptationPhase: "learning" | "adapting" | "stable";
  if (totalFeedback < 10) {
    adaptationPhase = "learning";
  } else if (correctionCount / totalFeedback > 0.2) {
    adaptationPhase = "adapting";
  } else {
    adaptationPhase = "stable";
  }

  return {
    totalFeedback,
    helpfulRate: helpfulCount / totalFeedback,
    contextCorrectionRate: correctionCount / totalFeedback,
    outcomeImprovement,
    adaptationPhase,
  };
}

/**
 * Generates a human-readable adaptation summary for the user.
 */
export function generateAdaptationSummary(
  metrics: ReturnType<typeof computeAdaptationMetrics>,
): string {
  if (metrics.totalFeedback === 0) {
    return "Your feedback helps the system learn when to nudge you. Tap 'helpful' or 'not helpful' after each intervention.";
  }

  const parts: string[] = [];

  if (metrics.adaptationPhase === "learning") {
    parts.push(
      `Still learning your patterns (${metrics.totalFeedback} feedback points so far).`,
    );
  } else if (metrics.adaptationPhase === "adapting") {
    parts.push(
      `Actively adapting based on your corrections. ${(metrics.contextCorrectionRate * 100).toFixed(0)}% of context classifications have been corrected.`,
    );
  } else {
    parts.push(
      `System is well-calibrated to your patterns (${(metrics.helpfulRate * 100).toFixed(0)}% of nudges rated helpful).`,
    );
  }

  if (metrics.outcomeImprovement > 0.1) {
    parts.push(
      `Intervention effectiveness has improved by ${(metrics.outcomeImprovement * 100).toFixed(0)}% since we started learning from your feedback.`,
    );
  }

  return parts.join(" ");
}

// ── Utilities ────────────────────────────────────────────────────────────

function isPositiveOutcome(
  outcome: InterventionOutcome,
  helpful: boolean,
): boolean {
  return helpful || outcome === "stopped_usage" || outcome === "reduced_usage";
}

function contextDisplayName(context: UsageContext): string {
  const names: Record<UsageContext, string> = {
    intentional_task: "Doing something specific",
    work_break: "Taking a break",
    social_response: "Responding to someone",
    boredom_habit: "Habit/boredom pickup",
    anxiety_check: "Anxiety check",
    transition_moment: "Between activities",
    unknown: "Unknown",
  };
  return names[context] || "Unknown";
}
