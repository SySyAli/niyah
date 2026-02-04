/**
 * Unit Tests for format.ts
 *
 * Testing Strategy:
 * - WHITE BOX: Tests based on internal implementation knowledge
 * - Boundary value analysis for edge cases
 * - Equivalence partitioning for input ranges
 * - Decision table testing for conditional logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatMoney,
  formatMoneyCompact,
  formatTime,
  formatTimeRemaining,
  formatDate,
  formatRelativeTime,
  getStreakMultiplier,
  formatPercentage,
  formatMultiplier,
} from "../../../utils/format";

describe("formatMoney", () => {
  describe("basic formatting (WHITE BOX - tests Intl.NumberFormat logic)", () => {
    it("should format zero cents correctly", () => {
      expect(formatMoney(0)).toBe("$0.00");
    });

    it("should format positive cents with decimals", () => {
      expect(formatMoney(500)).toBe("$5.00");
      expect(formatMoney(1000)).toBe("$10.00");
      expect(formatMoney(2599)).toBe("$25.99");
    });

    it("should format cents with proper rounding", () => {
      expect(formatMoney(1)).toBe("$0.01");
      expect(formatMoney(99)).toBe("$0.99");
      expect(formatMoney(101)).toBe("$1.01");
    });

    it("should handle large amounts", () => {
      expect(formatMoney(100000)).toBe("$1,000.00");
      expect(formatMoney(10000000)).toBe("$100,000.00");
    });
  });

  describe("showCents parameter (WHITE BOX - tests conditional logic)", () => {
    it("should show cents by default", () => {
      expect(formatMoney(500)).toBe("$5.00");
    });

    it("should show cents when showCents is true", () => {
      expect(formatMoney(500, true)).toBe("$5.00");
      expect(formatMoney(525, true)).toBe("$5.25");
    });

    it("should hide cents when showCents is false", () => {
      expect(formatMoney(500, false)).toBe("$5");
      expect(formatMoney(525, false)).toBe("$5"); // Rounds to nearest dollar
    });
  });

  describe("boundary values", () => {
    it("should handle negative amounts", () => {
      expect(formatMoney(-500)).toBe("-$5.00");
      expect(formatMoney(-1)).toBe("-$0.01");
    });

    it("should handle very small positive amounts", () => {
      expect(formatMoney(1)).toBe("$0.01");
    });

    it("should handle very large amounts", () => {
      expect(formatMoney(999999999)).toBe("$9,999,999.99");
    });
  });
});

describe("formatMoneyCompact", () => {
  describe("basic ranges (WHITE BOX - tests threshold logic)", () => {
    it("should format amounts under $1000 without abbreviation", () => {
      expect(formatMoneyCompact(0)).toBe("$0");
      expect(formatMoneyCompact(100)).toBe("$1");
      expect(formatMoneyCompact(99900)).toBe("$999");
    });

    it("should format amounts $1000-$999999 with K abbreviation", () => {
      expect(formatMoneyCompact(100000)).toBe("$1.0K");
      expect(formatMoneyCompact(150000)).toBe("$1.5K");
      expect(formatMoneyCompact(999999 * 100)).toBe("$1000.0K"); // Edge case
    });

    it("should format amounts $1M+ with M abbreviation", () => {
      expect(formatMoneyCompact(100000000)).toBe("$1.0M");
      expect(formatMoneyCompact(250000000)).toBe("$2.5M");
      expect(formatMoneyCompact(10000000000)).toBe("$100.0M");
    });
  });

  describe("boundary values", () => {
    it("should correctly handle boundary at $1000", () => {
      expect(formatMoneyCompact(99900)).toBe("$999"); // Just under $1000
      expect(formatMoneyCompact(100000)).toBe("$1.0K"); // Exactly $1000
    });

    it("should correctly handle boundary at $1M", () => {
      expect(formatMoneyCompact(99990000)).toBe("$999.9K"); // Just under $1M
      expect(formatMoneyCompact(100000000)).toBe("$1.0M"); // Exactly $1M
    });
  });
});

describe("formatTime", () => {
  describe("basic formatting (WHITE BOX - tests time calculation logic)", () => {
    it("should format zero milliseconds", () => {
      expect(formatTime(0)).toBe("00:00");
    });

    it("should format seconds only", () => {
      expect(formatTime(1000)).toBe("00:01");
      expect(formatTime(30000)).toBe("00:30");
      expect(formatTime(59000)).toBe("00:59");
    });

    it("should format minutes and seconds", () => {
      expect(formatTime(60000)).toBe("01:00");
      expect(formatTime(90000)).toBe("01:30");
      expect(formatTime(3599000)).toBe("59:59");
    });

    it("should include hours when >= 1 hour", () => {
      expect(formatTime(3600000)).toBe("01:00:00");
      expect(formatTime(3661000)).toBe("01:01:01");
      expect(formatTime(86400000)).toBe("24:00:00"); // 24 hours
    });
  });

  describe("edge cases", () => {
    it("should handle negative values by clamping to 0", () => {
      expect(formatTime(-1000)).toBe("00:00");
      expect(formatTime(-100000)).toBe("00:00");
    });

    it("should handle decimal milliseconds by flooring", () => {
      expect(formatTime(1500)).toBe("00:01");
      expect(formatTime(1999)).toBe("00:01");
    });

    it("should pad single digits with zero", () => {
      expect(formatTime(5000)).toBe("00:05");
      expect(formatTime(65000)).toBe("01:05");
    });
  });
});

describe("formatTimeRemaining", () => {
  describe("human-readable format (WHITE BOX - tests conditional branches)", () => {
    it("should format seconds only when < 1 minute", () => {
      expect(formatTimeRemaining(0)).toBe("0s remaining");
      expect(formatTimeRemaining(30000)).toBe("30s remaining");
      expect(formatTimeRemaining(59000)).toBe("59s remaining");
    });

    it("should format minutes and seconds when < 1 hour", () => {
      expect(formatTimeRemaining(60000)).toBe("1m 0s remaining");
      expect(formatTimeRemaining(90000)).toBe("1m 30s remaining");
      expect(formatTimeRemaining(3599000)).toBe("59m 59s remaining");
    });

    it("should format hours and minutes when >= 1 hour", () => {
      expect(formatTimeRemaining(3600000)).toBe("1h 0m remaining");
      expect(formatTimeRemaining(5400000)).toBe("1h 30m remaining");
      expect(formatTimeRemaining(86400000)).toBe("24h 0m remaining");
    });
  });

  describe("edge cases", () => {
    it("should clamp negative values to 0", () => {
      expect(formatTimeRemaining(-5000)).toBe("0s remaining");
    });
  });
});

describe("formatDate", () => {
  it("should format dates in expected format", () => {
    const date = new Date("2025-02-03T14:30:00");
    const formatted = formatDate(date);

    // Check that it contains expected parts (format varies by locale)
    expect(formatted).toContain("Feb");
    expect(formatted).toContain("3");
  });

  it("should handle midnight", () => {
    const date = new Date("2025-12-25T00:00:00");
    const formatted = formatDate(date);
    expect(formatted).toContain("Dec");
    expect(formatted).toContain("25");
  });
});

describe("formatRelativeTime", () => {
  describe("relative time thresholds (WHITE BOX - tests conditional branches)", () => {
    it("should return 'Just now' for < 1 minute", () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe("Just now");

      const thirtySecsAgo = new Date(Date.now() - 30000);
      expect(formatRelativeTime(thirtySecsAgo)).toBe("Just now");
    });

    it("should return minutes ago for 1-59 minutes", () => {
      const oneMinAgo = new Date(Date.now() - 60000);
      expect(formatRelativeTime(oneMinAgo)).toBe("1m ago");

      const thirtyMinsAgo = new Date(Date.now() - 1800000);
      expect(formatRelativeTime(thirtyMinsAgo)).toBe("30m ago");
    });

    it("should return hours ago for 1-23 hours", () => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      expect(formatRelativeTime(oneHourAgo)).toBe("1h ago");

      const twelveHoursAgo = new Date(Date.now() - 43200000);
      expect(formatRelativeTime(twelveHoursAgo)).toBe("12h ago");
    });

    it("should return days ago for 1-6 days", () => {
      const oneDayAgo = new Date(Date.now() - 86400000);
      expect(formatRelativeTime(oneDayAgo)).toBe("1d ago");

      const sixDaysAgo = new Date(Date.now() - 518400000);
      expect(formatRelativeTime(sixDaysAgo)).toBe("6d ago");
    });

    it("should return formatted date for >= 7 days", () => {
      const sevenDaysAgo = new Date(Date.now() - 604800000);
      const formatted = formatRelativeTime(sevenDaysAgo);
      // Should fall back to formatDate - contains month abbreviation
      expect(formatted).toMatch(/\w{3}\s+\d/);
    });
  });
});

describe("getStreakMultiplier", () => {
  describe("daily cadence (WHITE BOX - tests decision table)", () => {
    it("should return 1.0x for streak < 5", () => {
      expect(getStreakMultiplier(0, "daily")).toBe(1.0);
      expect(getStreakMultiplier(1, "daily")).toBe(1.0);
      expect(getStreakMultiplier(4, "daily")).toBe(1.0);
    });

    it("should return 1.25x for streak 5-9", () => {
      expect(getStreakMultiplier(5, "daily")).toBe(1.25);
      expect(getStreakMultiplier(7, "daily")).toBe(1.25);
      expect(getStreakMultiplier(9, "daily")).toBe(1.25);
    });

    it("should return 1.5x for streak >= 10", () => {
      expect(getStreakMultiplier(10, "daily")).toBe(1.5);
      expect(getStreakMultiplier(15, "daily")).toBe(1.5);
      expect(getStreakMultiplier(100, "daily")).toBe(1.5);
    });
  });

  describe("weekly cadence (WHITE BOX - tests decision table)", () => {
    it("should return 1.0x for streak < 4", () => {
      expect(getStreakMultiplier(0, "weekly")).toBe(1.0);
      expect(getStreakMultiplier(3, "weekly")).toBe(1.0);
    });

    it("should return 1.5x for streak 4-7", () => {
      expect(getStreakMultiplier(4, "weekly")).toBe(1.5);
      expect(getStreakMultiplier(7, "weekly")).toBe(1.5);
    });

    it("should return 2.0x for streak >= 8", () => {
      expect(getStreakMultiplier(8, "weekly")).toBe(2.0);
      expect(getStreakMultiplier(20, "weekly")).toBe(2.0);
    });
  });

  describe("monthly cadence (WHITE BOX - tests decision table)", () => {
    it("should return 1.0x for streak < 3", () => {
      expect(getStreakMultiplier(0, "monthly")).toBe(1.0);
      expect(getStreakMultiplier(2, "monthly")).toBe(1.0);
    });

    it("should return 2.0x for streak 3-5", () => {
      expect(getStreakMultiplier(3, "monthly")).toBe(2.0);
      expect(getStreakMultiplier(5, "monthly")).toBe(2.0);
    });

    it("should return 3.0x for streak >= 6", () => {
      expect(getStreakMultiplier(6, "monthly")).toBe(3.0);
      expect(getStreakMultiplier(12, "monthly")).toBe(3.0);
    });
  });

  describe("boundary testing", () => {
    it("should handle exact boundary values", () => {
      // Daily boundaries
      expect(getStreakMultiplier(4, "daily")).toBe(1.0);
      expect(getStreakMultiplier(5, "daily")).toBe(1.25);
      expect(getStreakMultiplier(9, "daily")).toBe(1.25);
      expect(getStreakMultiplier(10, "daily")).toBe(1.5);

      // Weekly boundaries
      expect(getStreakMultiplier(3, "weekly")).toBe(1.0);
      expect(getStreakMultiplier(4, "weekly")).toBe(1.5);
      expect(getStreakMultiplier(7, "weekly")).toBe(1.5);
      expect(getStreakMultiplier(8, "weekly")).toBe(2.0);

      // Monthly boundaries
      expect(getStreakMultiplier(2, "monthly")).toBe(1.0);
      expect(getStreakMultiplier(3, "monthly")).toBe(2.0);
      expect(getStreakMultiplier(5, "monthly")).toBe(2.0);
      expect(getStreakMultiplier(6, "monthly")).toBe(3.0);
    });
  });
});

describe("formatPercentage", () => {
  describe("basic formatting", () => {
    it("should format whole percentages without decimals by default", () => {
      expect(formatPercentage(0)).toBe("0%");
      expect(formatPercentage(50)).toBe("50%");
      expect(formatPercentage(100)).toBe("100%");
    });

    it("should format with specified decimal places", () => {
      expect(formatPercentage(50.5, 1)).toBe("50.5%");
      expect(formatPercentage(33.333, 2)).toBe("33.33%");
      expect(formatPercentage(99.999, 3)).toBe("99.999%");
    });

    it("should handle values > 100", () => {
      expect(formatPercentage(150)).toBe("150%");
      expect(formatPercentage(200.5, 1)).toBe("200.5%");
    });

    it("should handle negative values", () => {
      expect(formatPercentage(-10)).toBe("-10%");
      expect(formatPercentage(-50.5, 1)).toBe("-50.5%");
    });
  });
});

describe("formatMultiplier", () => {
  describe("basic formatting", () => {
    it("should format multipliers with 1 decimal place and x suffix", () => {
      expect(formatMultiplier(1)).toBe("1.0x");
      expect(formatMultiplier(1.5)).toBe("1.5x");
      expect(formatMultiplier(2)).toBe("2.0x");
      expect(formatMultiplier(2.5)).toBe("2.5x");
    });

    it("should handle large multipliers", () => {
      expect(formatMultiplier(10)).toBe("10.0x");
      expect(formatMultiplier(100)).toBe("100.0x");
    });

    it("should handle fractional multipliers", () => {
      expect(formatMultiplier(0.5)).toBe("0.5x");
      expect(formatMultiplier(0.25)).toBe("0.3x"); // Rounds to 1 decimal
      expect(formatMultiplier(1.25)).toBe("1.3x"); // Rounds to 1 decimal
    });
  });
});
