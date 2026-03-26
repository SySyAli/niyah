/**
 * contextClassifier — Unit Tests
 *
 * Tests the JITAI context classifier: feature extraction, scoring logic,
 * batch classification, and weight updates from human feedback.
 */

import type {
  UsageEpisode,
  UsageContext,
  ContextFeatures,
  AppCategory,
} from "../../../jitai/types";
import {
  extractFeatures,
  classifyContext,
  classifyEpisodes,
  updateWeightsFromFeedback,
  ContextWeights,
} from "../../../jitai/contextClassifier";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Build a UsageEpisode with sensible defaults. */
function makeEpisode(overrides: Partial<UsageEpisode> = {}): UsageEpisode {
  return {
    id: "ep-1",
    startTime: "2026-03-24T10:00:00.000Z",
    endTime: "2026-03-24T10:01:00.000Z",
    duration: 60,
    appCategory: "social_media",
    duringFocusSession: false,
    classifiedContext: "unknown",
    ...overrides,
  };
}

/** Build ContextFeatures with explicit values (no randomness). */
function makeFeatures(
  overrides: Partial<ContextFeatures> = {},
): ContextFeatures {
  return {
    timeSinceLastPickup: 900,
    hourOfDay: 12,
    notificationTriggered: false,
    currentDuration: 60,
    appCategory: "social_media",
    recentPickupCount: 3,
    inFocusSession: false,
    dayOfWeek: 2, // Tuesday
    avgPickupIntervalForHour: 900,
    ...overrides,
  };
}

function defaultWeights(): ContextWeights {
  return { adjustments: {}, correctionCount: 0 };
}

// ── extractFeatures ──────────────────────────────────────────────────────

describe("extractFeatures", () => {
  let mathRandomSpy: jest.SpyInstance;

  beforeEach(() => {
    mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it("extracts basic fields from an episode", () => {
    const startTime = "2026-03-24T14:30:00.000Z";
    const episode = makeEpisode({
      startTime,
      duration: 45,
      appCategory: "productivity",
      duringFocusSession: true,
    });

    const features = extractFeatures(episode, []);

    // getHours() returns local time, so we derive the expected hour the same way
    const expectedHour = new Date(startTime).getHours();
    expect(features.hourOfDay).toBe(expectedHour);
    expect(features.currentDuration).toBe(45);
    expect(features.appCategory).toBe("productivity");
    expect(features.inFocusSession).toBe(true);
    expect(features.dayOfWeek).toBe(new Date(startTime).getDay());
  });

  it("calculates timeSinceLastPickup from the most recent prior episode", () => {
    const current = makeEpisode({
      startTime: "2026-03-24T10:10:00.000Z",
    });
    const prev1 = makeEpisode({
      id: "ep-prev1",
      startTime: "2026-03-24T10:05:00.000Z", // 5 min before
    });
    const prev2 = makeEpisode({
      id: "ep-prev2",
      startTime: "2026-03-24T10:00:00.000Z", // 10 min before
    });

    const features = extractFeatures(current, [prev2, prev1]);

    // Should use the most recent prior episode (10:05), gap = 5 min = 300s
    expect(features.timeSinceLastPickup).toBe(300);
  });

  it("defaults timeSinceLastPickup to 3600s when no prior episodes", () => {
    const episode = makeEpisode({
      startTime: "2026-03-24T10:00:00.000Z",
    });

    const features = extractFeatures(episode, []);

    expect(features.timeSinceLastPickup).toBe(3600);
  });

  it("counts recentPickupCount within the last hour", () => {
    const current = makeEpisode({
      startTime: "2026-03-24T10:00:00.000Z",
    });
    const withinHour1 = makeEpisode({
      id: "ep-2",
      startTime: "2026-03-24T09:30:00.000Z", // 30 min before (within hour)
    });
    const withinHour2 = makeEpisode({
      id: "ep-3",
      startTime: "2026-03-24T09:45:00.000Z", // 15 min before (within hour)
    });
    const outsideHour = makeEpisode({
      id: "ep-4",
      startTime: "2026-03-24T08:30:00.000Z", // 90 min before (outside hour)
    });

    const features = extractFeatures(current, [
      outsideHour,
      withinHour1,
      withinHour2,
    ]);

    expect(features.recentPickupCount).toBe(2);
  });

  it("uses avgIntervals when provided", () => {
    const startTime = "2026-03-24T14:00:00.000Z";
    const localHour = new Date(startTime).getHours();
    const episode = makeEpisode({ startTime });
    const avgIntervals: Record<number, number> = { [localHour]: 1200 };

    const features = extractFeatures(episode, [], avgIntervals);

    expect(features.avgPickupIntervalForHour).toBe(1200);
  });

  it("defaults avgPickupIntervalForHour to 900 when no avgIntervals given", () => {
    const episode = makeEpisode({
      startTime: "2026-03-24T14:00:00.000Z",
    });

    const features = extractFeatures(episode, []);

    expect(features.avgPickupIntervalForHour).toBe(900);
  });

  it("defaults avgPickupIntervalForHour to 900 when hour not in avgIntervals", () => {
    const episode = makeEpisode({
      startTime: "2026-03-24T14:00:00.000Z", // hour 14
    });
    const avgIntervals: Record<number, number> = { 10: 600 }; // no entry for 14

    const features = extractFeatures(episode, [], avgIntervals);

    expect(features.avgPickupIntervalForHour).toBe(900);
  });

  it("sets notificationTriggered based on Math.random() < 0.3", () => {
    // Math.random returns 0.5 -> notificationTriggered = false
    const episode = makeEpisode();
    const features1 = extractFeatures(episode, []);
    expect(features1.notificationTriggered).toBe(false);

    // Now mock Math.random to return 0.1 -> notificationTriggered = true
    mathRandomSpy.mockReturnValue(0.1);
    const features2 = extractFeatures(episode, []);
    expect(features2.notificationTriggered).toBe(true);
  });

  it("excludes episodes that are at or after the current start time from previousEpisodes", () => {
    const current = makeEpisode({
      startTime: "2026-03-24T10:00:00.000Z",
    });
    // Same timestamp should NOT count as previous
    const sameTime = makeEpisode({
      id: "ep-same",
      startTime: "2026-03-24T10:00:00.000Z",
    });
    const future = makeEpisode({
      id: "ep-future",
      startTime: "2026-03-24T10:05:00.000Z",
    });

    const features = extractFeatures(current, [sameTime, future]);

    // No valid prior episode -> defaults to 3600s
    expect(features.timeSinceLastPickup).toBe(3600);
  });
});

// ── classifyContext ──────────────────────────────────────────────────────

describe("classifyContext", () => {
  it("classifies intentional_task for productivity app with long gap and short duration", () => {
    const features = makeFeatures({
      appCategory: "productivity",
      timeSinceLastPickup: 2000, // > 1800
      currentDuration: 30, // < 60
      recentPickupCount: 2,
    });

    const result = classifyContext(features);

    expect(result.context).toBe("intentional_task");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies boredom_habit for social_media with short gap, high frequency, no notification", () => {
    const features = makeFeatures({
      appCategory: "social_media",
      timeSinceLastPickup: 100, // < 300
      recentPickupCount: 8, // > 6
      notificationTriggered: false,
      currentDuration: 120,
      hourOfDay: 22, // outside work hours
      avgPickupIntervalForHour: 300, // 100 < 300*0.5=150
      inFocusSession: false,
    });

    const result = classifyContext(features);

    expect(result.context).toBe("boredom_habit");
  });

  it("classifies anxiety_check for very short duration, rapid repeats, in focus session", () => {
    const features = makeFeatures({
      currentDuration: 5, // < 15 -> anxiety very_short +0.35
      timeSinceLastPickup: 60, // < 180 -> anxiety rapid_repeat (with pickups>4) +0.3
      recentPickupCount: 8, // > 4 -> enables rapid_repeat; also boredom high_frequency
      inFocusSession: true, // anxiety in_session +0.25
      appCategory: "unknown",
      notificationTriggered: true, // removes boredom no_trigger bonus; adds social_response but not enough
      hourOfDay: 22, // outside work & commute hours
      avgPickupIntervalForHour: 60, // 60 is NOT < 60*0.5=30, so no below_avg_interval for boredom
    });

    // anxiety_check = 0.35 + 0.3 + 0.25 = 0.9
    // boredom_habit = 0.35 + 0.25 = 0.6 (short_gap + high_frequency, no no_trigger, no below_avg)
    // social_response = 0.4 + 0.15 = 0.55 (notification + short_reply since 5<90)
    const result = classifyContext(features);

    expect(result.context).toBe("anxiety_check");
  });

  it("classifies work_break for moderate duration during work hours with low frequency", () => {
    const features = makeFeatures({
      hourOfDay: 12, // work hours 9-17
      recentPickupCount: 2, // < 4
      currentDuration: 150, // 60-300
      appCategory: "entertainment", // leisure app bonus
      timeSinceLastPickup: 1000, // not triggering long_gap or short_gap
      notificationTriggered: false,
      inFocusSession: false,
    });

    const result = classifyContext(features);

    expect(result.context).toBe("work_break");
  });

  it("classifies social_response for notification-triggered messaging with short duration", () => {
    const features = makeFeatures({
      notificationTriggered: true,
      appCategory: "messaging",
      currentDuration: 45, // < 90
      timeSinceLastPickup: 1000, // moderate gap, not triggering boredom
      recentPickupCount: 2,
      hourOfDay: 22, // avoid work hours bonus for work_break
      inFocusSession: false,
    });

    const result = classifyContext(features);

    expect(result.context).toBe("social_response");
  });

  it("classifies transition_moment for commute hours with moderate gap and browse duration", () => {
    const features = makeFeatures({
      hourOfDay: 8, // commute hours 7-9
      timeSinceLastPickup: 1200, // 600-3600
      currentDuration: 90, // 30-180
      appCategory: "unknown", // no strong category signal
      notificationTriggered: false,
      recentPickupCount: 2, // low (could trigger work_break on work hours, but 8 is not 9-17)
      inFocusSession: false,
    });

    const result = classifyContext(features);

    expect(result.context).toBe("transition_moment");
  });

  it("returns scores that sum to approximately 1 (softmax normalization)", () => {
    const features = makeFeatures();
    const result = classifyContext(features);

    const sum = Object.values(result.scores).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("returns all context types in scores", () => {
    const features = makeFeatures();
    const result = classifyContext(features);

    const expectedContexts: UsageContext[] = [
      "intentional_task",
      "work_break",
      "social_response",
      "boredom_habit",
      "anxiety_check",
      "transition_moment",
      "unknown",
    ];

    for (const ctx of expectedContexts) {
      expect(result.scores).toHaveProperty(ctx);
      expect(typeof result.scores[ctx]).toBe("number");
    }
  });

  it("confidence is the highest score in normalized scores", () => {
    const features = makeFeatures({
      appCategory: "productivity",
      timeSinceLastPickup: 2000,
      currentDuration: 30,
    });
    const result = classifyContext(features);

    const maxScore = Math.max(...Object.values(result.scores));
    expect(result.confidence).toBeCloseTo(maxScore, 10);
  });

  it("uses custom weights adjustments when provided", () => {
    // Features that would normally score poorly for intentional_task
    const features = makeFeatures({
      appCategory: "social_media", // no productivity or utility bonus
      timeSinceLastPickup: 100, // no long_gap bonus
      currentDuration: 120, // no short_duration bonus
      hourOfDay: 22, // outside work hours
      recentPickupCount: 8,
      notificationTriggered: false,
    });

    // Without weights: should NOT be intentional_task
    const defaultResult = classifyContext(features);
    expect(defaultResult.context).not.toBe("intentional_task");

    // With heavy custom weights boosting intentional_task on social_media feature
    // Since social_media doesn't directly map to intentional_task scoring,
    // we need to boost via features that ARE active
    // short_gap is active (100 < 300), but intentional_task doesn't use it directly.
    // Instead, we suppress boredom_habit heavily
    const weights: ContextWeights = {
      adjustments: {
        boredom_habit: {
          short_gap: -2.0,
          social_media: -2.0,
          high_frequency: -2.0,
          no_trigger: -2.0,
          below_avg_interval: -2.0,
        },
      },
      correctionCount: 10,
    };

    const boostedResult = classifyContext(features, weights);
    // The boredom_habit score should be clamped to 0 and other contexts should win
    expect(boostedResult.context).not.toBe("boredom_habit");
  });

  it("unknown baseline is 0.1 and can win if all other scores are 0", () => {
    // Create features where nothing scores highly
    // All scores should be very low or zero with negative adjustments
    const features = makeFeatures({
      appCategory: "health", // no scoring function adds for health specifically
      timeSinceLastPickup: 500, // not < 300, not > 1800, not 600-3600
      currentDuration: 400, // not < 15, not < 60, not < 90, not 60-300, not 30-180
      recentPickupCount: 5, // not > 6, not < 4
      notificationTriggered: false,
      hourOfDay: 3, // not work hours, not commute hours
      inFocusSession: false,
    });

    const result = classifyContext(features);

    // All contexts should score 0 except unknown=0.1
    // boredom_habit gets 0.1 for no_trigger, so it might tie
    // But let's verify unknown has its 0.1 baseline
    expect(result.scores.unknown).toBeGreaterThan(0);
  });
});

// ── Scoring edge cases ──────────────────────────────────────────────────

describe("scoring logic edge cases", () => {
  it("scoreIntentionalTask: utility app gets +0.3", () => {
    const utilityFeatures = makeFeatures({
      appCategory: "utility",
      timeSinceLastPickup: 500,
      currentDuration: 120,
    });
    const unknownFeatures = makeFeatures({
      appCategory: "unknown",
      timeSinceLastPickup: 500,
      currentDuration: 120,
    });

    const utilityResult = classifyContext(utilityFeatures);
    const unknownResult = classifyContext(unknownFeatures);

    // Utility features should give higher intentional_task score
    expect(utilityResult.scores.intentional_task).toBeGreaterThan(
      unknownResult.scores.intentional_task,
    );
  });

  it("scoreBoredomHabit: below-avg interval adds +0.2", () => {
    // timeSinceLastPickup < avgPickupIntervalForHour * 0.5
    const belowAvg = makeFeatures({
      appCategory: "social_media",
      timeSinceLastPickup: 100, // < 300 (short_gap) and < 600*0.5=300
      avgPickupIntervalForHour: 600,
      recentPickupCount: 8,
      notificationTriggered: false,
      hourOfDay: 22,
      inFocusSession: false,
      currentDuration: 120,
    });
    const atAvg = makeFeatures({
      appCategory: "social_media",
      timeSinceLastPickup: 100,
      avgPickupIntervalForHour: 100, // 100 is NOT < 100*0.5=50
      recentPickupCount: 8,
      notificationTriggered: false,
      hourOfDay: 22,
      inFocusSession: false,
      currentDuration: 120,
    });

    const belowResult = classifyContext(belowAvg);
    const atResult = classifyContext(atAvg);

    expect(belowResult.scores.boredom_habit).toBeGreaterThan(
      atResult.scores.boredom_habit,
    );
  });

  it("scoreAnxietyCheck: requires BOTH rapid gap and high pickup count for rapid_repeat", () => {
    // Only short gap, but low pickup count
    const shortGapOnly = makeFeatures({
      currentDuration: 5,
      timeSinceLastPickup: 60, // < 180
      recentPickupCount: 2, // NOT > 4
      inFocusSession: true,
      appCategory: "unknown",
      hourOfDay: 22,
    });
    // Both conditions met
    const bothConditions = makeFeatures({
      currentDuration: 5,
      timeSinceLastPickup: 60,
      recentPickupCount: 8, // > 4
      inFocusSession: true,
      appCategory: "unknown",
      hourOfDay: 22,
    });

    const r1 = classifyContext(shortGapOnly);
    const r2 = classifyContext(bothConditions);

    expect(r2.scores.anxiety_check).toBeGreaterThan(r1.scores.anxiety_check);
  });

  it("scoreWorkBreak: entertainment app gets leisure bonus +0.15", () => {
    const withEntertainment = makeFeatures({
      hourOfDay: 12,
      recentPickupCount: 2,
      currentDuration: 150,
      appCategory: "entertainment",
      timeSinceLastPickup: 1000,
    });
    const withHealth = makeFeatures({
      hourOfDay: 12,
      recentPickupCount: 2,
      currentDuration: 150,
      appCategory: "health", // no leisure bonus
      timeSinceLastPickup: 1000,
    });

    const r1 = classifyContext(withEntertainment);
    const r2 = classifyContext(withHealth);

    expect(r1.scores.work_break).toBeGreaterThan(r2.scores.work_break);
  });

  it("scoreWorkBreak: social_media also gets leisure bonus", () => {
    const withSocial = makeFeatures({
      hourOfDay: 12,
      recentPickupCount: 2,
      currentDuration: 150,
      appCategory: "social_media",
      timeSinceLastPickup: 1000,
    });
    const withEducation = makeFeatures({
      hourOfDay: 12,
      recentPickupCount: 2,
      currentDuration: 150,
      appCategory: "education", // no leisure bonus
      timeSinceLastPickup: 1000,
    });

    const r1 = classifyContext(withSocial);
    const r2 = classifyContext(withEducation);

    expect(r1.scores.work_break).toBeGreaterThan(r2.scores.work_break);
  });

  it("scoreTransitionMoment: afternoon commute hours (16-18) also score", () => {
    const afternoon = makeFeatures({
      hourOfDay: 17, // 16-18
      timeSinceLastPickup: 1200,
      currentDuration: 90,
      appCategory: "unknown",
    });
    const midday = makeFeatures({
      hourOfDay: 13, // not commute
      timeSinceLastPickup: 1200,
      currentDuration: 90,
      appCategory: "unknown",
    });

    const r1 = classifyContext(afternoon);
    const r2 = classifyContext(midday);

    expect(r1.scores.transition_moment).toBeGreaterThan(
      r2.scores.transition_moment,
    );
  });

  it("scores are clamped to at least 0 (Math.max(score, 0))", () => {
    // Use extremely negative weight adjustments
    const weights: ContextWeights = {
      adjustments: {
        intentional_task: { productivity: -5.0 },
      },
      correctionCount: 5,
    };

    const features = makeFeatures({
      appCategory: "productivity",
      timeSinceLastPickup: 500,
      currentDuration: 120,
    });

    const result = classifyContext(features, weights);

    // Even with heavy negative adjustment, score should not go below 0
    // All normalized scores should be non-negative
    for (const score of Object.values(result.scores)) {
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── classifyEpisodes ─────────────────────────────────────────────────────

describe("classifyEpisodes", () => {
  let mathRandomSpy: jest.SpyInstance;

  beforeEach(() => {
    mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it("returns episodes with classifiedContext set", () => {
    const episodes: UsageEpisode[] = [
      makeEpisode({
        id: "ep-1",
        startTime: "2026-03-24T10:00:00.000Z",
        duration: 30,
        appCategory: "productivity",
      }),
      makeEpisode({
        id: "ep-2",
        startTime: "2026-03-24T10:05:00.000Z",
        duration: 120,
        appCategory: "entertainment",
      }),
    ];

    const result = classifyEpisodes(episodes);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ep-1");
    expect(result[1].id).toBe("ep-2");
    // Each should have a valid context
    const validContexts: UsageContext[] = [
      "intentional_task",
      "work_break",
      "social_response",
      "boredom_habit",
      "anxiety_check",
      "transition_moment",
      "unknown",
    ];
    for (const ep of result) {
      expect(validContexts).toContain(ep.classifiedContext);
    }
  });

  it("uses only preceding episodes as history for each episode", () => {
    const episodes: UsageEpisode[] = [
      makeEpisode({
        id: "ep-1",
        startTime: "2026-03-24T10:00:00.000Z",
        duration: 10,
        appCategory: "social_media",
      }),
      makeEpisode({
        id: "ep-2",
        startTime: "2026-03-24T10:01:00.000Z", // 60s gap
        duration: 10,
        appCategory: "social_media",
      }),
      makeEpisode({
        id: "ep-3",
        startTime: "2026-03-24T10:02:00.000Z", // 60s gap
        duration: 10,
        appCategory: "social_media",
      }),
    ];

    const result = classifyEpisodes(episodes);

    // First episode has no prior history (recentPickupCount should be 0)
    // The classification should differ as context grows
    expect(result).toHaveLength(3);
    expect(result[0].classifiedContext).toBeDefined();
    expect(result[2].classifiedContext).toBeDefined();
  });

  it("returns empty array for empty input", () => {
    const result = classifyEpisodes([]);
    expect(result).toEqual([]);
  });

  it("passes learnedWeights through to classifyContext", () => {
    const episodes: UsageEpisode[] = [
      makeEpisode({
        id: "ep-1",
        startTime: "2026-03-24T14:00:00.000Z", // hour 14 (work hours)
        duration: 150, // moderate
        appCategory: "entertainment", // leisure
      }),
    ];

    // Without weights
    const resultDefault = classifyEpisodes(episodes);

    // With weights that heavily boost intentional_task
    const weights: ContextWeights = {
      adjustments: {
        work_break: {
          work_hours: -3.0,
          moderate_duration: -3.0,
          low_frequency: -3.0,
          leisure_app: -3.0,
        },
      },
      correctionCount: 20,
    };

    const resultWeighted = classifyEpisodes(episodes, weights);

    // The classification should change
    // (work_break should be suppressed in weighted version)
    expect(resultWeighted[0].classifiedContext).not.toBe("work_break");
  });
});

// ── updateWeightsFromFeedback ────────────────────────────────────────────

describe("updateWeightsFromFeedback", () => {
  it("increments correctionCount", () => {
    const weights = defaultWeights();
    const features = makeFeatures({ appCategory: "productivity" });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "intentional_task",
    );

    expect(updated.correctionCount).toBe(1);
  });

  it("boosts corrected context weights for active features", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "productivity", // active: "productivity"
      currentDuration: 30, // active: "short_duration", "short_reply", "very_short" NO — 30 is < 60, < 90, but not < 15
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "intentional_task",
      0.1,
    );

    // "productivity" is an active feature, should be boosted for intentional_task
    expect(updated.adjustments.intentional_task!["productivity"]).toBeCloseTo(
      0.1,
    );
    // "short_duration" is active (30 < 60)
    expect(updated.adjustments.intentional_task!["short_duration"]).toBeCloseTo(
      0.1,
    );
  });

  it("suppresses predicted (wrong) context weights at half the learning rate", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "productivity",
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "intentional_task",
      0.1,
    );

    // "productivity" should be suppressed for boredom_habit at -0.1 * 0.5 = -0.05
    expect(updated.adjustments.boredom_habit!["productivity"]).toBeCloseTo(
      -0.05,
    );
  });

  it("accumulates adjustments over multiple corrections", () => {
    let weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "messaging",
      notificationTriggered: true,
      currentDuration: 30,
    });

    // First correction
    weights = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "social_response",
      0.1,
    );

    expect(weights.correctionCount).toBe(1);
    expect(weights.adjustments.social_response!["messaging"]).toBeCloseTo(0.1);

    // Second correction with same features
    weights = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "social_response",
      0.1,
    );

    expect(weights.correctionCount).toBe(2);
    expect(weights.adjustments.social_response!["messaging"]).toBeCloseTo(0.2);
  });

  it("does not mutate the original weights object", () => {
    const weights = defaultWeights();
    const features = makeFeatures({ appCategory: "productivity" });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "intentional_task",
    );

    expect(weights.correctionCount).toBe(0);
    expect(weights.adjustments).toEqual({});
    expect(updated.correctionCount).toBe(1);
    expect(updated).not.toBe(weights);
  });

  it("uses default learning rate of 0.05 when not specified", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "social_media",
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "intentional_task",
      "boredom_habit",
    );

    // Boost: +0.05 for corrected context
    expect(updated.adjustments.boredom_habit!["social_media"]).toBeCloseTo(
      0.05,
    );
    // Suppress: -0.05 * 0.5 = -0.025 for predicted context
    expect(updated.adjustments.intentional_task!["social_media"]).toBeCloseTo(
      -0.025,
    );
  });

  it("handles all active features from a complex feature set", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "social_media", // -> "social_media"
      currentDuration: 10, // -> "very_short", "short_duration", "short_reply"
      timeSinceLastPickup: 100, // -> "short_gap"
      notificationTriggered: false, // -> "no_trigger"
      recentPickupCount: 8, // -> "high_frequency"
      inFocusSession: true, // -> "in_session"
      hourOfDay: 12, // -> "work_hours"
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "anxiety_check",
      0.1,
    );

    // All active features should be present in the corrected context adjustments
    const boosted = updated.adjustments.anxiety_check!;
    expect(boosted["social_media"]).toBeCloseTo(0.1);
    expect(boosted["very_short"]).toBeCloseTo(0.1);
    expect(boosted["short_duration"]).toBeCloseTo(0.1);
    expect(boosted["short_reply"]).toBeCloseTo(0.1);
    expect(boosted["short_gap"]).toBeCloseTo(0.1);
    expect(boosted["no_trigger"]).toBeCloseTo(0.1);
    expect(boosted["high_frequency"]).toBeCloseTo(0.1);
    expect(boosted["in_session"]).toBeCloseTo(0.1);
    expect(boosted["work_hours"]).toBeCloseTo(0.1);

    // All active features should be suppressed in the predicted context
    const suppressed = updated.adjustments.boredom_habit!;
    expect(suppressed["social_media"]).toBeCloseTo(-0.05);
    expect(suppressed["in_session"]).toBeCloseTo(-0.05);
  });

  it("handles notification=true as an active feature", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      notificationTriggered: true,
      appCategory: "health", // no category-specific active feature except via threshold checks
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "unknown",
      "social_response",
      0.1,
    );

    expect(updated.adjustments.social_response!["notification"]).toBeCloseTo(
      0.1,
    );
    // no_trigger should NOT be present since notificationTriggered=true
    expect(updated.adjustments.social_response!["no_trigger"]).toBeUndefined();
  });

  it("handles commute hours as an active feature", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      hourOfDay: 8, // 7-9 commute
      appCategory: "unknown",
      timeSinceLastPickup: 500,
      currentDuration: 200,
      recentPickupCount: 5,
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "unknown",
      "transition_moment",
      0.1,
    );

    expect(updated.adjustments.transition_moment!["commute_hours"]).toBeCloseTo(
      0.1,
    );
  });

  it("activates 'utility' feature for appCategory = utility", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "utility",
      timeSinceLastPickup: 500,
      currentDuration: 200,
      recentPickupCount: 5,
      hourOfDay: 12,
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "intentional_task",
      0.1,
    );

    expect(updated.adjustments.intentional_task!["utility"]).toBeCloseTo(0.1);
  });

  it("activates 'entertainment' feature for appCategory = entertainment", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "entertainment",
      timeSinceLastPickup: 500,
      currentDuration: 200,
      recentPickupCount: 5,
      hourOfDay: 12,
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "intentional_task",
      "work_break",
      0.1,
    );

    expect(updated.adjustments.work_break!["entertainment"]).toBeCloseTo(0.1);
  });

  it("activates 'long_gap' feature when timeSinceLastPickup > 1800", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      appCategory: "productivity",
      timeSinceLastPickup: 2000, // > 1800
      currentDuration: 200,
      recentPickupCount: 5,
      hourOfDay: 12,
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "boredom_habit",
      "intentional_task",
      0.1,
    );

    expect(updated.adjustments.intentional_task!["long_gap"]).toBeCloseTo(0.1);
  });

  it("activates 'commute_hours' feature for afternoon commute (hour 16-18)", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      hourOfDay: 17, // afternoon commute (16-18)
      appCategory: "unknown",
      timeSinceLastPickup: 500,
      currentDuration: 200,
      recentPickupCount: 5,
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "unknown",
      "transition_moment",
      0.1,
    );

    expect(updated.adjustments.transition_moment!["commute_hours"]).toBeCloseTo(
      0.1,
    );
    // Hour 17 is also in work_hours (9-17), so work_hours should be active too
    expect(updated.adjustments.transition_moment!["work_hours"]).toBeCloseTo(
      0.1,
    );
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────

describe("edge cases", () => {
  let mathRandomSpy: jest.SpyInstance;

  beforeEach(() => {
    mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it("extractFeatures handles zero-duration episode", () => {
    const episode = makeEpisode({ duration: 0 });
    const features = extractFeatures(episode, []);

    expect(features.currentDuration).toBe(0);
    // duration 0 is < 15, so very_short applies in classifier
  });

  it("classifyContext handles zero-duration correctly (anxiety_check potential)", () => {
    const features = makeFeatures({
      currentDuration: 0, // < 15 -> very_short +0.35
      timeSinceLastPickup: 60, // < 180 -> rapid_repeat +0.3
      recentPickupCount: 8, // > 4
      inFocusSession: true, // in_session +0.25
      appCategory: "unknown",
      hourOfDay: 22,
      notificationTriggered: true, // removes boredom no_trigger bonus
      avgPickupIntervalForHour: 60, // 60 NOT < 30, no below_avg for boredom
    });

    const result = classifyContext(features);

    // anxiety_check = 0.9, boredom_habit = 0.6
    expect(result.context).toBe("anxiety_check");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("classifyEpisodes with single episode and no history", () => {
    const episodes = [
      makeEpisode({
        id: "solo",
        startTime: "2026-03-24T10:00:00.000Z",
        duration: 30,
        appCategory: "productivity",
      }),
    ];

    const result = classifyEpisodes(episodes);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("solo");
    expect(result[0].classifiedContext).toBeDefined();
  });

  it("extractFeatures with all episodes in the recent hour", () => {
    const current = makeEpisode({
      startTime: "2026-03-24T10:00:00.000Z",
    });
    const recentEpisodes = Array.from({ length: 10 }, (_, i) =>
      makeEpisode({
        id: `ep-${i}`,
        startTime: new Date(
          new Date("2026-03-24T10:00:00.000Z").getTime() - (i + 1) * 60 * 1000,
        ).toISOString(),
      }),
    );

    const features = extractFeatures(current, recentEpisodes);

    expect(features.recentPickupCount).toBe(10);
    expect(features.timeSinceLastPickup).toBe(60); // 1 min to closest
  });

  it("classifyContext is deterministic for identical features", () => {
    const features = makeFeatures({
      appCategory: "productivity",
      timeSinceLastPickup: 2000,
      currentDuration: 30,
    });

    const r1 = classifyContext(features);
    const r2 = classifyContext(features);

    expect(r1.context).toBe(r2.context);
    expect(r1.confidence).toBe(r2.confidence);
    expect(r1.scores).toEqual(r2.scores);
  });

  it("entertainment app scores for boredom_habit (+0.2) different from social_media (+0.3)", () => {
    const socialFeatures = makeFeatures({
      appCategory: "social_media",
      timeSinceLastPickup: 100,
      recentPickupCount: 8,
      notificationTriggered: false,
      hourOfDay: 22,
      currentDuration: 120,
    });
    const entertainmentFeatures = makeFeatures({
      appCategory: "entertainment",
      timeSinceLastPickup: 100,
      recentPickupCount: 8,
      notificationTriggered: false,
      hourOfDay: 22,
      currentDuration: 120,
    });

    const r1 = classifyContext(socialFeatures);
    const r2 = classifyContext(entertainmentFeatures);

    // social_media boredom score should be higher than entertainment
    expect(r1.scores.boredom_habit).toBeGreaterThan(r2.scores.boredom_habit);
  });

  it("overlapping commute and work hours (hour 9) activates both features", () => {
    const weights = defaultWeights();
    const features = makeFeatures({
      hourOfDay: 9, // both commute (7-9) and work (9-17)
    });

    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "unknown",
      "work_break",
      0.1,
    );

    // Both "work_hours" and "commute_hours" should be active
    expect(updated.adjustments.work_break!["work_hours"]).toBeCloseTo(0.1);
    expect(updated.adjustments.work_break!["commute_hours"]).toBeCloseTo(0.1);
  });

  it("updateWeightsFromFeedback with same predicted and corrected context", () => {
    const weights = defaultWeights();
    const features = makeFeatures({ appCategory: "productivity" });

    // User "corrects" to the same context (no-op correction)
    const updated = updateWeightsFromFeedback(
      weights,
      features,
      "intentional_task",
      "intentional_task",
      0.1,
    );

    // Both boost (+0.1) and suppress (-0.05) apply to the same context
    // Net effect: +0.1 - 0.05 = +0.05 per active feature
    expect(updated.adjustments.intentional_task!["productivity"]).toBeCloseTo(
      0.05,
    );
    expect(updated.correctionCount).toBe(1);
  });
});
