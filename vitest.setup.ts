/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// REACT NATIVE MOCKS
// ============================================================================

// Mock react-native
vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
    select: vi.fn((obj: Record<string, unknown>) => obj.ios ?? obj.default),
  },
  StyleSheet: {
    create: vi.fn(<T extends Record<string, unknown>>(styles: T) => styles),
    flatten: vi.fn(<T>(style: T) => style),
  },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  Animated: {
    View: "Animated.View",
    Text: "Animated.Text",
    Value: vi.fn(() => ({
      interpolate: vi.fn(() => ({})),
      setValue: vi.fn(),
    })),
    timing: vi.fn(() => ({
      start: vi.fn((cb?: () => void) => cb?.()),
    })),
    spring: vi.fn(() => ({
      start: vi.fn((cb?: () => void) => cb?.()),
    })),
    parallel: vi.fn(() => ({
      start: vi.fn((cb?: () => void) => cb?.()),
    })),
    sequence: vi.fn(() => ({
      start: vi.fn((cb?: () => void) => cb?.()),
    })),
    loop: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    })),
  },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 812 })),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  useWindowDimensions: vi.fn(() => ({ width: 375, height: 812 })),
  useColorScheme: vi.fn(() => "light"),
  NativeModules: {},
}));

// Mock react-native-svg
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Svg: "Svg",
  Circle: "Circle",
  Rect: "Rect",
  Path: "Path",
  G: "G",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  Stop: "Stop",
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
