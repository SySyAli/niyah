import { useState, useEffect, useCallback, useRef } from "react";

interface UseCountdownOptions {
  onComplete?: () => void;
  interval?: number;
}

interface UseCountdownReturn {
  timeRemaining: number;
  isRunning: boolean;
  start: (endTime: Date) => void;
  stop: () => void;
  reset: () => void;
}

export const useCountdown = (
  options: UseCountdownOptions = {},
): UseCountdownReturn => {
  const { onComplete, interval = 1000 } = options;
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const endTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Store onComplete in a ref so its identity never changes, preventing
  // downstream useCallback deps (updateTimeRemaining → start) from
  // being recreated on every render and causing infinite useEffect loops.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateTimeRemaining = useCallback(() => {
    if (!endTimeRef.current) return;

    const remaining = endTimeRef.current.getTime() - Date.now();

    if (remaining <= 0) {
      setTimeRemaining(0);
      setIsRunning(false);
      clearTimer();
      onCompleteRef.current?.();
    } else {
      setTimeRemaining(remaining);
    }
  }, [clearTimer]); // onComplete removed from deps — accessed via ref

  const start = useCallback(
    (endTime: Date) => {
      endTimeRef.current = endTime;
      setIsRunning(true);
      updateTimeRemaining();

      clearTimer();
      intervalRef.current = setInterval(updateTimeRemaining, interval);
    },
    [clearTimer, interval, updateTimeRemaining],
  );

  const stop = useCallback(() => {
    setIsRunning(false);
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    setTimeRemaining(0);
    setIsRunning(false);
    endTimeRef.current = null;
    clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    timeRemaining,
    isRunning,
    start,
    stop,
    reset,
  };
};
