import {
  processFeedback,
  generateFeedbackPrompt,
  computeAdaptationMetrics,
  generateAdaptationSummary,
} from "../../../jitai/humanFeedbackLoop";
import type {
  Intervention,
  InterventionFeedback,
  InterventionOutcome,
  UsageEpisode,
  UsageContext,
  AdaptationState,
} from "../../../jitai/types";
import type { ContextWeights } from "../../../jitai/contextClassifier";
import {
  updateWeightsFromFeedback,
  extractFeatures,
} from "../../../jitai/contextClassifier";
import { updateAdaptation } from "../../../jitai/interventionEngine";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../../jitai/contextClassifier", () => ({
  extractFeatures: jest.fn().mockReturnValue({
    timeSinceLastPickup: 120,
    hourOfDay: 14,
    notificationTriggered: false,
    currentDuration: 45,
    appCategory: "social_media",
    recentPickupCount: 5,
    inFocusSession: true,
    dayOfWeek: 3,
    avgPickupIntervalForHour: 900,
  }),
  updateWeightsFromFeedback: jest.fn().mockReturnValue({
    adjustments: { boredom_habit: { social_media: 0.05 } },
    correctionCount: 1,
  }),
}));

jest.mock("../../../jitai/interventionEngine", () => ({
  updateAdaptation: jest.fn().mockReturnValue({
    arms: [],
    suppressedContexts: [],
    quietHours: [],
    totalInterventions: 1,
    totalFeedback: 1,
    lastUpdated: "2026-03-24T12:00:00.000Z",
  }),
}));

const mockedExtractFeatures = extractFeatures as jest.MockedFunction<
  typeof extractFeatures
>;
const mockedUpdateWeightsFromFeedback =
  updateWeightsFromFeedback as jest.MockedFunction<
    typeof updateWeightsFromFeedback
  >;
const mockedUpdateAdaptation = updateAdaptation as jest.MockedFunction<
  typeof updateAdaptation
>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIntervention(
  overrides: Partial<Intervention> = {},
): Intervention {
  return {
    id: "int-001",
    timestamp: "2026-03-24T10:00:00.000Z",
    level: "awareness_nudge",
    triggeringEpisodeId: "ep-001",
    message: "You've picked up your phone 8 times in the last hour.",
    acknowledged: false,
    feedback: null,
    outcome: null,
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<UsageEpisode> = {}): UsageEpisode {
  return {
    id: "ep-001",
    startTime: "2026-03-24T10:00:00.000Z",
    endTime: "2026-03-24T10:01:00.000Z",
    duration: 60,
    appCategory: "social_media",
    duringFocusSession: true,
    classifiedContext: "boredom_habit",
    ...overrides,
  };
}

function makeFeedback(
  overrides: Partial<InterventionFeedback> = {},
): InterventionFeedback {
  return {
    helpful: true,
    timestamp: "2026-03-24T10:05:00.000Z",
    ...overrides,
  };
}

function makeAdaptationState(
  overrides: Partial<AdaptationState> = {},
): AdaptationState {
  return {
    arms: [],
    suppressedContexts: [],
    quietHours: [],
    totalInterventions: 0,
    totalFeedback: 0,
    lastUpdated: "2026-03-24T09:00:00.000Z",
    ...overrides,
  };
}

function makeClassifierWeights(
  overrides: Partial<ContextWeights> = {},
): ContextWeights {
  return {
    adjustments: {},
    correctionCount: 0,
    ...overrides,
  };
}

// ── processFeedback ──────────────────────────────────────────────────────────

describe("processFeedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks the intervention as acknowledged", () => {
    const intervention = makeIntervention({ acknowledged: false });
    const feedback = makeFeedback();
    const outcome: InterventionOutcome = "stopped_usage";

    const result = processFeedback(
      intervention,
      feedback,
      outcome,
      makeEpisode(),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(result.updatedIntervention.acknowledged).toBe(true);
  });

  it("stores the feedback on the intervention", () => {
    const feedback = makeFeedback({
      helpful: false,
      reason: "I was doing something important",
    });
    const outcome: InterventionOutcome = "continued_usage";

    const result = processFeedback(
      makeIntervention(),
      feedback,
      outcome,
      makeEpisode(),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(result.updatedIntervention.feedback).toBe(feedback);
  });

  it("stores the outcome on the intervention", () => {
    const outcome: InterventionOutcome = "reduced_usage";

    const result = processFeedback(
      makeIntervention(),
      makeFeedback(),
      outcome,
      makeEpisode(),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(result.updatedIntervention.outcome).toBe("reduced_usage");
  });

  it("triggers weight update when context was corrected to a different value", () => {
    const episode = makeEpisode({ classifiedContext: "boredom_habit" });
    const feedback = makeFeedback({
      contextCorrect: false,
      correctedContext: "work_break",
    });
    const weights = makeClassifierWeights();
    const recentEpisodes = [makeEpisode({ id: "ep-prev" })];

    processFeedback(
      makeIntervention(),
      feedback,
      "stopped_usage",
      episode,
      recentEpisodes,
      weights,
      makeAdaptationState(),
    );

    expect(mockedExtractFeatures).toHaveBeenCalledWith(
      episode,
      recentEpisodes,
    );
    expect(mockedUpdateWeightsFromFeedback).toHaveBeenCalledWith(
      weights,
      expect.any(Object),
      "boredom_habit",
      "work_break",
    );
  });

  it("does NOT trigger weight update when contextCorrect is true", () => {
    const feedback = makeFeedback({ contextCorrect: true });

    processFeedback(
      makeIntervention(),
      feedback,
      "stopped_usage",
      makeEpisode(),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(mockedUpdateWeightsFromFeedback).not.toHaveBeenCalled();
  });

  it("does NOT trigger weight update when contextCorrect is false but correctedContext matches classifiedContext", () => {
    const episode = makeEpisode({ classifiedContext: "boredom_habit" });
    const feedback = makeFeedback({
      contextCorrect: false,
      correctedContext: "boredom_habit", // same as classified
    });

    processFeedback(
      makeIntervention(),
      feedback,
      "stopped_usage",
      episode,
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(mockedUpdateWeightsFromFeedback).not.toHaveBeenCalled();
  });

  it("does NOT trigger weight update when contextCorrect is false but correctedContext is undefined", () => {
    const feedback = makeFeedback({
      contextCorrect: false,
      correctedContext: undefined,
    });

    processFeedback(
      makeIntervention(),
      feedback,
      "stopped_usage",
      makeEpisode(),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(mockedUpdateWeightsFromFeedback).not.toHaveBeenCalled();
  });

  it("returns updated classifier weights from updateWeightsFromFeedback", () => {
    const feedback = makeFeedback({
      contextCorrect: false,
      correctedContext: "anxiety_check",
    });
    const episode = makeEpisode({ classifiedContext: "boredom_habit" });

    const result = processFeedback(
      makeIntervention(),
      feedback,
      "stopped_usage",
      episode,
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    // Should return the value from the mocked updateWeightsFromFeedback
    expect(result.updatedClassifierWeights).toEqual({
      adjustments: { boredom_habit: { social_media: 0.05 } },
      correctionCount: 1,
    });
  });

  it("returns original classifier weights when no correction is needed", () => {
    const weights = makeClassifierWeights({
      adjustments: { boredom_habit: { social_media: 0.1 } },
      correctionCount: 5,
    });
    const feedback = makeFeedback({ contextCorrect: true });

    const result = processFeedback(
      makeIntervention(),
      feedback,
      "stopped_usage",
      makeEpisode(),
      [],
      weights,
      makeAdaptationState(),
    );

    expect(result.updatedClassifierWeights).toBe(weights);
  });

  it("calls updateAdaptation with positive outcome when feedback is helpful", () => {
    const adaptationState = makeAdaptationState();
    const episode = makeEpisode({ classifiedContext: "boredom_habit" });
    const intervention = makeIntervention({ level: "awareness_nudge" });

    processFeedback(
      intervention,
      makeFeedback({ helpful: true }),
      "continued_usage",
      episode,
      [],
      makeClassifierWeights(),
      adaptationState,
    );

    expect(mockedUpdateAdaptation).toHaveBeenCalledWith(
      adaptationState,
      "boredom_habit",
      "awareness_nudge",
      true, // helpful = true -> positive
    );
  });

  it("calls updateAdaptation with positive outcome for stopped_usage even if unhelpful", () => {
    const adaptationState = makeAdaptationState();
    const episode = makeEpisode({ classifiedContext: "anxiety_check" });
    const intervention = makeIntervention({ level: "reflection_prompt" });

    processFeedback(
      intervention,
      makeFeedback({ helpful: false }),
      "stopped_usage",
      episode,
      [],
      makeClassifierWeights(),
      adaptationState,
    );

    expect(mockedUpdateAdaptation).toHaveBeenCalledWith(
      adaptationState,
      "anxiety_check",
      "reflection_prompt",
      true, // stopped_usage -> positive regardless of helpful
    );
  });

  it("calls updateAdaptation with positive outcome for reduced_usage even if unhelpful", () => {
    processFeedback(
      makeIntervention({ level: "friction_delay" }),
      makeFeedback({ helpful: false }),
      "reduced_usage",
      makeEpisode({ classifiedContext: "boredom_habit" }),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(mockedUpdateAdaptation).toHaveBeenCalledWith(
      expect.anything(),
      "boredom_habit",
      "friction_delay",
      true, // reduced_usage -> positive
    );
  });

  it("calls updateAdaptation with negative outcome for continued_usage + unhelpful", () => {
    processFeedback(
      makeIntervention({ level: "awareness_nudge" }),
      makeFeedback({ helpful: false }),
      "continued_usage",
      makeEpisode({ classifiedContext: "boredom_habit" }),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(mockedUpdateAdaptation).toHaveBeenCalledWith(
      expect.anything(),
      "boredom_habit",
      "awareness_nudge",
      false, // continued_usage + unhelpful -> negative
    );
  });

  it("calls updateAdaptation with negative outcome for increased_usage + unhelpful", () => {
    processFeedback(
      makeIntervention({ level: "soft_lock" }),
      makeFeedback({ helpful: false }),
      "increased_usage",
      makeEpisode({ classifiedContext: "anxiety_check" }),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(mockedUpdateAdaptation).toHaveBeenCalledWith(
      expect.anything(),
      "anxiety_check",
      "soft_lock",
      false, // increased_usage + unhelpful -> negative
    );
  });

  it("returns the updated adaptation state from updateAdaptation", () => {
    const result = processFeedback(
      makeIntervention(),
      makeFeedback(),
      "stopped_usage",
      makeEpisode(),
      [],
      makeClassifierWeights(),
      makeAdaptationState(),
    );

    expect(result.updatedAdaptationState).toEqual(
      mockedUpdateAdaptation.mock.results[0].value,
    );
  });
});

// ── generateFeedbackPrompt ───────────────────────────────────────────────────

describe("generateFeedbackPrompt", () => {
  it("returns the correct question text", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "boredom_habit");

    expect(prompt.question).toBe("Was this nudge helpful?");
  });

  it("includes the display name for boredom_habit in contextLabel", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "boredom_habit");

    expect(prompt.contextLabel).toBe(
      "We thought this was: Habit/boredom pickup",
    );
  });

  it("includes the display name for intentional_task in contextLabel", () => {
    const prompt = generateFeedbackPrompt(
      makeIntervention(),
      "intentional_task",
    );

    expect(prompt.contextLabel).toBe(
      "We thought this was: Doing something specific",
    );
  });

  it("includes the display name for work_break in contextLabel", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "work_break");

    expect(prompt.contextLabel).toBe("We thought this was: Taking a break");
  });

  it("includes the display name for social_response in contextLabel", () => {
    const prompt = generateFeedbackPrompt(
      makeIntervention(),
      "social_response",
    );

    expect(prompt.contextLabel).toBe(
      "We thought this was: Responding to someone",
    );
  });

  it("includes the display name for anxiety_check in contextLabel", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "anxiety_check");

    expect(prompt.contextLabel).toBe("We thought this was: Anxiety check");
  });

  it("includes the display name for transition_moment in contextLabel", () => {
    const prompt = generateFeedbackPrompt(
      makeIntervention(),
      "transition_moment",
    );

    expect(prompt.contextLabel).toBe(
      "We thought this was: Between activities",
    );
  });

  it("includes the display name for unknown in contextLabel", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "unknown");

    expect(prompt.contextLabel).toBe("We thought this was: Unknown");
  });

  it("returns exactly 6 context options", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "boredom_habit");

    expect(prompt.contextOptions).toHaveLength(6);
  });

  it("context options contain all expected UsageContext values", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "boredom_habit");

    const values = prompt.contextOptions.map((opt) => opt.value);
    expect(values).toContain("intentional_task");
    expect(values).toContain("work_break");
    expect(values).toContain("social_response");
    expect(values).toContain("boredom_habit");
    expect(values).toContain("anxiety_check");
    expect(values).toContain("transition_moment");
  });

  it("each context option has a non-empty label", () => {
    const prompt = generateFeedbackPrompt(makeIntervention(), "boredom_habit");

    for (const option of prompt.contextOptions) {
      expect(option.label).toBeTruthy();
      expect(typeof option.label).toBe("string");
    }
  });
});

// ── computeAdaptationMetrics ─────────────────────────────────────────────────

describe("computeAdaptationMetrics", () => {
  it("returns all zeros and 'learning' phase for empty history", () => {
    const metrics = computeAdaptationMetrics([]);

    expect(metrics).toEqual({
      totalFeedback: 0,
      helpfulRate: 0,
      contextCorrectionRate: 0,
      outcomeImprovement: 0,
      adaptationPhase: "learning",
    });
  });

  it("computes high helpfulRate when all feedback is helpful", () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      feedback: makeFeedback({ helpful: true }),
      outcome: "stopped_usage" as InterventionOutcome,
      timestamp: `2026-03-24T10:0${i}:00.000Z`,
    }));

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.totalFeedback).toBe(5);
    expect(metrics.helpfulRate).toBe(1);
  });

  it("computes zero helpfulRate when no feedback is helpful", () => {
    const history = Array.from({ length: 4 }, (_, i) => ({
      feedback: makeFeedback({ helpful: false }),
      outcome: "continued_usage" as InterventionOutcome,
      timestamp: `2026-03-24T10:0${i}:00.000Z`,
    }));

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.helpfulRate).toBe(0);
  });

  it("computes correct helpfulRate for mixed feedback", () => {
    const history = [
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "continued_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:01:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:02:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "continued_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:03:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.helpfulRate).toBe(0.5);
  });

  it("counts context corrections correctly", () => {
    const history = [
      {
        feedback: makeFeedback({ contextCorrect: false }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
      {
        feedback: makeFeedback({ contextCorrect: true }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:01:00.000Z",
      },
      {
        feedback: makeFeedback({ contextCorrect: false }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:02:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.contextCorrectionRate).toBeCloseTo(2 / 3);
  });

  it("computes positive outcomeImprovement when second half is better", () => {
    // First half: all negative outcomes (continued_usage + unhelpful)
    // Second half: all positive outcomes (stopped_usage + helpful)
    const history = [
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "continued_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "increased_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:01:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:02:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "reduced_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:03:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    // First half (index 0,1): 0 positive out of 2 -> 0
    // Second half (index 2,3): 2 positive out of 2 -> 1.0
    // Improvement: 1.0 - 0.0 = 1.0
    expect(metrics.outcomeImprovement).toBe(1);
  });

  it("computes negative outcomeImprovement when second half is worse", () => {
    const history = [
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:01:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "continued_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:02:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "increased_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:03:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    // First half: 1.0, Second half: 0.0 -> -1.0
    expect(metrics.outcomeImprovement).toBe(-1);
  });

  it("returns 'learning' phase when totalFeedback < 10", () => {
    const history = Array.from({ length: 9 }, (_, i) => ({
      feedback: makeFeedback({ helpful: true }),
      outcome: "stopped_usage" as InterventionOutcome,
      timestamp: `2026-03-24T10:0${i}:00.000Z`,
    }));

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.adaptationPhase).toBe("learning");
  });

  it("returns 'adapting' phase when corrections > 20% and totalFeedback >= 10", () => {
    // 10 items total, 3 with contextCorrect=false -> 30% > 20%
    const history = Array.from({ length: 10 }, (_, i) => ({
      feedback: makeFeedback({
        helpful: true,
        contextCorrect: i < 3 ? false : true,
      }),
      outcome: "stopped_usage" as InterventionOutcome,
      timestamp: `2026-03-24T10:${String(i).padStart(2, "0")}:00.000Z`,
    }));

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.adaptationPhase).toBe("adapting");
  });

  it("returns 'stable' phase when corrections <= 20% and totalFeedback >= 10", () => {
    // 10 items total, 2 with contextCorrect=false -> 20%, not > 20%
    const history = Array.from({ length: 10 }, (_, i) => ({
      feedback: makeFeedback({
        helpful: true,
        contextCorrect: i < 2 ? false : true,
      }),
      outcome: "stopped_usage" as InterventionOutcome,
      timestamp: `2026-03-24T10:${String(i).padStart(2, "0")}:00.000Z`,
    }));

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.adaptationPhase).toBe("stable");
  });

  it("handles single feedback item correctly", () => {
    const history = [
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    expect(metrics.totalFeedback).toBe(1);
    expect(metrics.helpfulRate).toBe(1);
    expect(metrics.adaptationPhase).toBe("learning");
    // mid = floor(1/2) = 0, firstHalf empty, secondHalf = [all]
    // firstHalfPositiveRate = 0, secondHalfPositiveRate = 1
    expect(metrics.outcomeImprovement).toBe(1);
  });

  it("isPositiveOutcome: stopped_usage is positive even when unhelpful", () => {
    const history = [
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "stopped_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "continued_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:01:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    // mid = floor(2/2) = 1
    // firstHalf [0]: stopped_usage (positive despite unhelpful) -> 1/1
    // secondHalf [1]: continued_usage + unhelpful -> 0/1
    expect(metrics.outcomeImprovement).toBe(-1);
    // Both unhelpful but one has stopped_usage outcome
    // helpfulRate = 0, but positive outcome rate should differ
  });

  it("isPositiveOutcome: reduced_usage is positive even when unhelpful", () => {
    const history = [
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "reduced_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "continued_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:01:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    // firstHalf [0]: reduced_usage -> positive -> 1/1 = 1
    // secondHalf [1]: continued_usage + unhelpful -> 0/1 = 0
    expect(metrics.outcomeImprovement).toBe(-1);
  });

  it("isPositiveOutcome: helpful=true makes any outcome positive", () => {
    const history = [
      {
        feedback: makeFeedback({ helpful: false }),
        outcome: "increased_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:00:00.000Z",
      },
      {
        feedback: makeFeedback({ helpful: true }),
        outcome: "increased_usage" as InterventionOutcome,
        timestamp: "2026-03-24T10:01:00.000Z",
      },
    ];

    const metrics = computeAdaptationMetrics(history);

    // firstHalf [0]: increased_usage + unhelpful -> negative -> 0/1 = 0
    // secondHalf [1]: increased_usage + helpful -> positive -> 1/1 = 1
    expect(metrics.outcomeImprovement).toBe(1);
  });

  it("isPositiveOutcome: continued_usage + unhelpful = negative", () => {
    const history = Array.from({ length: 4 }, (_, i) => ({
      feedback: makeFeedback({ helpful: false }),
      outcome: "continued_usage" as InterventionOutcome,
      timestamp: `2026-03-24T10:0${i}:00.000Z`,
    }));

    const metrics = computeAdaptationMetrics(history);

    // All negative -> improvement = 0 - 0 = 0
    expect(metrics.outcomeImprovement).toBe(0);
  });
});

// ── generateAdaptationSummary ────────────────────────────────────────────────

describe("generateAdaptationSummary", () => {
  it("returns default message when totalFeedback is 0", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 0,
      helpfulRate: 0,
      contextCorrectionRate: 0,
      outcomeImprovement: 0,
      adaptationPhase: "learning",
    });

    expect(summary).toBe(
      "Your feedback helps the system learn when to nudge you. Tap 'helpful' or 'not helpful' after each intervention.",
    );
  });

  it("returns learning message with feedback count", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 7,
      helpfulRate: 0.5,
      contextCorrectionRate: 0.1,
      outcomeImprovement: 0,
      adaptationPhase: "learning",
    });

    expect(summary).toContain("Still learning your patterns");
    expect(summary).toContain("7 feedback points");
  });

  it("returns adapting message with correction percentage", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 15,
      helpfulRate: 0.6,
      contextCorrectionRate: 0.3,
      outcomeImprovement: 0.05,
      adaptationPhase: "adapting",
    });

    expect(summary).toContain("Actively adapting");
    expect(summary).toContain("30%");
    expect(summary).toContain("corrected");
  });

  it("returns stable message with helpful percentage", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 20,
      helpfulRate: 0.85,
      contextCorrectionRate: 0.1,
      outcomeImprovement: 0.05,
      adaptationPhase: "stable",
    });

    expect(summary).toContain("well-calibrated");
    expect(summary).toContain("85%");
    expect(summary).toContain("helpful");
  });

  it("appends improvement message when outcomeImprovement > 10%", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 20,
      helpfulRate: 0.8,
      contextCorrectionRate: 0.1,
      outcomeImprovement: 0.25,
      adaptationPhase: "stable",
    });

    expect(summary).toContain("improved by 25%");
    expect(summary).toContain("learning from your feedback");
  });

  it("does NOT append improvement message when outcomeImprovement <= 10%", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 20,
      helpfulRate: 0.8,
      contextCorrectionRate: 0.1,
      outcomeImprovement: 0.1,
      adaptationPhase: "stable",
    });

    expect(summary).not.toContain("improved by");
  });

  it("does NOT append improvement message when outcomeImprovement is exactly 0.1", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 20,
      helpfulRate: 0.8,
      contextCorrectionRate: 0.1,
      outcomeImprovement: 0.1,
      adaptationPhase: "stable",
    });

    expect(summary).not.toContain("Intervention effectiveness");
  });

  it("appends improvement message to learning phase summary", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 5,
      helpfulRate: 0.8,
      contextCorrectionRate: 0,
      outcomeImprovement: 0.5,
      adaptationPhase: "learning",
    });

    expect(summary).toContain("Still learning your patterns");
    expect(summary).toContain("improved by 50%");
  });

  it("appends improvement message to adapting phase summary", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 15,
      helpfulRate: 0.6,
      contextCorrectionRate: 0.3,
      outcomeImprovement: 0.2,
      adaptationPhase: "adapting",
    });

    expect(summary).toContain("Actively adapting");
    expect(summary).toContain("improved by 20%");
  });

  it("formats correction percentage as integer", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 15,
      helpfulRate: 0.6,
      contextCorrectionRate: 0.333,
      outcomeImprovement: 0,
      adaptationPhase: "adapting",
    });

    // 33.3% should be displayed as "33%" (toFixed(0))
    expect(summary).toContain("33%");
  });

  it("formats helpful percentage as integer", () => {
    const summary = generateAdaptationSummary({
      totalFeedback: 20,
      helpfulRate: 0.667,
      contextCorrectionRate: 0.1,
      outcomeImprovement: 0,
      adaptationPhase: "stable",
    });

    // 66.7% should be displayed as "67%" (toFixed(0))
    expect(summary).toContain("67%");
  });
});
