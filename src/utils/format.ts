/**
 * Format cents to dollar string
 */
export const formatMoney = (
  cents: number,
  showCents: boolean = true,
): string => {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(dollars);
};

/**
 * Format cents to compact string (e.g., $1.2K, $10M)
 */
export const formatMoneyCompact = (cents: number): string => {
  const dollars = cents / 100;
  if (dollars >= 1000000) {
    return `$${(dollars / 1000000).toFixed(1)}M`;
  }
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}K`;
  }
  return formatMoney(cents, false);
};

/**
 * Format milliseconds to time string (HH:MM:SS or MM:SS)
 */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Format time remaining in human-readable form
 */
export const formatTimeRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  }
  return `${seconds}s remaining`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(date);
};

/**
 * Calculate streak multiplier
 */
export const getStreakMultiplier = (
  streak: number,
  cadence: "daily" | "weekly" | "monthly",
): number => {
  if (cadence === "daily") {
    if (streak >= 10) return 1.5;
    if (streak >= 5) return 1.25;
  } else if (cadence === "weekly") {
    if (streak >= 8) return 2.0;
    if (streak >= 4) return 1.5;
  } else if (cadence === "monthly") {
    if (streak >= 6) return 3.0;
    if (streak >= 3) return 2.0;
  }
  return 1.0;
};

/**
 * Format percentage
 */
export const formatPercentage = (
  value: number,
  decimals: number = 0,
): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format multiplier (e.g., 2.5x)
 */
export const formatMultiplier = (value: number): string => {
  return `${value.toFixed(1)}x`;
};
