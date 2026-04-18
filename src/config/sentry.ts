/**
 * Thin Sentry facade. Dynamic-requires @sentry/react-native so the app keeps
 * running if the native module hasn't been rebuilt yet. DSN via
 * EXPO_PUBLIC_SENTRY_DSN; leave unset to disable.
 */

declare const __DEV__: boolean;

type SentryLevel = "info" | "warning" | "error";

type SentryModule = {
  init: (options: Record<string, unknown>) => void;
  captureException: (err: unknown, context?: Record<string, unknown>) => void;
  captureMessage: (msg: string, level?: SentryLevel) => void;
  addBreadcrumb: (bc: {
    category?: string;
    message?: string;
    level?: SentryLevel;
    data?: Record<string, unknown>;
  }) => void;
  setUser: (user: { id?: string; email?: string } | null) => void;
};

let cached: SentryModule | null = null;
let loadAttempted = false;

function loadSentry(): SentryModule | null {
  if (cached) return cached;
  if (loadAttempted) return null;
  loadAttempted = true;
  try {
    cached = require("@sentry/react-native") as SentryModule;
    return cached;
  } catch {
    return null;
  }
}

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  const s = loadSentry();
  if (!s) return;
  try {
    s.init({
      dsn,
      environment: __DEV__ ? "development" : "production",
      tracesSampleRate: 0.1,
      enableAutoSessionTracking: true,
    });
  } catch {
    // Never block app launch on Sentry init failure.
  }
}

export function captureException(
  err: unknown,
  ctx?: Record<string, unknown>,
): void {
  loadSentry()?.captureException(err, ctx);
}

export function captureMessage(msg: string, level: SentryLevel = "info"): void {
  loadSentry()?.captureMessage(msg, level);
}

export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  loadSentry()?.addBreadcrumb({ category, message, level: "info", data });
}

export function setSentryUser(
  user: { id: string; email?: string } | null,
): void {
  loadSentry()?.setUser(user);
}
