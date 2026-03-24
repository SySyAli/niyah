import type { UsageEpisode, UsagePattern, AppCategory } from "../../../jitai/types";
import {
  simulateUsageEpisode,
  simulateDayHistory,
  analyzeUsagePattern,
  detectAnomalousUsage,
  computeDailySummary,
} from "../../../jitai/usageDetector";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create an ISO timestamp string for a specific LOCAL hour on 2025-06-15.
 * This avoids timezone issues since the source code uses getHours() which
 * returns local time.
 */
function localIso(hour: number, minute = 0, second = 0): string {
  const d = new Date(2025, 5, 15, hour, minute, second, 0); // months are 0-indexed
  return d.toISOString();
}

/** Build a deterministic UsageEpisode with sensible defaults. */
function makeEpisode(overrides: Partial<UsageEpisode> = {}): UsageEpisode {
  return {
    id: overrides.id ?? "ep-test-1",
    startTime: overrides.startTime ?? localIso(10, 0),
    endTime: overrides.endTime ?? localIso(10, 1),
    duration: overrides.duration ?? 60,
    appCategory: overrides.appCategory ?? "social_media",
    duringFocusSession: overrides.duringFocusSession ?? false,
    classifiedContext: overrides.classifiedContext ?? "unknown",
  };
}

/**
 * Build a deterministic UsagePattern. Every field must be supplied via
 * overrides because patterns have no reasonable "zero" default for analysis.
 */
function makePattern(overrides: Partial<UsagePattern> = {}): UsagePattern {
  return {
    windowStart: overrides.windowStart ?? "2025-06-15T09:00:00.000Z",
    windowEnd: overrides.windowEnd ?? "2025-06-15T10:00:00.000Z",
    pickupCount: overrides.pickupCount ?? 0,
    totalScreenTime: overrides.totalScreenTime ?? 0,
    avgEpisodeDuration: overrides.avgEpisodeDuration ?? 0,
    dominantCategory: overrides.dominantCategory ?? "unknown",
    pickupFrequency: overrides.pickupFrequency ?? 0,
    compulsivenessScore: overrides.compulsivenessScore ?? 0,
    hourlyDistribution: overrides.hourlyDistribution ?? new Array(24).fill(0),
  };
}

// ── simulateUsageEpisode ─────────────────────────────────────────────────────

describe("simulateUsageEpisode", () => {
  it("returns a valid UsageEpisode structure", () => {
    const episode = simulateUsageEpisode();

    expect(episode).toHaveProperty("id");
    expect(episode.id).toMatch(/^ep-/);
    expect(typeof episode.startTime).toBe("string");
    expect(typeof episode.endTime).toBe("string");
    expect(typeof episode.duration).toBe("number");
    expect(episode.duration).toBeGreaterThan(0);
    expect(episode.classifiedContext).toBe("unknown");
  });

  it("has a valid ISO start/end time where startTime < endTime", () => {
    const episode = simulateUsageEpisode();
    const start = new Date(episode.startTime).getTime();
    const end = new Date(episode.endTime!).getTime();

    expect(start).not.toBeNaN();
    expect(end).not.toBeNaN();
    expect(start).toBeLessThan(end);
  });

  it("sets duringFocusSession to false by default", () => {
    const episode = simulateUsageEpisode();
    expect(episode.duringFocusSession).toBe(false);
  });

  it("sets duringFocusSession to true when passed", () => {
    const episode = simulateUsageEpisode(true);
    expect(episode.duringFocusSession).toBe(true);
  });

  it("assigns a valid AppCategory", () => {
    const validCategories: AppCategory[] = [
      "social_media",
      "messaging",
      "entertainment",
      "productivity",
      "utility",
      "health",
      "education",
      "unknown",
    ];
    // Run several times because output is random
    for (let i = 0; i < 20; i++) {
      const ep = simulateUsageEpisode();
      expect(validCategories).toContain(ep.appCategory);
    }
  });

  it("duration matches the gap between startTime and endTime", () => {
    const ep = simulateUsageEpisode();
    const gap =
      (new Date(ep.endTime!).getTime() - new Date(ep.startTime).getTime()) /
      1000;
    expect(ep.duration).toBe(gap);
  });
});

// ── simulateDayHistory ───────────────────────────────────────────────────────

describe("simulateDayHistory", () => {
  it("returns an array of episodes", () => {
    const episodes = simulateDayHistory(new Date("2025-06-15"));
    expect(Array.isArray(episodes)).toBe(true);
    expect(episodes.length).toBeGreaterThan(0);
  });

  it("all episode start times fall between 7am and 11pm on the given date", () => {
    const date = new Date("2025-06-15");
    const episodes = simulateDayHistory(date);

    const startOfDay = new Date(date);
    startOfDay.setHours(7, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 0, 0, 0);

    for (const ep of episodes) {
      const t = new Date(ep.startTime).getTime();
      expect(t).toBeGreaterThanOrEqual(startOfDay.getTime());
      expect(t).toBeLessThan(endOfDay.getTime());
    }
  });

  it("episodes are in chronological order", () => {
    const episodes = simulateDayHistory(new Date("2025-06-15"));
    for (let i = 1; i < episodes.length; i++) {
      expect(new Date(episodes[i].startTime).getTime()).toBeGreaterThanOrEqual(
        new Date(episodes[i - 1].startTime).getTime(),
      );
    }
  });

  it("all episodes have duringFocusSession = false", () => {
    const episodes = simulateDayHistory(new Date("2025-06-15"));
    for (const ep of episodes) {
      expect(ep.duringFocusSession).toBe(false);
    }
  });

  it("defaults to current date when none provided", () => {
    const episodes = simulateDayHistory();
    expect(episodes.length).toBeGreaterThan(0);
  });

  it("every episode has a positive duration", () => {
    const episodes = simulateDayHistory(new Date("2025-06-15"));
    for (const ep of episodes) {
      expect(ep.duration).toBeGreaterThan(0);
    }
  });
});

// ── analyzeUsagePattern ──────────────────────────────────────────────────────

describe("analyzeUsagePattern", () => {
  // Pin Date.now() so the sliding window is deterministic.
  // Use local time constructor to stay consistent with localIso() timestamps.
  const FIXED_NOW = new Date(2025, 5, 15, 10, 30, 0, 0).getTime();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns zero counts for an empty episode list", () => {
    const pattern = analyzeUsagePattern([]);

    expect(pattern.pickupCount).toBe(0);
    expect(pattern.totalScreenTime).toBe(0);
    expect(pattern.avgEpisodeDuration).toBe(0);
    expect(pattern.compulsivenessScore).toBe(0);
    expect(pattern.pickupFrequency).toBe(0);
    expect(pattern.dominantCategory).toBe("unknown");
  });

  it("filters episodes to the given time window (default 60 min)", () => {
    const episodes = [
      // Inside window (within last 60 min of local 10:30)
      makeEpisode({ id: "in-1", startTime: localIso(10, 0), duration: 45 }),
      makeEpisode({ id: "in-2", startTime: localIso(10, 15), duration: 30 }),
      // Outside window (older than 60 min before local 10:30)
      makeEpisode({ id: "out-1", startTime: localIso(9, 0), duration: 120 }),
    ];

    const pattern = analyzeUsagePattern(episodes);

    expect(pattern.pickupCount).toBe(2);
    expect(pattern.totalScreenTime).toBe(75); // 45 + 30
  });

  it("respects a custom windowMinutes parameter", () => {
    const episodes = [
      makeEpisode({ id: "a", startTime: localIso(10, 0), duration: 20 }),
      makeEpisode({ id: "b", startTime: localIso(10, 20), duration: 10 }),
      makeEpisode({ id: "c", startTime: localIso(9, 30), duration: 50 }),
    ];

    // 15-minute window from local 10:30: only episode "b" (10:20) fits
    const pattern = analyzeUsagePattern(episodes, 15);
    expect(pattern.pickupCount).toBe(1);
    expect(pattern.totalScreenTime).toBe(10);
  });

  it("computes correct avgEpisodeDuration", () => {
    const episodes = [
      makeEpisode({ id: "a", startTime: localIso(10, 0), duration: 60 }),
      makeEpisode({ id: "b", startTime: localIso(10, 10), duration: 120 }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.avgEpisodeDuration).toBe(90); // (60 + 120) / 2
  });

  it("identifies the dominant category by count", () => {
    const episodes = [
      makeEpisode({ id: "a", startTime: localIso(10, 0), appCategory: "messaging" }),
      makeEpisode({ id: "b", startTime: localIso(10, 5), appCategory: "social_media" }),
      makeEpisode({ id: "c", startTime: localIso(10, 10), appCategory: "social_media" }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.dominantCategory).toBe("social_media");
  });

  it("computes compulsivenessScore as ratio of short (<30s) episodes", () => {
    const episodes = [
      makeEpisode({ id: "a", startTime: localIso(10, 0), duration: 10 }), // short
      makeEpisode({ id: "b", startTime: localIso(10, 5), duration: 20 }), // short
      makeEpisode({ id: "c", startTime: localIso(10, 10), duration: 60 }), // not short
      makeEpisode({ id: "d", startTime: localIso(10, 15), duration: 120 }), // not short
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.compulsivenessScore).toBe(0.5); // 2 short out of 4
  });

  it("computes pickupFrequency as count / hours", () => {
    const episodes = [
      makeEpisode({ id: "a", startTime: localIso(10, 0) }),
      makeEpisode({ id: "b", startTime: localIso(10, 10) }),
      makeEpisode({ id: "c", startTime: localIso(10, 20) }),
    ];

    // Default window = 60 min = 1 hour. 3 episodes / 1 hour = 3
    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.pickupFrequency).toBe(3);

    // With a 30-min window, the same 3 episodes / 0.5 hours = 6
    const pattern30 = analyzeUsagePattern(episodes, 30);
    expect(pattern30.pickupFrequency).toBe(6);
  });

  it("builds hourlyDistribution from ALL episodes (not just windowed)", () => {
    // Use localIso so getHours() returns the expected local hour
    const episodes = [
      makeEpisode({ id: "a", startTime: localIso(10, 0) }),
      makeEpisode({ id: "b", startTime: localIso(10, 30) }),
      makeEpisode({ id: "c", startTime: localIso(9, 0) }), // outside window
    ];

    const pattern = analyzeUsagePattern(episodes);
    // Hour 10 has 2 episodes, hour 9 has 1 — even though hour 9 is outside the window
    expect(pattern.hourlyDistribution[10]).toBe(2);
    expect(pattern.hourlyDistribution[9]).toBe(1);
  });

  it("returns ISO windowStart and windowEnd strings", () => {
    const pattern = analyzeUsagePattern([]);
    expect(() => new Date(pattern.windowStart)).not.toThrow();
    expect(() => new Date(pattern.windowEnd)).not.toThrow();
    expect(new Date(pattern.windowEnd).getTime()).toBe(FIXED_NOW);
  });

  it("episode exactly at the boundary is included (startTime === windowStart)", () => {
    // windowStart for 60min = FIXED_NOW - 60*60*1000 = local 09:30
    const episodes = [
      makeEpisode({ id: "boundary", startTime: localIso(9, 30), duration: 40 }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.pickupCount).toBe(1);
    expect(pattern.totalScreenTime).toBe(40);
  });
});

// ── detectAnomalousUsage ─────────────────────────────────────────────────────

describe("detectAnomalousUsage", () => {
  it("returns score 0 and normal message for identical patterns", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 300, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 10, totalScreenTime: 300, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    expect(result.anomalyScore).toBe(0);
    expect(result.reason).toBe("Usage patterns are within normal range");
  });

  it("adds 0.3 for high frequency (freqRatio > 1.5)", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 300, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 20, totalScreenTime: 300, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    expect(result.anomalyScore).toBeCloseTo(0.3, 5);
    expect(result.reason).toContain("Pickup frequency");
    expect(result.reason).toContain("2.0x");
  });

  it("adds 0.3 for high screen time (timeRatio > 1.5)", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 200, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 10, totalScreenTime: 500, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    expect(result.anomalyScore).toBeCloseTo(0.3, 5);
    expect(result.reason).toContain("Screen time");
    expect(result.reason).toContain("2.5x");
  });

  it("adds 0.4 for compulsiveness spike (current > baseline + 0.2)", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 300, compulsivenessScore: 0.2 });
    const current = makePattern({ pickupFrequency: 10, totalScreenTime: 300, compulsivenessScore: 0.5 });

    const result = detectAnomalousUsage(current, baseline);
    expect(result.anomalyScore).toBeCloseTo(0.4, 5);
    expect(result.reason).toContain("short, aimless pickups");
  });

  it("does not trigger compulsiveness spike at exactly baseline + 0.2", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 300, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 10, totalScreenTime: 300, compulsivenessScore: 0.5 });

    const result = detectAnomalousUsage(current, baseline);
    // 0.5 is NOT strictly > 0.3 + 0.2 (= 0.5), so should not trigger
    expect(result.anomalyScore).toBe(0);
  });

  it("combines multiple anomalies (frequency + screen time)", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 200, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 20, totalScreenTime: 400, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    expect(result.anomalyScore).toBeCloseTo(0.6, 5); // 0.3 + 0.3
    expect(result.reason).toContain("Pickup frequency");
    expect(result.reason).toContain("Screen time");
  });

  it("combines all three anomalies (frequency + time + compulsiveness)", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 200, compulsivenessScore: 0.1 });
    const current = makePattern({ pickupFrequency: 20, totalScreenTime: 400, compulsivenessScore: 0.5 });

    const result = detectAnomalousUsage(current, baseline);
    // 0.3 + 0.3 + 0.4 = 1.0 (exactly at cap)
    expect(result.anomalyScore).toBe(1.0);
  });

  it("caps anomaly score at 1.0", () => {
    const baseline = makePattern({ pickupFrequency: 1, totalScreenTime: 1, compulsivenessScore: 0.0 });
    const current = makePattern({ pickupFrequency: 100, totalScreenTime: 1000, compulsivenessScore: 1.0 });

    const result = detectAnomalousUsage(current, baseline);
    // All three triggers fire: 0.3 + 0.3 + 0.4 = 1.0, which is the cap
    expect(result.anomalyScore).toBe(1.0);
    expect(result.anomalyScore).toBeLessThanOrEqual(1.0);
  });

  it("handles zero baseline frequency gracefully (no division by zero)", () => {
    const baseline = makePattern({ pickupFrequency: 0, totalScreenTime: 100, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 10, totalScreenTime: 100, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    // baseline.pickupFrequency = 0, so the frequency check is skipped
    expect(result.anomalyScore).toBe(0);
  });

  it("handles zero baseline screen time gracefully", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 0, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 10, totalScreenTime: 500, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    // baseline.totalScreenTime = 0, so the screen time check is skipped
    expect(result.anomalyScore).toBe(0);
  });

  it("ratio exactly 1.5 does not trigger anomaly", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 200, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 15, totalScreenTime: 300, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    // freqRatio = 1.5 and timeRatio = 1.5, but the condition is strictly > 1.5
    expect(result.anomalyScore).toBe(0);
  });

  it("ratio just above 1.5 triggers anomaly", () => {
    const baseline = makePattern({ pickupFrequency: 10, totalScreenTime: 200, compulsivenessScore: 0.3 });
    const current = makePattern({ pickupFrequency: 15.1, totalScreenTime: 301, compulsivenessScore: 0.3 });

    const result = detectAnomalousUsage(current, baseline);
    expect(result.anomalyScore).toBeCloseTo(0.6, 5); // both triggered
  });
});

// ── computeDailySummary ──────────────────────────────────────────────────────

describe("computeDailySummary", () => {
  it("returns zero values for an empty episode list", () => {
    const summary = computeDailySummary([]);

    expect(summary.totalPickups).toBe(0);
    expect(summary.totalScreenTimeMinutes).toBe(0);
    expect(summary.avgSessionSeconds).toBe(0);
    expect(summary.longestSessionMinutes).toBe(0);
    expect(summary.topCategories).toEqual([]);
    expect(summary.compulsivenessScore).toBe(0);
  });

  it("computes correct totalPickups", () => {
    const episodes = [
      makeEpisode({ id: "1" }),
      makeEpisode({ id: "2" }),
      makeEpisode({ id: "3" }),
    ];
    const summary = computeDailySummary(episodes);
    expect(summary.totalPickups).toBe(3);
  });

  it("computes totalScreenTimeMinutes (rounded)", () => {
    const episodes = [
      makeEpisode({ id: "1", duration: 90 }),  // 1.5 min
      makeEpisode({ id: "2", duration: 150 }), // 2.5 min
    ];
    const summary = computeDailySummary(episodes);
    // Total = 240s = 4.0 min, rounded = 4
    expect(summary.totalScreenTimeMinutes).toBe(4);
  });

  it("rounds totalScreenTimeMinutes correctly", () => {
    const episodes = [
      makeEpisode({ id: "1", duration: 50 }), // 0.833 min
    ];
    const summary = computeDailySummary(episodes);
    // 50/60 = 0.833... rounds to 1
    expect(summary.totalScreenTimeMinutes).toBe(1);
  });

  it("computes avgSessionSeconds", () => {
    const episodes = [
      makeEpisode({ id: "1", duration: 30 }),
      makeEpisode({ id: "2", duration: 90 }),
    ];
    const summary = computeDailySummary(episodes);
    expect(summary.avgSessionSeconds).toBe(60); // (30 + 90) / 2
  });

  it("computes longestSessionMinutes (rounded)", () => {
    const episodes = [
      makeEpisode({ id: "1", duration: 60 }),
      makeEpisode({ id: "2", duration: 300 }),
      makeEpisode({ id: "3", duration: 180 }),
    ];
    const summary = computeDailySummary(episodes);
    expect(summary.longestSessionMinutes).toBe(5); // 300s = 5min
  });

  it("returns topCategories sorted by minutes descending", () => {
    const episodes = [
      makeEpisode({ id: "1", appCategory: "messaging", duration: 120 }),
      makeEpisode({ id: "2", appCategory: "social_media", duration: 300 }),
      makeEpisode({ id: "3", appCategory: "messaging", duration: 60 }),
      makeEpisode({ id: "4", appCategory: "utility", duration: 30 }),
    ];

    const summary = computeDailySummary(episodes);
    const categories = summary.topCategories.map((c) => c.category);

    // social_media: 300s = 5min, messaging: 180s = 3min, utility: 30s ~= 1min
    expect(categories[0]).toBe("social_media");
    expect(categories[1]).toBe("messaging");
    expect(categories[2]).toBe("utility");
  });

  it("topCategories includes correct count and minutes", () => {
    const episodes = [
      makeEpisode({ id: "1", appCategory: "entertainment", duration: 600 }),
      makeEpisode({ id: "2", appCategory: "entertainment", duration: 300 }),
      makeEpisode({ id: "3", appCategory: "productivity", duration: 120 }),
    ];

    const summary = computeDailySummary(episodes);
    const ent = summary.topCategories.find((c) => c.category === "entertainment")!;
    const prod = summary.topCategories.find((c) => c.category === "productivity")!;

    expect(ent.count).toBe(2);
    expect(ent.minutes).toBe(15); // (600 + 300) / 60 = 15
    expect(prod.count).toBe(1);
    expect(prod.minutes).toBe(2); // 120 / 60 = 2
  });

  it("identifies the correct peakHour", () => {
    const episodes = [
      makeEpisode({ id: "1", startTime: localIso(14, 0) }),
      makeEpisode({ id: "2", startTime: localIso(14, 15) }),
      makeEpisode({ id: "3", startTime: localIso(14, 30) }),
      makeEpisode({ id: "4", startTime: localIso(10, 0) }),
    ];

    const summary = computeDailySummary(episodes);
    expect(summary.peakHour).toBe(14);
  });

  it("computes compulsivenessScore as ratio of short (<30s) episodes", () => {
    const episodes = [
      makeEpisode({ id: "1", duration: 10 }),  // short
      makeEpisode({ id: "2", duration: 25 }),  // short
      makeEpisode({ id: "3", duration: 60 }),  // not short
      makeEpisode({ id: "4", duration: 180 }), // not short
    ];

    const summary = computeDailySummary(episodes);
    expect(summary.compulsivenessScore).toBe(0.5); // 2/4
  });

  it("episode with duration exactly 30 is NOT short", () => {
    const episodes = [
      makeEpisode({ id: "1", duration: 30 }),
      makeEpisode({ id: "2", duration: 30 }),
    ];

    const summary = computeDailySummary(episodes);
    expect(summary.compulsivenessScore).toBe(0); // 30 is not < 30
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("single episode: analyzeUsagePattern returns correct metrics", () => {
    const FIXED_NOW = new Date(2025, 5, 15, 10, 30, 0, 0).getTime();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

    const episodes = [
      makeEpisode({ id: "solo", startTime: localIso(10, 0), duration: 45, appCategory: "messaging" }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.pickupCount).toBe(1);
    expect(pattern.totalScreenTime).toBe(45);
    expect(pattern.avgEpisodeDuration).toBe(45);
    expect(pattern.dominantCategory).toBe("messaging");
    // 45s is not < 30, so compulsivenessScore = 0
    expect(pattern.compulsivenessScore).toBe(0);

    jest.restoreAllMocks();
  });

  it("single episode: computeDailySummary handles correctly", () => {
    const episodes = [
      makeEpisode({ id: "solo", duration: 120, appCategory: "entertainment", startTime: localIso(18, 0) }),
    ];

    const summary = computeDailySummary(episodes);
    expect(summary.totalPickups).toBe(1);
    expect(summary.totalScreenTimeMinutes).toBe(2); // 120s = 2min
    expect(summary.avgSessionSeconds).toBe(120);
    expect(summary.longestSessionMinutes).toBe(2);
    expect(summary.topCategories).toHaveLength(1);
    expect(summary.topCategories[0].category).toBe("entertainment");
    expect(summary.peakHour).toBe(18);
    expect(summary.compulsivenessScore).toBe(0);
  });

  it("all episodes in the same category", () => {
    const FIXED_NOW = new Date(2025, 5, 15, 10, 30, 0, 0).getTime();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

    const episodes = [
      makeEpisode({ id: "1", startTime: localIso(10, 0), appCategory: "productivity", duration: 60 }),
      makeEpisode({ id: "2", startTime: localIso(10, 5), appCategory: "productivity", duration: 90 }),
      makeEpisode({ id: "3", startTime: localIso(10, 10), appCategory: "productivity", duration: 45 }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.dominantCategory).toBe("productivity");

    const summary = computeDailySummary(episodes);
    expect(summary.topCategories).toHaveLength(1);
    expect(summary.topCategories[0].category).toBe("productivity");
    expect(summary.topCategories[0].count).toBe(3);

    jest.restoreAllMocks();
  });

  it("all episodes are short (<30s): compulsivenessScore = 1", () => {
    const FIXED_NOW = new Date(2025, 5, 15, 10, 30, 0, 0).getTime();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

    const episodes = [
      makeEpisode({ id: "1", startTime: localIso(10, 0), duration: 5 }),
      makeEpisode({ id: "2", startTime: localIso(10, 1), duration: 10 }),
      makeEpisode({ id: "3", startTime: localIso(10, 2), duration: 15 }),
      makeEpisode({ id: "4", startTime: localIso(10, 3), duration: 29 }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.compulsivenessScore).toBe(1); // all 4 are < 30s

    const summary = computeDailySummary(episodes);
    expect(summary.compulsivenessScore).toBe(1);

    jest.restoreAllMocks();
  });

  it("all episodes are long (>= 30s): compulsivenessScore = 0", () => {
    const FIXED_NOW = new Date(2025, 5, 15, 10, 30, 0, 0).getTime();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

    const episodes = [
      makeEpisode({ id: "1", startTime: localIso(10, 0), duration: 30 }),
      makeEpisode({ id: "2", startTime: localIso(10, 5), duration: 60 }),
      makeEpisode({ id: "3", startTime: localIso(10, 10), duration: 300 }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.compulsivenessScore).toBe(0);

    const summary = computeDailySummary(episodes);
    expect(summary.compulsivenessScore).toBe(0);

    jest.restoreAllMocks();
  });

  it("peakHour returns 0 when all episodes are at midnight (hour 0)", () => {
    const episodes = [
      makeEpisode({ id: "1", startTime: localIso(0, 5), duration: 60 }),
      makeEpisode({ id: "2", startTime: localIso(0, 15), duration: 30 }),
    ];

    const summary = computeDailySummary(episodes);
    expect(summary.peakHour).toBe(0);
  });

  it("detectAnomalousUsage with two zero-baseline metrics still works", () => {
    const baseline = makePattern({ pickupFrequency: 0, totalScreenTime: 0, compulsivenessScore: 0 });
    const current = makePattern({ pickupFrequency: 50, totalScreenTime: 5000, compulsivenessScore: 0.8 });

    // Frequency and screen time checks skipped (baseline is 0)
    // Compulsiveness: 0.8 > 0 + 0.2 = 0.2, so triggers +0.4
    const result = detectAnomalousUsage(current, baseline);
    expect(result.anomalyScore).toBeCloseTo(0.4, 5);
  });

  it("analyzeUsagePattern with all episodes outside window returns zero metrics", () => {
    // Mock now to local 10:30, so the 60-min window starts at local 09:30
    const FIXED_NOW = new Date(2025, 5, 15, 10, 30, 0, 0).getTime();
    jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);

    // Both episodes are before the window (local 08:00 and 07:00)
    const episodes = [
      makeEpisode({ id: "old-1", startTime: localIso(8, 0), duration: 60 }),
      makeEpisode({ id: "old-2", startTime: localIso(7, 0), duration: 120 }),
    ];

    const pattern = analyzeUsagePattern(episodes);
    expect(pattern.pickupCount).toBe(0);
    expect(pattern.totalScreenTime).toBe(0);
    expect(pattern.avgEpisodeDuration).toBe(0);
    expect(pattern.compulsivenessScore).toBe(0);
    // But hourlyDistribution still counts them (uses ALL episodes)
    expect(pattern.hourlyDistribution[8]).toBe(1);
    expect(pattern.hourlyDistribution[7]).toBe(1);

    jest.restoreAllMocks();
  });
});
