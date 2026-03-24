import {
  selectIntervention,
  initializeAdaptation,
  updateAdaptation,
  getArmEstimates,
} from "../../../jitai/interventionEngine";
import type {
  AdaptationState,
  UsagePattern,
  UsageContext,
  InterventionLevel,
  BanditArm,
} from "../../../jitai/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a default UsagePattern with overridable fields. */
const makePattern = (overrides: Partial<UsagePattern> = {}): UsagePattern => ({
  windowStart: "2026-03-24T10:00:00Z",
  windowEnd: "2026-03-24T11:00:00Z",
  pickupCount: 5,
  totalScreenTime: 600,
  avgEpisodeDuration: 120,
  dominantCategory: "social_media",
  pickupFrequency: 5,
  compulsivenessScore: 0.4,
  hourlyDistribution: new Array(24).fill(0),
  ...overrides,
});

/** Creates a minimal AdaptationState with overridable fields. */
const makeAdaptation = (
  overrides: Partial<AdaptationState> = {},
): AdaptationState => ({
  arms: [],
  suppressedContexts: [],
  quietHours: [],
  totalInterventions: 0,
  totalFeedback: 0,
  lastUpdated: "2026-03-24T10:00:00Z",
  ...overrides,
});

/** Creates a BanditArm with overridable fields. */
const makeArm = (overrides: Partial<BanditArm> = {}): BanditArm => ({
  context: "boredom_habit",
  level: "awareness_nudge",
  alpha: 1,
  beta: 1,
  totalPulls: 0,
  ...overrides,
});

// ── selectIntervention ───────────────────────────────────────────────────────

describe("selectIntervention", () => {
  const realDateNow = Date.now;
  const realMathRandom = Math.random;

  beforeEach(() => {
    // Fix Date.now and new Date() to 2026-03-24T14:30:00Z (hour 14 UTC)
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T14:30:00Z"));
    // Deterministic Math.random: always returns 0.5
    Math.random = jest.fn(() => 0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    Math.random = realMathRandom;
  });

  it("returns null when context is suppressed", () => {
    const state = makeAdaptation({
      suppressedContexts: ["boredom_habit"],
    });
    const result = selectIntervention(
      "boredom_habit",
      makePattern(),
      state,
      "ep-1",
      false,
    );
    expect(result).toBeNull();
  });

  it("returns null during quiet hours", () => {
    const currentHour = new Date().getHours();
    const state = makeAdaptation({
      quietHours: [[currentHour, currentHour + 2]],
    });
    const result = selectIntervention(
      "boredom_habit",
      makePattern(),
      state,
      "ep-1",
      false,
    );
    expect(result).toBeNull();
  });

  it("returns null when hour matches any quiet window", () => {
    const currentHour = new Date().getHours();
    const state = makeAdaptation({
      quietHours: [
        [0, 3], // early morning window
        [currentHour, currentHour + 1], // window matching current time
      ],
    });
    const result = selectIntervention(
      "anxiety_check",
      makePattern(),
      state,
      "ep-2",
      false,
    );
    expect(result).toBeNull();
  });

  it("allows intervention outside quiet hours", () => {
    const currentHour = new Date().getHours();
    // Quiet window that does NOT contain the current hour
    const state = makeAdaptation({
      quietHours: [[currentHour + 3, currentHour + 5]],
    });
    const result = selectIntervention(
      "boredom_habit",
      makePattern(),
      state,
      "ep-3",
      false,
    );
    expect(result).not.toBeNull();
  });

  it("returns null for intentional_task outside focus session", () => {
    const result = selectIntervention(
      "intentional_task",
      makePattern(),
      makeAdaptation(),
      "ep-1",
      false,
    );
    expect(result).toBeNull();
  });

  it("returns null for work_break outside focus session", () => {
    const result = selectIntervention(
      "work_break",
      makePattern(),
      makeAdaptation(),
      "ep-1",
      false,
    );
    expect(result).toBeNull();
  });

  it("returns intervention for intentional_task during focus session", () => {
    const result = selectIntervention(
      "intentional_task",
      makePattern(),
      makeAdaptation(),
      "ep-1",
      true,
    );
    expect(result).not.toBeNull();
    expect(result!.level).toBeDefined();
  });

  it("returns intervention for work_break during focus session", () => {
    const result = selectIntervention(
      "work_break",
      makePattern(),
      makeAdaptation(),
      "ep-1",
      true,
    );
    expect(result).not.toBeNull();
  });

  it("returns intervention for boredom_habit outside focus session", () => {
    const result = selectIntervention(
      "boredom_habit",
      makePattern(),
      makeAdaptation(),
      "ep-1",
      false,
    );
    expect(result).not.toBeNull();
  });

  it("returns an intervention with correct structure", () => {
    const result = selectIntervention(
      "boredom_habit",
      makePattern({ pickupCount: 12, totalScreenTime: 1800 }),
      makeAdaptation(),
      "ep-42",
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.id).toMatch(/^int-/);
    expect(result!.timestamp).toBeDefined();
    expect(result!.triggeringEpisodeId).toBe("ep-42");
    expect(result!.acknowledged).toBe(false);
    expect(result!.feedback).toBeNull();
    expect(result!.outcome).toBeNull();
    expect(typeof result!.message).toBe("string");
    expect(result!.message.length).toBeGreaterThan(0);
  });
});

// ── Graduated Response ───────────────────────────────────────────────────────

describe("graduated response (no bandit arms)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T14:30:00Z"));
    Math.random = jest.fn(() => 0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    Math.random = jest.restoreAllMocks() as unknown as () => number;
  });

  const emptyAdaptation = makeAdaptation({ arms: [] });

  describe("in focus session", () => {
    it("returns soft_lock when compulsivenessScore > 0.6", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.8,
        pickupFrequency: 5,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        true,
      );
      expect(result!.level).toBe("soft_lock");
    });

    it("returns reflection_prompt when pickupFrequency > 8 and compulsiveness <= 0.6", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.5,
        pickupFrequency: 10,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        true,
      );
      expect(result!.level).toBe("reflection_prompt");
    });

    it("returns friction_delay when neither threshold met", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.3,
        pickupFrequency: 4,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        true,
      );
      expect(result!.level).toBe("friction_delay");
    });

    it("prioritizes compulsivenessScore over pickupFrequency", () => {
      // Both thresholds met; compulsiveness check comes first
      const pattern = makePattern({
        compulsivenessScore: 0.9,
        pickupFrequency: 15,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        true,
      );
      expect(result!.level).toBe("soft_lock");
    });
  });

  describe("not in focus session", () => {
    it("returns reflection_prompt when compulsivenessScore > 0.7", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.85,
        pickupFrequency: 3,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        false,
      );
      expect(result!.level).toBe("reflection_prompt");
    });

    it("returns usage_summary when pickupFrequency > 10 and compulsiveness <= 0.7", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.5,
        pickupFrequency: 12,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        false,
      );
      expect(result!.level).toBe("usage_summary");
    });

    it("returns friction_delay when pickupFrequency > 6 and <= 10", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.3,
        pickupFrequency: 8,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        false,
      );
      expect(result!.level).toBe("friction_delay");
    });

    it("returns awareness_nudge when pickupFrequency <= 6 and low compulsiveness", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.2,
        pickupFrequency: 4,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        false,
      );
      expect(result!.level).toBe("awareness_nudge");
    });

    it("returns awareness_nudge at boundary (pickupFrequency exactly 6)", () => {
      const pattern = makePattern({
        compulsivenessScore: 0.2,
        pickupFrequency: 6,
      });
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        emptyAdaptation,
        "ep-1",
        false,
      );
      expect(result!.level).toBe("awareness_nudge");
    });
  });
});

// ── Thompson Sampling ────────────────────────────────────────────────────────

describe("Thompson Sampling selection", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T14:30:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    Math.random = jest.fn(() => 0.5);
  });

  it("selects the arm with highest sampled value", () => {
    // Arm with very high alpha should usually win
    const strongArm = makeArm({
      context: "boredom_habit",
      level: "friction_delay",
      alpha: 100,
      beta: 1,
      totalPulls: 100,
    });
    const weakArm = makeArm({
      context: "boredom_habit",
      level: "awareness_nudge",
      alpha: 1,
      beta: 100,
      totalPulls: 100,
    });

    const state = makeAdaptation({ arms: [strongArm, weakArm] });
    const pattern = makePattern({ compulsivenessScore: 0.5 });

    // Run multiple times to account for stochastic sampling
    const results: InterventionLevel[] = [];
    for (let i = 0; i < 20; i++) {
      // Restore real Math.random for proper sampling
      Math.random = jest.fn(() => Math.abs(Math.sin(i * 7 + 1)) * 0.99 + 0.005);
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        state,
        "ep-1",
        false,
      );
      if (result) results.push(result.level);
    }

    // The strong arm (friction_delay) should dominate
    const frictionCount = results.filter((l) => l === "friction_delay").length;
    expect(frictionCount).toBeGreaterThan(results.length / 2);
  });

  it("falls back to graduated response when compulsivenessScore < 0.3 and selected arm is highly intrusive", () => {
    // Set up arms where the best-performing arm is "soft_lock" (index > 2 in INTRUSIVENESS_ORDER)
    const intrusiveArm = makeArm({
      context: "boredom_habit",
      level: "soft_lock",
      alpha: 100,
      beta: 1,
      totalPulls: 100,
    });
    const mildArm = makeArm({
      context: "boredom_habit",
      level: "awareness_nudge",
      alpha: 1,
      beta: 50,
      totalPulls: 50,
    });

    const state = makeAdaptation({ arms: [intrusiveArm, mildArm] });
    // Low compulsiveness should trigger the constraint
    const pattern = makePattern({
      compulsivenessScore: 0.2,
      pickupFrequency: 4,
    });

    // With low compulsiveness, even if soft_lock wins sampling,
    // it should fall back to graduated response
    const results: InterventionLevel[] = [];
    for (let i = 0; i < 20; i++) {
      Math.random = jest.fn(() => Math.abs(Math.sin(i * 13 + 3)) * 0.99 + 0.005);
      const result = selectIntervention(
        "boredom_habit",
        pattern,
        state,
        "ep-1",
        false,
      );
      if (result) results.push(result.level);
    }

    // Should never get soft_lock or full_lock with low compulsiveness
    // (graduated response for not-in-focus with these stats => awareness_nudge)
    const highIntrusionCount = results.filter(
      (l) => l === "soft_lock" || l === "full_lock",
    ).length;
    expect(highIntrusionCount).toBe(0);
  });
});

// ── initializeAdaptation ─────────────────────────────────────────────────────

describe("initializeAdaptation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T14:30:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates exactly 16 arms (4 contexts x 4 levels)", () => {
    const state = initializeAdaptation();
    expect(state.arms).toHaveLength(16);
  });

  it("uses the correct 4 contexts", () => {
    const state = initializeAdaptation();
    const contexts = [...new Set(state.arms.map((a) => a.context))];
    expect(contexts).toHaveLength(4);
    expect(contexts).toContain("boredom_habit");
    expect(contexts).toContain("anxiety_check");
    expect(contexts).toContain("transition_moment");
    expect(contexts).toContain("social_response");
  });

  it("uses the correct 4 levels", () => {
    const state = initializeAdaptation();
    const levels = [...new Set(state.arms.map((a) => a.level))];
    expect(levels).toHaveLength(4);
    expect(levels).toContain("awareness_nudge");
    expect(levels).toContain("friction_delay");
    expect(levels).toContain("reflection_prompt");
    expect(levels).toContain("soft_lock");
  });

  it("does not include intentional_task, work_break, or unknown contexts", () => {
    const state = initializeAdaptation();
    const contexts = state.arms.map((a) => a.context);
    expect(contexts).not.toContain("intentional_task");
    expect(contexts).not.toContain("work_break");
    expect(contexts).not.toContain("unknown");
  });

  it("does not include usage_summary or full_lock levels", () => {
    const state = initializeAdaptation();
    const levels = state.arms.map((a) => a.level);
    expect(levels).not.toContain("usage_summary");
    expect(levels).not.toContain("full_lock");
  });

  it("all arms have uniform prior Beta(1,1)", () => {
    const state = initializeAdaptation();
    for (const arm of state.arms) {
      expect(arm.alpha).toBe(1);
      expect(arm.beta).toBe(1);
    }
  });

  it("all arms start with totalPulls = 0", () => {
    const state = initializeAdaptation();
    for (const arm of state.arms) {
      expect(arm.totalPulls).toBe(0);
    }
  });

  it("starts with empty suppressedContexts and quietHours", () => {
    const state = initializeAdaptation();
    expect(state.suppressedContexts).toEqual([]);
    expect(state.quietHours).toEqual([]);
  });

  it("starts with zero counters", () => {
    const state = initializeAdaptation();
    expect(state.totalInterventions).toBe(0);
    expect(state.totalFeedback).toBe(0);
  });

  it("sets lastUpdated to current time", () => {
    const state = initializeAdaptation();
    expect(state.lastUpdated).toBe("2026-03-24T14:30:00.000Z");
  });

  it("each (context, level) pair is unique", () => {
    const state = initializeAdaptation();
    const keys = state.arms.map((a) => `${a.context}:${a.level}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(16);
  });
});

// ── updateAdaptation ─────────────────────────────────────────────────────────

describe("updateAdaptation", () => {
  let baseState: AdaptationState;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T15:00:00Z"));
    baseState = initializeAdaptation();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("increments alpha on success", () => {
    const updated = updateAdaptation(
      baseState,
      "boredom_habit",
      "friction_delay",
      true,
    );
    const arm = updated.arms.find(
      (a) => a.context === "boredom_habit" && a.level === "friction_delay",
    );
    expect(arm!.alpha).toBe(2); // 1 + 1
    expect(arm!.beta).toBe(1); // unchanged
  });

  it("increments beta on failure", () => {
    const updated = updateAdaptation(
      baseState,
      "boredom_habit",
      "friction_delay",
      false,
    );
    const arm = updated.arms.find(
      (a) => a.context === "boredom_habit" && a.level === "friction_delay",
    );
    expect(arm!.alpha).toBe(1); // unchanged
    expect(arm!.beta).toBe(2); // 1 + 1
  });

  it("increments totalPulls regardless of outcome", () => {
    const afterSuccess = updateAdaptation(
      baseState,
      "boredom_habit",
      "friction_delay",
      true,
    );
    const afterFailure = updateAdaptation(
      baseState,
      "boredom_habit",
      "friction_delay",
      false,
    );

    const successArm = afterSuccess.arms.find(
      (a) => a.context === "boredom_habit" && a.level === "friction_delay",
    );
    const failureArm = afterFailure.arms.find(
      (a) => a.context === "boredom_habit" && a.level === "friction_delay",
    );

    expect(successArm!.totalPulls).toBe(1);
    expect(failureArm!.totalPulls).toBe(1);
  });

  it("increments totalInterventions and totalFeedback", () => {
    const updated = updateAdaptation(
      baseState,
      "anxiety_check",
      "awareness_nudge",
      true,
    );
    expect(updated.totalInterventions).toBe(1);
    expect(updated.totalFeedback).toBe(1);
  });

  it("updates lastUpdated timestamp", () => {
    jest.setSystemTime(new Date("2026-03-24T16:00:00Z"));
    const updated = updateAdaptation(
      baseState,
      "boredom_habit",
      "friction_delay",
      true,
    );
    expect(updated.lastUpdated).toBe("2026-03-24T16:00:00.000Z");
  });

  it("does not mutate original state", () => {
    const originalArms = baseState.arms.map((a) => ({ ...a }));
    updateAdaptation(baseState, "boredom_habit", "friction_delay", true);

    // Original state should be unchanged
    expect(baseState.arms).toEqual(originalArms);
    expect(baseState.totalInterventions).toBe(0);
    expect(baseState.totalFeedback).toBe(0);
  });

  it("only updates the matching arm, leaves others untouched", () => {
    const updated = updateAdaptation(
      baseState,
      "boredom_habit",
      "friction_delay",
      true,
    );
    const otherArms = updated.arms.filter(
      (a) =>
        !(a.context === "boredom_habit" && a.level === "friction_delay"),
    );
    for (const arm of otherArms) {
      expect(arm.alpha).toBe(1);
      expect(arm.beta).toBe(1);
      expect(arm.totalPulls).toBe(0);
    }
  });

  it("accumulates multiple updates correctly", () => {
    let state = baseState;
    // 3 successes and 2 failures
    state = updateAdaptation(state, "boredom_habit", "soft_lock", true);
    state = updateAdaptation(state, "boredom_habit", "soft_lock", true);
    state = updateAdaptation(state, "boredom_habit", "soft_lock", true);
    state = updateAdaptation(state, "boredom_habit", "soft_lock", false);
    state = updateAdaptation(state, "boredom_habit", "soft_lock", false);

    const arm = state.arms.find(
      (a) => a.context === "boredom_habit" && a.level === "soft_lock",
    );
    expect(arm!.alpha).toBe(4); // 1 + 3
    expect(arm!.beta).toBe(3); // 1 + 2
    expect(arm!.totalPulls).toBe(5);
    expect(state.totalInterventions).toBe(5);
    expect(state.totalFeedback).toBe(5);
  });
});

// ── getArmEstimates ──────────────────────────────────────────────────────────

describe("getArmEstimates", () => {
  it("returns correct estimatedSuccessRate for uniform prior", () => {
    const state = initializeAdaptation();
    const estimates = getArmEstimates(state);

    // Beta(1,1) => 1/(1+1) = 0.5
    for (const est of estimates) {
      expect(est.estimatedSuccessRate).toBe(0.5);
    }
  });

  it("returns correct estimatedSuccessRate after updates", () => {
    let state = initializeAdaptation();
    // 9 successes: alpha goes from 1 to 10
    for (let i = 0; i < 9; i++) {
      state = updateAdaptation(state, "boredom_habit", "friction_delay", true);
    }
    // 1 failure: beta goes from 1 to 2
    state = updateAdaptation(state, "boredom_habit", "friction_delay", false);

    const estimates = getArmEstimates(state);
    const target = estimates.find(
      (e) => e.context === "boredom_habit" && e.level === "friction_delay",
    );

    // alpha=10, beta=2 => 10/12 = 0.8333...
    expect(target!.estimatedSuccessRate).toBeCloseTo(10 / 12, 10);
    expect(target!.totalPulls).toBe(10);
  });

  it("returns confidence = 0 when totalPulls = 0", () => {
    const state = initializeAdaptation();
    const estimates = getArmEstimates(state);

    // confidence = 1 - 1/sqrt(0+1) = 1 - 1 = 0
    for (const est of estimates) {
      expect(est.confidence).toBe(0);
    }
  });

  it("returns increasing confidence as totalPulls grow", () => {
    let state = initializeAdaptation();
    const ctx: UsageContext = "anxiety_check";
    const lvl: InterventionLevel = "awareness_nudge";

    const confidences: number[] = [];
    for (let i = 0; i < 10; i++) {
      const estimates = getArmEstimates(state);
      const est = estimates.find(
        (e) => e.context === ctx && e.level === lvl,
      );
      confidences.push(est!.confidence);
      state = updateAdaptation(state, ctx, lvl, true);
    }

    // Each confidence should be >= the previous
    for (let i = 1; i < confidences.length; i++) {
      expect(confidences[i]).toBeGreaterThanOrEqual(confidences[i - 1]);
    }
  });

  it("computes confidence correctly: 1 - 1/sqrt(totalPulls + 1)", () => {
    let state = initializeAdaptation();
    // 3 updates
    state = updateAdaptation(state, "social_response", "reflection_prompt", true);
    state = updateAdaptation(state, "social_response", "reflection_prompt", false);
    state = updateAdaptation(state, "social_response", "reflection_prompt", true);

    const estimates = getArmEstimates(state);
    const est = estimates.find(
      (e) =>
        e.context === "social_response" && e.level === "reflection_prompt",
    );

    // totalPulls = 3 => confidence = 1 - 1/sqrt(4) = 1 - 0.5 = 0.5
    expect(est!.confidence).toBeCloseTo(0.5, 10);
  });

  it("returns 16 estimates for freshly initialized state", () => {
    const state = initializeAdaptation();
    const estimates = getArmEstimates(state);
    expect(estimates).toHaveLength(16);
  });

  it("preserves context and level in returned estimates", () => {
    const state = initializeAdaptation();
    const estimates = getArmEstimates(state);
    const keys = estimates.map((e) => `${e.context}:${e.level}`);
    const armKeys = state.arms.map((a) => `${a.context}:${a.level}`);
    expect(keys).toEqual(armKeys);
  });

  it("handles custom state with non-default arm values", () => {
    const state = makeAdaptation({
      arms: [
        makeArm({ context: "boredom_habit", level: "soft_lock", alpha: 20, beta: 5, totalPulls: 23 }),
      ],
    });
    const estimates = getArmEstimates(state);
    expect(estimates).toHaveLength(1);
    // 20 / 25 = 0.8
    expect(estimates[0].estimatedSuccessRate).toBeCloseTo(0.8, 10);
    // 1 - 1/sqrt(24) ~ 0.7959...
    expect(estimates[0].confidence).toBeCloseTo(1 - 1 / Math.sqrt(24), 10);
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T14:30:00Z"));
    Math.random = jest.fn(() => 0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("falls back to graduated response when no arms match the context", () => {
    // Arms exist but for a different context
    const state = makeAdaptation({
      arms: [
        makeArm({ context: "anxiety_check", level: "friction_delay", alpha: 50, beta: 1 }),
      ],
    });
    const pattern = makePattern({ compulsivenessScore: 0.2, pickupFrequency: 4 });

    // boredom_habit has no arms, should get graduated response
    const result = selectIntervention(
      "boredom_habit",
      pattern,
      state,
      "ep-1",
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.level).toBe("awareness_nudge");
  });

  it("applies compulsivenessScore < 0.3 constraint to Thompson Sampling", () => {
    // Only one arm for this context, and it's highly intrusive
    const state = makeAdaptation({
      arms: [
        makeArm({
          context: "transition_moment",
          level: "full_lock",
          alpha: 100,
          beta: 1,
          totalPulls: 100,
        }),
      ],
    });
    // Low compulsiveness should trigger constraint fallback
    const pattern = makePattern({
      compulsivenessScore: 0.1,
      pickupFrequency: 3,
    });

    const result = selectIntervention(
      "transition_moment",
      pattern,
      state,
      "ep-1",
      false,
    );
    expect(result).not.toBeNull();
    // full_lock is index 5, > 2, so with compulsiveness < 0.3 it falls back
    // graduated response for not-in-focus, low freq => awareness_nudge
    expect(result!.level).toBe("awareness_nudge");
  });

  it("does not apply compulsiveness constraint when score >= 0.3", () => {
    const state = makeAdaptation({
      arms: [
        makeArm({
          context: "boredom_habit",
          level: "soft_lock",
          alpha: 100,
          beta: 1,
          totalPulls: 100,
        }),
      ],
    });
    const pattern = makePattern({ compulsivenessScore: 0.5 });

    // Should use the bandit's choice (soft_lock) directly
    const result = selectIntervention(
      "boredom_habit",
      pattern,
      state,
      "ep-1",
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.level).toBe("soft_lock");
  });

  it("handles getArmEstimates with empty arms array", () => {
    const state = makeAdaptation({ arms: [] });
    const estimates = getArmEstimates(state);
    expect(estimates).toEqual([]);
  });

  it("intervention message includes pickup count for awareness_nudge", () => {
    const pattern = makePattern({
      pickupCount: 15,
      totalScreenTime: 1200,
      compulsivenessScore: 0.2,
      pickupFrequency: 4,
    });
    const result = selectIntervention(
      "boredom_habit",
      pattern,
      makeAdaptation(),
      "ep-1",
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.level).toBe("awareness_nudge");
    expect(result!.message).toContain("15");
    expect(result!.message).toContain("20"); // 1200/60 = 20 minutes
  });

  it("suppressed context takes precedence over all other logic", () => {
    const state = makeAdaptation({
      suppressedContexts: ["boredom_habit"],
      arms: [
        makeArm({
          context: "boredom_habit",
          level: "full_lock",
          alpha: 1000,
          beta: 1,
        }),
      ],
    });
    const pattern = makePattern({ compulsivenessScore: 1.0, pickupFrequency: 100 });

    const result = selectIntervention(
      "boredom_habit",
      pattern,
      state,
      "ep-1",
      true,
    );
    expect(result).toBeNull();
  });

  it("quiet hours take precedence over focus session", () => {
    const currentHour = new Date().getHours();
    const state = makeAdaptation({
      quietHours: [[currentHour, currentHour + 1]],
    });
    const pattern = makePattern({ compulsivenessScore: 1.0 });

    const result = selectIntervention(
      "boredom_habit",
      pattern,
      state,
      "ep-1",
      true,
    );
    expect(result).toBeNull();
  });
});
