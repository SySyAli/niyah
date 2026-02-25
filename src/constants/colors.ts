// NIYAH Color System
// Rich, grounded, premium feel — dark greens, deep blues, clay reds
// Two themes: dark (deep earth tones) and light (warm cream tones)

import { Platform } from "react-native";

export const DarkColors = {
  // Backgrounds - Deep, dark earth tones
  background: "#1A1714",
  backgroundElevated: "#252019",
  backgroundCard: "#2E2820",
  backgroundSecondary: "#3A3228",
  backgroundTertiary: "#4A4035",

  // Primary brand color - Deep forest green
  primary: "#2D6A4F",
  primaryDark: "#1B4332",
  primaryLight: "#40916C",
  primaryMuted: "rgba(45, 106, 79, 0.25)",

  // Accent colors
  accent: "#5C415D",
  accentBlue: "#1B3A4B",
  accentClay: "#8B2500",
  accentGold: "#B8860B",

  // Text hierarchy - Light for contrast on dark bg
  text: "#F2EDE4",
  textPrimary: "#F2EDE4",
  textSecondary: "#C4BAA8",
  textTertiary: "#9A8E7A",
  textMuted: "#6B6156",

  // Money colors
  gain: "#40916C",
  gainLight: "rgba(64, 145, 108, 0.20)",
  loss: "#8B2500",
  lossLight: "rgba(139, 37, 0, 0.20)",

  // Status colors
  success: "#40916C",
  warning: "#B8860B",
  warningLight: "rgba(184, 134, 11, 0.20)",
  danger: "#8B2500",
  dangerLight: "rgba(139, 37, 0, 0.20)",
  info: "#1B3A4B",
  infoLight: "rgba(27, 58, 75, 0.20)",

  // Interactive elements
  buttonPrimary: "#2D6A4F",
  buttonSecondary: "#3A3228",
  buttonDisabled: "#4A4035",

  // Borders
  border: "#4A4035",
  borderLight: "#3A3228",
  borderFocused: "#40916C",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.6)",
  overlayLight: "rgba(0, 0, 0, 0.4)",

  // Special
  shimmer: "#3A3228",
  skeleton: "#2E2820",

  white: "#FFFFFF",
} as const;

export const LightColors = {
  // Backgrounds - Warm beige tones
  background: "#f5ead8ff",
  backgroundElevated: "#E8DDD0",
  backgroundCard: "#F5EFE6",
  backgroundSecondary: "#E3D9CB",
  backgroundTertiary: "#D9CEC0",

  // Primary brand color - Deep forest green (same, works on light)
  primary: "#2D6A4F",
  primaryDark: "#1B4332",
  primaryLight: "#40916C",
  primaryMuted: "rgba(45, 106, 79, 0.12)",

  // Accent colors
  accent: "#5C415D",
  accentBlue: "#1B3A4B",
  accentClay: "#8B2500",
  accentGold: "#B8860B",

  // Text hierarchy - Dark for contrast on light bg
  text: "#1A1714",
  textPrimary: "#1A1714",
  textSecondary: "#5A5248",
  textTertiary: "#8C7E70",
  textMuted: "#B5A899",

  // Money colors (same — semantically distinct)
  gain: "#2D6A4F",
  gainLight: "rgba(45, 106, 79, 0.12)",
  loss: "#8B2500",
  lossLight: "rgba(139, 37, 0, 0.12)",

  // Status colors
  success: "#2D6A4F",
  warning: "#B8860B",
  warningLight: "rgba(184, 134, 11, 0.12)",
  danger: "#8B2500",
  dangerLight: "rgba(139, 37, 0, 0.12)",
  info: "#1B3A4B",
  infoLight: "rgba(27, 58, 75, 0.12)",

  // Interactive elements
  buttonPrimary: "#2D6A4F",
  buttonSecondary: "#ECEAE3",
  buttonDisabled: "#D4CEC5",

  // Borders
  border: "#D4CFC5",
  borderLight: "#E3DED5",
  borderFocused: "#40916C",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.4)",
  overlayLight: "rgba(0, 0, 0, 0.25)",

  // Special
  shimmer: "#ECEAE3",
  skeleton: "#E3DFD7",

  white: "#FFFFFF",
} as const;

// Backward-compatible default export (dark theme)
export const Colors = DarkColors;

export type Theme = "dark" | "light";

// ThemeColors is a widened type so both DarkColors and LightColors satisfy it
export type ThemeColors = {
  readonly [K in keyof typeof DarkColors]: string;
};

export const ThemeColorMap = {
  dark: DarkColors as ThemeColors,
  light: LightColors as ThemeColors,
};

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
export const FontWeight = {
  regular: "500" as const,
  medium: "600" as const,
  semibold: "700" as const,
  bold: "800" as const,
  heavy: "900" as const,
} as const;

const ROUNDED = Platform.OS === "ios" ? "ui-rounded" : undefined;

export const Font = {
  regular: { fontFamily: ROUNDED, fontWeight: "500" as const },
  medium: { fontFamily: ROUNDED, fontWeight: "600" as const },
  semibold: { fontFamily: ROUNDED, fontWeight: "700" as const },
  bold: { fontFamily: ROUNDED, fontWeight: "800" as const },
  heavy: { fontFamily: ROUNDED, fontWeight: "900" as const },
} as const;

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

export type ColorName = keyof typeof DarkColors;
