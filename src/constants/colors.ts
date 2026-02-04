// NIYAH Color System - Inspired by Robinhood/Kalshi
// Clean, minimal, professional fintech aesthetic

export const Colors = {
  // Backgrounds - Deep, clean blacks
  background: "#000000",
  backgroundElevated: "#0D0D0D",
  backgroundCard: "#161616",
  backgroundSecondary: "#1C1C1E",
  backgroundTertiary: "#2C2C2E",

  // Primary brand color - Vibrant green (money/success)
  primary: "#00D632",
  primaryDark: "#00B52B",
  primaryLight: "#33E05C",
  primaryMuted: "rgba(0, 214, 50, 0.15)",

  // Text hierarchy
  text: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "#8E8E93",
  textTertiary: "#636366",
  textMuted: "#48484A",

  // Money colors (critical for financial UI)
  gain: "#00D632",
  gainLight: "rgba(0, 214, 50, 0.12)",
  loss: "#FF3B30",
  lossLight: "rgba(255, 59, 48, 0.12)",

  // Status colors
  success: "#00D632",
  warning: "#FF9500",
  warningLight: "rgba(255, 149, 0, 0.12)",
  danger: "#FF3B30",
  dangerLight: "rgba(255, 59, 48, 0.12)",
  info: "#007AFF",
  infoLight: "rgba(0, 122, 255, 0.12)",

  // Interactive elements
  buttonPrimary: "#00D632",
  buttonSecondary: "#1C1C1E",
  buttonDisabled: "#2C2C2E",

  // Borders - subtle dividers
  border: "#2C2C2E",
  borderLight: "#3A3A3C",
  borderFocused: "#00D632",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.6)",
  overlayLight: "rgba(0, 0, 0, 0.4)",

  // Special
  shimmer: "#2C2C2E",
  skeleton: "#1C1C1E",
} as const;

// Spacing system (8px grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Typography sizes
export const Typography = {
  // Display
  displayLarge: 56,
  displayMedium: 44,
  displaySmall: 36,

  // Headlines
  headlineLarge: 32,
  headlineMedium: 28,
  headlineSmall: 24,

  // Titles
  titleLarge: 22,
  titleMedium: 18,
  titleSmall: 16,

  // Body
  bodyLarge: 17,
  bodyMedium: 15,
  bodySmall: 13,

  // Labels
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 11,
} as const;

// Border radius
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type ColorName = keyof typeof Colors;
