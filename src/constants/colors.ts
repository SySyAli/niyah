// NIYAH Color System - Dark, deep earth tones
// Rich, grounded, premium feel — dark greens, deep blues, clay reds

export const Colors = {
  // Backgrounds - Deep, dark earth tones
  background: "#1A1714", // Very dark warm brown (almost black)
  backgroundElevated: "#252019", // Slightly lighter dark brown
  backgroundCard: "#2E2820", // Card surface — dark clay
  backgroundSecondary: "#3A3228", // Secondary surface — warm dark
  backgroundTertiary: "#4A4035", // Tertiary — muted earth

  // Primary brand color - Deep forest green
  primary: "#2D6A4F", // Deep forest green
  primaryDark: "#1B4332", // Darker green
  primaryLight: "#40916C", // Lighter forest green
  primaryMuted: "rgba(45, 106, 79, 0.25)",

  // Accent colors - Deep earth palette
  accent: "#5C415D", // Deep plum/mauve
  accentBlue: "#1B3A4B", // Deep ocean blue
  accentClay: "#8B2500", // Deep clay red
  accentGold: "#B8860B", // Dark goldenrod

  // Text hierarchy - Light for contrast on dark bg
  text: "#F2EDE4", // Warm off-white
  textPrimary: "#F2EDE4", // Warm off-white
  textSecondary: "#C4BAA8", // Muted sand
  textTertiary: "#9A8E7A", // Dim earth
  textMuted: "#6B6156", // Very dim

  // Money colors (critical for financial UI)
  gain: "#40916C", // Forest green (positive)
  gainLight: "rgba(64, 145, 108, 0.20)",
  loss: "#8B2500", // Deep clay red (negative)
  lossLight: "rgba(139, 37, 0, 0.20)",

  // Status colors
  success: "#40916C", // Forest green
  warning: "#B8860B", // Dark goldenrod
  warningLight: "rgba(184, 134, 11, 0.20)",
  danger: "#8B2500", // Deep clay red
  dangerLight: "rgba(139, 37, 0, 0.20)",
  info: "#1B3A4B", // Deep ocean blue
  infoLight: "rgba(27, 58, 75, 0.20)",

  // Interactive elements
  buttonPrimary: "#2D6A4F", // Deep forest green
  buttonSecondary: "#3A3228", // Warm dark
  buttonDisabled: "#4A4035", // Muted earth

  // Borders - subtle dividers on dark
  border: "#4A4035", // Warm dark border
  borderLight: "#3A3228", // Subtle border
  borderFocused: "#40916C", // Forest green focus

  // Overlays
  overlay: "rgba(0, 0, 0, 0.6)",
  overlayLight: "rgba(0, 0, 0, 0.4)",

  // Special
  shimmer: "#3A3228",
  skeleton: "#2E2820",

  // White (for use on primary-colored buttons etc.)
  white: "#FFFFFF",
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

// Font weights - bolder across the board
// SF Pro Rounded on iOS, Roboto on Android (falls back to fontWeight)
export const FontWeight = {
  regular: "500" as const, // Medium (was 400)
  medium: "600" as const, // Semibold (was 500)
  semibold: "700" as const, // Bold (was 600)
  bold: "800" as const, // Heavy (was 700)
  heavy: "900" as const, // Black (was 800)
} as const;

// SF Pro Rounded font family
// "ui-rounded" is supported natively by React Native on iOS and resolves to
// SF Pro Rounded at whatever fontWeight is set. No per-weight PostScript names needed.
import { Platform } from "react-native";

const ROUNDED = Platform.OS === "ios" ? "ui-rounded" : undefined;

export const Font = {
  regular: { fontFamily: ROUNDED, fontWeight: "500" as const },
  medium: { fontFamily: ROUNDED, fontWeight: "600" as const },
  semibold: { fontFamily: ROUNDED, fontWeight: "700" as const },
  bold: { fontFamily: ROUNDED, fontWeight: "800" as const },
  heavy: { fontFamily: ROUNDED, fontWeight: "900" as const },
} as const;

// Base font family for body text (no explicit weight)
export const BaseFontFamily = ROUNDED;

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
