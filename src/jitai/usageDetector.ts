// JITAI Variant 3: Usage Pattern Detector
// Monitors phone pickup frequency and usage patterns
// using a sliding window analysis to identify compulsive behavior.

import type { UsageEpisode, UsagePattern, AppCategory } from "./types";

// ── Simulated Usage Data (Demo Mode) ─────────────────────────────────────

/**
 * Generates a simulated phone pickup episode.
 * In production, this would come from the Screen Time API.
 */
export function simulateUsageEpisode(
  duringFocusSession: boolean = false,
): UsageEpisode {
  const categories: AppCategory[] = [
    "social_media",
    "messaging",
    "entertainment",
    "productivity",
    "utility",
  ];

  // During focus sessions, social media and entertainment are more common
  // (these are the problematic pickups)
  const weights = duringFocusSession
    ? [0.4, 0.2, 0.25, 0.1, 0.05]
    : [0.25, 0.2, 0.15, 0.25, 0.15];

  const appCategory = weightedSelect(categories, weights);
  const duration = generateDuration(appCategory);
  const now = new Date();

  return {
    id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    startTime: new Date(now.getTime() - duration * 1000).toISOString(),
    endTime: now.toISOString(),
    duration,
    appCategory,
    duringFocusSession,
    classifiedContext: "unknown", // Will be classified by contextClassifier
  };
}

/**
 * Generates a batch of simulated usage history for a full day.
 */
export function simulateDayHistory(date: Date = new Date()): UsageEpisode[] {
  const episodes: UsageEpisode[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(7, 0, 0, 0); // Wake at 7am

  let currentTime = startOfDay.getTime();
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 0, 0, 0);

  while (currentTime < endOfDay.getTime()) {
    const hour = new Date(currentTime).getHours();

    // Pickup frequency varies by hour: higher during work breaks and evening
    const avgInterval = getAvgPickupInterval(hour) * 60 * 1000;
    const interval = avgInterval * (0.5 + Math.random()); // Randomize

    currentTime += interval;

    if (currentTime >= endOfDay.getTime()) break;

    const categories: AppCategory[] = [
      "social_media",
      "messaging",
      "entertainment",
      "productivity",
      "utility",
    ];
    const appCategory =
      categories[Math.floor(Math.random() * categories.length)];
    const duration = generateDuration(appCategory);

    episodes.push({
      id: `ep-${currentTime}-${Math.random().toString(36).slice(2, 6)}`,
      startTime: new Date(currentTime).toISOString(),
      endTime: new Date(currentTime + duration * 1000).toISOString(),
      duration,
      appCategory,
      duringFocusSession: false,
      classifiedContext: "unknown",
    });

    currentTime += duration * 1000;
  }

  return episodes;
}

// ── Usage Pattern Analysis ───────────────────────────────────────────────

/**
 * Analyzes usage episodes within a time window to produce a pattern summary.
 *
 * @param episodes - Usage episodes to analyze
 * @param windowMinutes - Time window size in minutes (default: 60)
 * @returns Usage pattern summary
 */
export function analyzeUsagePattern(
  episodes: UsageEpisode[],
  windowMinutes: number = 60,
): UsagePattern {
  const now = Date.now();
  const windowStart = now - windowMinutes * 60 * 1000;

  const windowEpisodes = episodes.filter(
    (ep) => new Date(ep.startTime).getTime() >= windowStart,
  );

  const totalScreenTime = windowEpisodes.reduce(
    (sum, ep) => sum + ep.duration,
    0,
  );
  const avgDuration =
    windowEpisodes.length > 0 ? totalScreenTime / windowEpisodes.length : 0;

  // Count category occurrences
  const categoryCounts: Record<string, number> = {};
  for (const ep of windowEpisodes) {
    categoryCounts[ep.appCategory] = (categoryCounts[ep.appCategory] || 0) + 1;
  }
  const dominantCategory = (Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] ?? "unknown") as AppCategory;

  // Compulsiveness: ratio of short (<30s) episodes to total
  const shortEpisodes = windowEpisodes.filter((ep) => ep.duration < 30);
  const compulsivenessScore =
    windowEpisodes.length > 0
      ? shortEpisodes.length / windowEpisodes.length
      : 0;

  // Hourly distribution
  const hourlyDistribution = new Array(24).fill(0);
  for (const ep of episodes) {
    const hour = new Date(ep.startTime).getHours();
    hourlyDistribution[hour]++;
  }

  return {
    windowStart: new Date(windowStart).toISOString(),
    windowEnd: new Date(now).toISOString(),
    pickupCount: windowEpisodes.length,
    totalScreenTime,
    avgEpisodeDuration: avgDuration,
    dominantCategory,
    pickupFrequency: windowEpisodes.length / (windowMinutes / 60),
    compulsivenessScore,
    hourlyDistribution,
  };
}

/**
 * Detects if the current usage pattern is anomalous compared to baseline.
 *
 * @param current - Current pattern
 * @param baseline - Baseline pattern (historical average)
 * @returns Anomaly score (0 = normal, 1 = highly anomalous)
 */
export function detectAnomalousUsage(
  current: UsagePattern,
  baseline: UsagePattern,
): {
  anomalyScore: number;
  reason: string;
} {
  let anomalyScore = 0;
  const reasons: string[] = [];

  // Pickup frequency anomaly
  if (baseline.pickupFrequency > 0) {
    const freqRatio = current.pickupFrequency / baseline.pickupFrequency;
    if (freqRatio > 1.5) {
      anomalyScore += 0.3;
      reasons.push(`Pickup frequency ${freqRatio.toFixed(1)}x above normal`);
    }
  }

  // Screen time anomaly
  if (baseline.totalScreenTime > 0) {
    const timeRatio = current.totalScreenTime / baseline.totalScreenTime;
    if (timeRatio > 1.5) {
      anomalyScore += 0.3;
      reasons.push(`Screen time ${timeRatio.toFixed(1)}x above normal`);
    }
  }

  // Compulsiveness spike
  if (current.compulsivenessScore > baseline.compulsivenessScore + 0.2) {
    anomalyScore += 0.4;
    reasons.push("Unusually high ratio of short, aimless pickups");
  }

  return {
    anomalyScore: Math.min(anomalyScore, 1),
    reason:
      reasons.length > 0
        ? reasons.join(". ")
        : "Usage patterns are within normal range",
  };
}

/**
 * Computes a daily usage summary with key metrics.
 */
export function computeDailySummary(episodes: UsageEpisode[]): {
  totalPickups: number;
  totalScreenTimeMinutes: number;
  avgSessionSeconds: number;
  longestSessionMinutes: number;
  topCategories: Array<{
    category: AppCategory;
    count: number;
    minutes: number;
  }>;
  peakHour: number;
  compulsivenessScore: number;
} {
  const totalPickups = episodes.length;
  const totalScreenTime = episodes.reduce((s, e) => s + e.duration, 0);

  const longest = episodes.reduce((max, e) => Math.max(max, e.duration), 0);

  // Category breakdown
  const catMap: Record<string, { count: number; duration: number }> = {};
  for (const ep of episodes) {
    if (!catMap[ep.appCategory]) {
      catMap[ep.appCategory] = { count: 0, duration: 0 };
    }
    catMap[ep.appCategory].count++;
    catMap[ep.appCategory].duration += ep.duration;
  }
  const topCategories = Object.entries(catMap)
    .map(([category, stats]) => ({
      category: category as AppCategory,
      count: stats.count,
      minutes: Math.round(stats.duration / 60),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // Peak hour
  const hourCounts = new Array(24).fill(0);
  for (const ep of episodes) {
    hourCounts[new Date(ep.startTime).getHours()]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  // Compulsiveness
  const shortPickups = episodes.filter((e) => e.duration < 30).length;
  const compulsivenessScore =
    totalPickups > 0 ? shortPickups / totalPickups : 0;

  return {
    totalPickups,
    totalScreenTimeMinutes: Math.round(totalScreenTime / 60),
    avgSessionSeconds: totalPickups > 0 ? totalScreenTime / totalPickups : 0,
    longestSessionMinutes: Math.round(longest / 60),
    topCategories,
    peakHour,
    compulsivenessScore,
  };
}

// ── Utilities ────────────────────────────────────────────────────────────

function generateDuration(category: AppCategory): number {
  // Duration distributions vary by app category
  const baseDurations: Record<AppCategory, [number, number]> = {
    social_media: [15, 300], // 15s - 5min (often longer scrolling)
    messaging: [10, 120], // 10s - 2min (quick replies)
    entertainment: [30, 600], // 30s - 10min (video watching)
    productivity: [20, 180], // 20s - 3min (checking email)
    utility: [5, 60], // 5s - 1min (quick lookup)
    health: [10, 120],
    education: [30, 300],
    unknown: [10, 120],
  };

  const [min, max] = baseDurations[category] || [10, 120];
  // Log-normal distribution (most pickups are short)
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const logDuration = logMin + Math.random() * (logMax - logMin);
  return Math.round(Math.exp(logDuration));
}

function getAvgPickupInterval(hour: number): number {
  // Average minutes between pickups by hour of day
  // Lower = more frequent pickups
  const intervals: Record<number, number> = {
    7: 15,
    8: 12,
    9: 20,
    10: 25,
    11: 20,
    12: 10,
    13: 12,
    14: 25,
    15: 20,
    16: 15,
    17: 10,
    18: 8,
    19: 8,
    20: 10,
    21: 12,
    22: 15,
  };
  return intervals[hour] ?? 30;
}

function weightedSelect<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}
