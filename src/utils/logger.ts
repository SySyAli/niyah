/**
 * Production-safe logging utility.
 *
 * In __DEV__ mode (development builds), logs are forwarded to console.
 * In production builds, all logging is suppressed to prevent sensitive
 * data leakage via device logs (accessible via Console.app on iOS,
 * logcat on Android).
 *
 * Usage:
 *   import { logger } from "../utils/logger";
 *   logger.error("Operation failed:", error);
 *   logger.warn("Deprecation notice");
 *
 * Replace bare console.error/console.warn calls with logger.error/logger.warn
 * across the codebase to ensure production builds don't leak error details
 * that may contain auth tokens, user data, or payment information.
 */

/* eslint-disable no-console */

// __DEV__ is a React Native global: true in development, false in production.
declare const __DEV__: boolean;

export const logger = {
  error: (...args: unknown[]): void => {
    if (__DEV__) console.error(...args);
  },

  warn: (...args: unknown[]): void => {
    if (__DEV__) console.warn(...args);
  },

  info: (...args: unknown[]): void => {
    if (__DEV__) console.info(...args);
  },

  debug: (...args: unknown[]): void => {
    if (__DEV__) console.log(...args);
  },
};
