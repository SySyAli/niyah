/**
 * Unit Tests for useCountdown hook
 *
 * Tests timer behavior: start, stop, reset, completion callback.
 * Uses @testing-library/react's renderHook since we run in jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountdown } from "../../../hooks/useCountdown";

describe("useCountdown hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts with timeRemaining = 0 and isRunning = false", () => {
      const { result } = renderHook(() => useCountdown());

      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isRunning).toBe(false);
    });

    it("exposes start, stop, and reset functions", () => {
      const { result } = renderHook(() => useCountdown());

      expect(typeof result.current.start).toBe("function");
      expect(typeof result.current.stop).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });
  });

  describe("start", () => {
    it("sets isRunning to true when started", () => {
      const { result } = renderHook(() => useCountdown());
      const endTime = new Date(Date.now() + 10000);

      act(() => {
        result.current.start(endTime);
      });

      expect(result.current.isRunning).toBe(true);
    });

    it("calculates timeRemaining based on endTime", () => {
      const { result } = renderHook(() => useCountdown());
      const endTime = new Date(Date.now() + 5000);

      act(() => {
        result.current.start(endTime);
      });

      expect(result.current.timeRemaining).toBeGreaterThanOrEqual(4900);
      expect(result.current.timeRemaining).toBeLessThanOrEqual(5100);
    });
  });

  describe("stop", () => {
    it("sets isRunning to false", () => {
      const { result } = renderHook(() => useCountdown());
      const endTime = new Date(Date.now() + 10000);

      act(() => {
        result.current.start(endTime);
      });
      expect(result.current.isRunning).toBe(true);

      act(() => {
        result.current.stop();
      });
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets timeRemaining to 0 and isRunning to false", () => {
      const { result } = renderHook(() => useCountdown());
      const endTime = new Date(Date.now() + 10000);

      act(() => {
        result.current.start(endTime);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe("completion callback", () => {
    it("calls onComplete when timer reaches 0", () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useCountdown({ onComplete }));

      const endTime = new Date(Date.now() + 2000);

      act(() => {
        result.current.start(endTime);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onComplete).toHaveBeenCalled();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.timeRemaining).toBe(0);
    });
  });

  describe("type contract", () => {
    it("returns the expected shape", () => {
      const { result } = renderHook(() => useCountdown());

      expect(result.current).toMatchObject({
        timeRemaining: expect.any(Number),
        isRunning: expect.any(Boolean),
        start: expect.any(Function),
        stop: expect.any(Function),
        reset: expect.any(Function),
      });
    });
  });
});
