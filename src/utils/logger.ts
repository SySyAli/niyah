/**
 * Production-safe logging utility.
 *
 * In __DEV__: forwards to console.
 * In production: forwards error/warn to Sentry (if configured via
 * EXPO_PUBLIC_SENTRY_DSN); info/debug are dropped to prevent auth tokens,
 * payment IDs, or user data leaking to device logs.
 */

/* eslint-disable no-console */

import { captureException, captureMessage } from "../config/sentry";

declare const __DEV__: boolean;

const stringifyArg = (arg: unknown): string => {
  if (arg instanceof Error) return arg.message;
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const joinArgs = (args: unknown[]): string =>
  args.map(stringifyArg).filter(Boolean).join(" ");

export const logger = {
  error: (...args: unknown[]): void => {
    if (__DEV__) {
      console.error(...args);
      return;
    }
    const err = args.find((a): a is Error => a instanceof Error);
    const context = { extra: { args: args.map(stringifyArg) } };
    if (err) {
      captureException(err, context);
    } else {
      captureMessage(joinArgs(args) || "unknown error", "error");
    }
  },

  warn: (...args: unknown[]): void => {
    if (__DEV__) {
      console.warn(...args);
      return;
    }
    captureMessage(joinArgs(args) || "warning", "warning");
  },

  info: (...args: unknown[]): void => {
    if (__DEV__) console.info(...args);
  },

  debug: (...args: unknown[]): void => {
    if (__DEV__) console.log(...args);
  },
};
