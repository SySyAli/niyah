// JITAI Variant 3: Context Classifier
// Classifies phone usage context using temporal and behavioral features.
// Updated over time by human feedback corrections.

import type {
  UsageContext,
  ContextFeatures,
  UsageEpisode,
  AppCategory,
} from "./types";

// ── Feature Extraction ───────────────────────────────────────────────────

/**
 * Extracts context features from a usage episode and recent history.
 *
 * @param episode - Current usage episode
 * @param recentEpisodes - Recent usage history (last ~1 hour)
 * @param avgIntervals - Historical average pickup intervals per hour
 * @returns Context features for classification
 */
export function extractFeatures(
  episode: UsageEpisode,
  recentEpisodes: UsageEpisode[],
  avgIntervals?: Record<number, number>,
): ContextFeatures {
  const startTime = new Date(episode.startTime);
  const hour = startTime.getHours();
  const oneHourAgo = startTime.getTime() - 3600 * 1000;

  // Time since last pickup
  const previousEpisodes = recentEpisodes.filter(
    (ep) => new Date(ep.startTime).getTime() < startTime.getTime(),
  );
  const lastPickup =
    previousEpisodes.length > 0
      ? Math.max(
          ...previousEpisodes.map((ep) => new Date(ep.startTime).getTime()),
        )
      : startTime.getTime() - 3600 * 1000;
  const timeSinceLastPickup = (startTime.getTime() - lastPickup) / 1000;

  // Recent pickup count (last hour)
  const recentCount = recentEpisodes.filter(
    (ep) => new Date(ep.startTime).getTime() >= oneHourAgo,
  ).length;

  return {
    timeSinceLastPickup,
    hourOfDay: hour,
    notificationTriggered: Math.random() < 0.3, // Simulated in demo
    currentDuration: episode.duration,
    appCategory: episode.appCategory,
    recentPickupCount: recentCount,
    inFocusSession: episode.duringFocusSession,
    dayOfWeek: startTime.getDay(),
    avgPickupIntervalForHour: avgIntervals?.[hour] ?? 900, // Default 15min
  };
}

// ── Context Classification ───────────────────────────────────────────────

/**
 * Classifies the usage context based on extracted features.
 *
 * This is a rule-based classifier that can be refined by human feedback.
 * In production, this would be a lightweight ML model (logistic regression
 * or small decision tree) trained on user-corrected labels.
 *
 * @param features - Extracted context features
 * @param learnedWeights - Weights updated from human feedback (optional)
 * @returns Classified context with confidence score
 */
export function classifyContext(
  features: ContextFeatures,
  learnedWeights?: ContextWeights,
): {
  context: UsageContext;
  confidence: number;
  scores: Record<UsageContext, number>;
} {
  const weights = learnedWeights ?? getDefaultWeights();

  // Compute score for each context
  const scores: Record<UsageContext, number> = {
    intentional_task: scoreIntentionalTask(features, weights),
    work_break: scoreWorkBreak(features, weights),
    social_response: scoreSocialResponse(features, weights),
    boredom_habit: scoreBoredomHabit(features, weights),
    anxiety_check: scoreAnxietyCheck(features, weights),
    transition_moment: scoreTransitionMoment(features, weights),
    unknown: 0.1, // Low baseline for unknown
  };

  // Softmax normalization
  const maxScore = Math.max(...Object.values(scores));
  const expScores: Record<string, number> = {};
  let sumExp = 0;
  for (const [ctx, score] of Object.entries(scores)) {
    const exp = Math.exp((score - maxScore) / 0.3);
    expScores[ctx] = exp;
    sumExp += exp;
  }

  // Find top context
  let bestContext: UsageContext = "unknown";
  let bestProb = 0;
  const normalizedScores: Record<UsageContext, number> = {} as Record<
    UsageContext,
    number
  >;
  for (const [ctx, exp] of Object.entries(expScores)) {
    const prob = exp / sumExp;
    normalizedScores[ctx as UsageContext] = prob;
    if (prob > bestProb) {
      bestProb = prob;
      bestContext = ctx as UsageContext;
    }
  }

  return {
    context: bestContext,
    confidence: bestProb,
    scores: normalizedScores,
  };
}

/**
 * Classifies a batch of episodes.
 */
export function classifyEpisodes(
  episodes: UsageEpisode[],
  learnedWeights?: ContextWeights,
): UsageEpisode[] {
  return episodes.map((episode, index) => {
    const features = extractFeatures(episode, episodes.slice(0, index));
    const { context } = classifyContext(features, learnedWeights);
    return { ...episode, classifiedContext: context };
  });
}

// ── Scoring Functions ────────────────────────────────────────────────────

export interface ContextWeights {
  /** Weight adjustments per context per feature, learned from feedback */
  adjustments: Partial<Record<UsageContext, Record<string, number>>>;
  /** Number of corrections received */
  correctionCount: number;
}

function getDefaultWeights(): ContextWeights {
  return {
    adjustments: {},
    correctionCount: 0,
  };
}

function getAdj(
  weights: ContextWeights,
  context: UsageContext,
  feature: string,
): number {
  return weights.adjustments[context]?.[feature] ?? 0;
}

function scoreIntentionalTask(f: ContextFeatures, w: ContextWeights): number {
  let score = 0;
  const adj = (feat: string) => getAdj(w, "intentional_task", feat);

  // Productivity/utility apps suggest intention
  if (f.appCategory === "productivity") score += 0.4 + adj("productivity");
  if (f.appCategory === "utility") score += 0.3 + adj("utility");

  // Short duration suggests quick lookup
  if (f.currentDuration < 60) score += 0.2 + adj("short_duration");

  // Long gap since last pickup suggests deliberate action
  if (f.timeSinceLastPickup > 1800) score += 0.2 + adj("long_gap");

  return Math.max(score, 0);
}

function scoreWorkBreak(f: ContextFeatures, w: ContextWeights): number {
  let score = 0;
  const adj = (feat: string) => getAdj(w, "work_break", feat);

  // During work hours
  if (f.hourOfDay >= 9 && f.hourOfDay <= 17) score += 0.2 + adj("work_hours");

  // Not too frequent (a break, not a pattern)
  if (f.recentPickupCount < 4) score += 0.2 + adj("low_frequency");

  // Moderate duration
  if (f.currentDuration >= 60 && f.currentDuration <= 300) {
    score += 0.3 + adj("moderate_duration");
  }

  // Various app types during break
  if (f.appCategory === "social_media" || f.appCategory === "entertainment") {
    score += 0.15 + adj("leisure_app");
  }

  return Math.max(score, 0);
}

function scoreSocialResponse(f: ContextFeatures, w: ContextWeights): number {
  let score = 0;
  const adj = (feat: string) => getAdj(w, "social_response", feat);

  // Notification triggered
  if (f.notificationTriggered) score += 0.4 + adj("notification");

  // Messaging app
  if (f.appCategory === "messaging") score += 0.35 + adj("messaging");

  // Short duration (quick reply)
  if (f.currentDuration < 90) score += 0.15 + adj("short_reply");

  return Math.max(score, 0);
}

function scoreBoredomHabit(f: ContextFeatures, w: ContextWeights): number {
  let score = 0;
  const adj = (feat: string) => getAdj(w, "boredom_habit", feat);

  // Very short gap since last pickup (compulsive pattern)
  if (f.timeSinceLastPickup < 300) score += 0.35 + adj("short_gap");

  // Social media or entertainment
  if (f.appCategory === "social_media") score += 0.3 + adj("social_media");
  if (f.appCategory === "entertainment") score += 0.2 + adj("entertainment");

  // High recent pickup count
  if (f.recentPickupCount > 6) score += 0.25 + adj("high_frequency");

  // No notification trigger
  if (!f.notificationTriggered) score += 0.1 + adj("no_trigger");

  // Pickup interval much shorter than average for this hour
  if (f.timeSinceLastPickup < f.avgPickupIntervalForHour * 0.5) {
    score += 0.2 + adj("below_avg_interval");
  }

  return Math.max(score, 0);
}

function scoreAnxietyCheck(f: ContextFeatures, w: ContextWeights): number {
  let score = 0;
  const adj = (feat: string) => getAdj(w, "anxiety_check", feat);

  // Very short duration (just checking, not engaging)
  if (f.currentDuration < 15) score += 0.35 + adj("very_short");

  // Rapid repeated pickups
  if (f.timeSinceLastPickup < 180 && f.recentPickupCount > 4) {
    score += 0.3 + adj("rapid_repeat");
  }

  // During focus session (checking when should be focused)
  if (f.inFocusSession) score += 0.25 + adj("in_session");

  return Math.max(score, 0);
}

function scoreTransitionMoment(f: ContextFeatures, w: ContextWeights): number {
  let score = 0;
  const adj = (feat: string) => getAdj(w, "transition_moment", feat);

  // Commute hours
  if (
    (f.hourOfDay >= 7 && f.hourOfDay <= 9) ||
    (f.hourOfDay >= 16 && f.hourOfDay <= 18)
  ) {
    score += 0.25 + adj("commute_hours");
  }

  // Moderate gap (between activities)
  if (f.timeSinceLastPickup >= 600 && f.timeSinceLastPickup <= 3600) {
    score += 0.2 + adj("moderate_gap");
  }

  // Mixed app categories (browsing around)
  if (f.currentDuration > 30 && f.currentDuration < 180) {
    score += 0.15 + adj("browse_duration");
  }

  return Math.max(score, 0);
}

// ── Weight Updates from Human Feedback ───────────────────────────────────

/**
 * Updates classifier weights based on human feedback.
 *
 * When a user corrects the context classification, we adjust the
 * scoring weights to make the correct context more likely for similar
 * future feature patterns.
 *
 * @param weights - Current weights
 * @param features - Features of the episode being corrected
 * @param predictedContext - What the classifier predicted
 * @param correctedContext - What the user said it actually was
 * @param learningRate - How much to adjust (default 0.05)
 * @returns Updated weights
 */
export function updateWeightsFromFeedback(
  weights: ContextWeights,
  features: ContextFeatures,
  predictedContext: UsageContext,
  correctedContext: UsageContext,
  learningRate: number = 0.05,
): ContextWeights {
  const newWeights: ContextWeights = {
    adjustments: JSON.parse(JSON.stringify(weights.adjustments)),
    correctionCount: weights.correctionCount + 1,
  };

  // Boost features that are active for the corrected context
  // Suppress features for the predicted (wrong) context
  const activeFeatures = getActiveFeatures(features);

  for (const feat of activeFeatures) {
    // Boost corrected context
    if (!newWeights.adjustments[correctedContext]) {
      newWeights.adjustments[correctedContext] = {};
    }
    const currentBoost = newWeights.adjustments[correctedContext]![feat] ?? 0;
    newWeights.adjustments[correctedContext]![feat] =
      currentBoost + learningRate;

    // Suppress predicted (wrong) context
    if (!newWeights.adjustments[predictedContext]) {
      newWeights.adjustments[predictedContext] = {};
    }
    const currentSuppress =
      newWeights.adjustments[predictedContext]![feat] ?? 0;
    newWeights.adjustments[predictedContext]![feat] =
      currentSuppress - learningRate * 0.5;
  }

  return newWeights;
}

function getActiveFeatures(features: ContextFeatures): string[] {
  const active: string[] = [];

  if (features.appCategory === "productivity") active.push("productivity");
  if (features.appCategory === "utility") active.push("utility");
  if (features.appCategory === "social_media") active.push("social_media");
  if (features.appCategory === "messaging") active.push("messaging");
  if (features.appCategory === "entertainment") active.push("entertainment");
  if (features.currentDuration < 15) active.push("very_short");
  if (features.currentDuration < 60) active.push("short_duration");
  if (features.currentDuration < 90) active.push("short_reply");
  if (features.currentDuration >= 60 && features.currentDuration <= 300)
    active.push("moderate_duration");
  if (features.timeSinceLastPickup > 1800) active.push("long_gap");
  if (features.timeSinceLastPickup < 300) active.push("short_gap");
  if (features.notificationTriggered) active.push("notification");
  if (!features.notificationTriggered) active.push("no_trigger");
  if (features.recentPickupCount > 6) active.push("high_frequency");
  if (features.recentPickupCount < 4) active.push("low_frequency");
  if (features.inFocusSession) active.push("in_session");
  if (features.hourOfDay >= 9 && features.hourOfDay <= 17)
    active.push("work_hours");
  if (
    (features.hourOfDay >= 7 && features.hourOfDay <= 9) ||
    (features.hourOfDay >= 16 && features.hourOfDay <= 18)
  )
    active.push("commute_hours");

  return active;
}
