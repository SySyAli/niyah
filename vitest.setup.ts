import { vi, afterEach } from "vitest";
import React from "react";

// ============================================================================
// REACT NATIVE MOCKS
// ============================================================================

// react-native is mocked via resolve alias in vitest.config.ts
// pointing to src/__mocks__/react-native.ts

// Helper: create a simple mock component that renders its children
const mockComponent = (name: string) => {
  const Component = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement(name, { ...props, ref }, children),
  );
  Component.displayName = name;
  return Component;
};

// Mock react-native-svg
vi.mock("react-native-svg", () => ({
  default: mockComponent("Svg"),
  Svg: mockComponent("Svg"),
  Circle: mockComponent("Circle"),
  Rect: mockComponent("Rect"),
  Path: mockComponent("Path"),
  G: mockComponent("G"),
  Defs: mockComponent("Defs"),
  LinearGradient: mockComponent("LinearGradient"),
  Stop: mockComponent("Stop"),
}));

// Mock expo-haptics
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  ImpactFeedbackStyle: {
    Light: "Light",
    Medium: "Medium",
    Heavy: "Heavy",
  },
  NotificationFeedbackType: {
    Success: "Success",
    Warning: "Warning",
    Error: "Error",
  },
}));

// Mock expo-router
vi.mock("expo-router", () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    canGoBack: vi.fn(() => true),
  },
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    canGoBack: vi.fn(() => true),
  })),
  useLocalSearchParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => "/"),
  useSegments: vi.fn(() => []),
  Link: "Link",
  Stack: {
    Screen: "Screen",
  },
  Tabs: {
    Screen: "Screen",
  },
}));

// Mock expo-linear-gradient
vi.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock @react-native-async-storage/async-storage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

// Mock react-native-reanimated
vi.mock("react-native-reanimated", () => ({
  default: {
    createAnimatedComponent: vi.fn(<T>(c: T) => c),
    View: "Animated.View",
    Text: "Animated.Text",
    Image: "Animated.Image",
    ScrollView: "Animated.ScrollView",
  },
  useSharedValue: vi.fn(<T>(initial: T) => ({ value: initial })),
  useAnimatedStyle: vi.fn(() => ({})),
  withTiming: vi.fn(<T>(value: T) => value),
  withSpring: vi.fn(<T>(value: T) => value),
  withDelay: vi.fn(<T>(_: number, animation: T) => animation),
  withSequence: vi.fn(<T>(...animations: T[]) => animations[0]),
  withRepeat: vi.fn(<T>(animation: T) => animation),
  Easing: {
    linear: vi.fn(),
    ease: vi.fn(),
    bezier: vi.fn(),
  },
  runOnJS: vi.fn(<T extends (...args: any[]) => any>(fn: T) => fn),
  interpolate: vi.fn(),
  Extrapolation: {
    CLAMP: "clamp",
    EXTEND: "extend",
    IDENTITY: "identity",
  },
}));

// Mock react-native-gesture-handler
vi.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: "GestureHandlerRootView",
  Gesture: {
    Tap: vi.fn(() => ({ onEnd: vi.fn().mockReturnThis() })),
    Pan: vi.fn(() => ({
      onUpdate: vi.fn().mockReturnThis(),
      onEnd: vi.fn().mockReturnThis(),
    })),
  },
  GestureDetector: "GestureDetector",
  TapGestureHandler: "TapGestureHandler",
  PanGestureHandler: "PanGestureHandler",
  ScrollView: "ScrollView",
  FlatList: "FlatList",
}));

// Mock @react-native-google-signin/google-signin
vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: vi.fn(),
    hasPlayServices: vi.fn(() => Promise.resolve(true)),
    signIn: vi.fn(() =>
      Promise.resolve({ type: "success", data: { idToken: "mock-token" } }),
    ),
    signOut: vi.fn(() => Promise.resolve()),
    getTokens: vi.fn(() =>
      Promise.resolve({ accessToken: "mock-access-token", idToken: "mock-id" }),
    ),
    getCurrentUser: vi.fn(() => null),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
  isSuccessResponse: vi.fn(
    (response: { type?: string }) => response?.type === "success",
  ),
}));

// Mock react-native-safe-area-context
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: "SafeAreaProvider",
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: vi.fn(() => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  })),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Clear mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// ZUSTAND STORE RESET UTILITIES
// ============================================================================

/**
 * Helper to reset zustand stores between tests
 * @param store - The zustand store to reset
 * @param initialState - The initial state to reset to
 */
export const resetStore = <T extends object>(
  store: { setState: (state: Partial<T>) => void; getInitialState?: () => T },
  initialState: T,
): void => {
  store.setState(initialState);
};

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Wait for all pending promises to resolve
 */
export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Advance timers and flush promises
 */
export const advanceTimersAndFlush = async (ms: number): Promise<void> => {
  vi.advanceTimersByTime(ms);
  await flushPromises();
};
