// NIYAH Color System - Warm, earthy tones with green accent
// Clean, minimal, calming aesthetic

export const Colors = {
  // Backgrounds - Warm beige/tan tones
  background: "#C9C2B4",
  backgroundElevated: "#D4CEC1",
  backgroundCard: "#DED9CD",
  backgroundSecondary: "#E8E4DA",
  backgroundTertiary: "#F2EFE8",

  // Primary brand color - Natural green (growth/money)
  primary: "#7CB564",
  primaryDark: "#5A9A42",
  primaryLight: "#9BC887",
  primaryMuted: "rgba(124, 181, 100, 0.20)",

  // Text hierarchy - Dark for contrast on light bg
  text: "#1A1A1A",
  textPrimary: "#1A1A1A",
  textSecondary: "#4A4A4A",
  textTertiary: "#6B6B6B",
  textMuted: "#8C8C8C",

  // Money colors (critical for financial UI)
  gain: "#7CB564",
  gainLight: "rgba(124, 181, 100, 0.15)",
  loss: "#D64545",
  lossLight: "rgba(214, 69, 69, 0.15)",

  // Status colors
  success: "#7CB564",
  warning: "#E6A23C",
  warningLight: "rgba(230, 162, 60, 0.15)",
  danger: "#D64545",
  dangerLight: "rgba(214, 69, 69, 0.15)",
  info: "#5B8DEF",
  infoLight: "rgba(91, 141, 239, 0.15)",

  // Interactive elements
  buttonPrimary: "#7CB564",
  buttonSecondary: "#DED9CD",
  buttonDisabled: "#B8B2A5",

  // Borders - subtle dividers
  border: "#B8B2A5",
  borderLight: "#C9C2B4",
  borderFocused: "#7CB564",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",

  // Special
  shimmer: "#DED9CD",
  skeleton: "#D4CEC1",
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
