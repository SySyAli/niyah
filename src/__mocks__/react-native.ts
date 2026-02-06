/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { vi } from "vitest";

// Helper: create a simple mock component that renders its children
const mockComponent = (name: string) => {
  const Component = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement(name, { ...props, ref }, children),
  );
  Component.displayName = name;
  return Component;
};

const AnimatedValue = vi.fn(() => ({
  interpolate: vi.fn(() => ({})),
  setValue: vi.fn(),
}));

const createAnimationFn = () =>
  vi.fn(() => ({
    start: vi.fn((cb?: () => void) => cb?.()),
  }));

export const Platform = {
  OS: "ios",
  select: vi.fn((obj: Record<string, unknown>) => obj.ios ?? obj.default),
};

export const StyleSheet = {
  create: vi.fn(<T extends Record<string, unknown>>(styles: T) => styles),
  flatten: vi.fn(<T>(style: T) => style),
};

export const View = mockComponent("View");
export const Text = mockComponent("Text");
export const Pressable = mockComponent("Pressable");
export const ActivityIndicator = mockComponent("ActivityIndicator");
export const ScrollView = mockComponent("ScrollView");
export const FlatList = mockComponent("FlatList");
export const TextInput = mockComponent("TextInput");
export const Image = mockComponent("Image");
export const TouchableOpacity = mockComponent("TouchableOpacity");

export const Animated = {
  View: mockComponent("AnimatedView"),
  Text: mockComponent("AnimatedText"),
  Image: mockComponent("AnimatedImage"),
  Value: AnimatedValue,
  timing: createAnimationFn(),
  spring: createAnimationFn(),
  parallel: createAnimationFn(),
  // sequence doesn't auto-call the callback to prevent infinite recursion
  // in components that use recursive animation patterns (e.g., cursor blink)
  sequence: vi.fn(() => ({
    start: vi.fn(),
  })),
  loop: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createAnimatedComponent: vi.fn((comp: any) => comp),
};

export const Dimensions = {
  get: vi.fn(() => ({ width: 375, height: 812 })),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
};

export const useWindowDimensions = vi.fn(() => ({ width: 375, height: 812 }));
export const useColorScheme = vi.fn(() => "light");
export const NativeModules = {};
export const PixelRatio = {
  get: vi.fn(() => 2),
  getFontScale: vi.fn(() => 1),
  getPixelSizeForLayoutSize: vi.fn((size: number) => size * 2),
  roundToNearestPixel: vi.fn((size: number) => size),
};
export const AppState = {
  currentState: "active",
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
};
export const Linking = {
  openURL: vi.fn(),
  canOpenURL: vi.fn(() => Promise.resolve(true)),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
};
export const Alert = {
  alert: vi.fn(),
};

export default {
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TextInput,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  useWindowDimensions,
  useColorScheme,
  NativeModules,
  PixelRatio,
  AppState,
  Linking,
  Alert,
};
