import React, { useEffect, useMemo } from "react";
import { View, Pressable, StyleSheet, Platform, Text } from "react-native";
import { SymbolView } from "expo-symbols";
import type { SFSymbol } from "sf-symbols-typescript";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Typography, Spacing, FontWeight, Font } from "../constants/colors";
import { useColors } from "../hooks/useColors";
import { useScrollContext } from "../context/ScrollContext";

// ────────────────────────────────────────────────────────────────────
// Tab configuration
// ────────────────────────────────────────────────────────────────────

interface TabConfig {
  key: string;
  label: string;
  sfSymbolFocused: SFSymbol;
  sfSymbolDefault: SFSymbol;
  // Fallback for Android
  ionIconFocused: keyof typeof Ionicons.glyphMap;
  ionIconDefault: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  {
    key: "index",
    label: "Home",
    sfSymbolFocused: "house.fill",
    sfSymbolDefault: "house",
    ionIconFocused: "home",
    ionIconDefault: "home-outline",
  },
  {
    key: "session",
    label: "Focus",
    sfSymbolFocused: "timer",
    sfSymbolDefault: "timer",
    ionIconFocused: "timer",
    ionIconDefault: "timer-outline",
  },
  {
    key: "friends",
    label: "Friends",
    sfSymbolFocused: "person.2.fill",
    sfSymbolDefault: "person.2",
    ionIconFocused: "people",
    ionIconDefault: "people-outline",
  },
  {
    key: "profile",
    label: "Profile",
    sfSymbolFocused: "person.fill",
    sfSymbolDefault: "person",
    ionIconFocused: "person",
    ionIconDefault: "person-outline",
  },
];

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

const TAB_BAR_HEIGHT = 85;
const LABEL_HEIGHT = 20;
const ICON_SIZE = 24;
const PILL_WIDTH = 64;
const PILL_HEIGHT = 36;
const SCROLL_DOWN_THRESHOLD = 50;

// ────────────────────────────────────────────────────────────────────
// Types – use `any` for the navigation props to avoid dependency
// on @react-navigation/bottom-tabs types which may not be hoisted.
// ────────────────────────────────────────────────────────────────────

interface AnimatedTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, { options: Record<string, unknown> }>;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
  accessory?: React.ReactNode;
  [key: string]: unknown; // accept extra props from Expo Router
}

// ────────────────────────────────────────────────────────────────────
// Tab Icon — SF Symbols on iOS, Ionicons fallback on Android
// ────────────────────────────────────────────────────────────────────

const TabIcon: React.FC<{
  config: TabConfig;
  focused: boolean;
  color: string;
}> = ({ config, focused, color }) => {
  if (Platform.OS === "ios") {
    const symbolName = focused
      ? config.sfSymbolFocused
      : config.sfSymbolDefault;
    return (
      <SymbolView
        name={symbolName}
        tintColor={color}
        size={ICON_SIZE}
        weight={focused ? "semibold" : "regular"}
      />
    );
  }

  // Android fallback
  const iconName = focused ? config.ionIconFocused : config.ionIconDefault;
  return <Ionicons name={iconName} size={ICON_SIZE} color={color} />;
};

// ────────────────────────────────────────────────────────────────────
// Individual tab item
// ────────────────────────────────────────────────────────────────────

interface TabItemProps {
  config: TabConfig;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  minimized: SharedValue<number>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TabItem: React.FC<TabItemProps> = ({
  config,
  focused,
  onPress,
  onLongPress,
  minimized,
}) => {
  const Colors = useColors();
  const scale = useSharedValue(1);
  const pillOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    pillOpacity.value = withTiming(focused ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused, pillOpacity]);

  const handlePress = () => {
    // Bounce animation – kick off from scaled-up, spring back to 1
    scale.value = 1.15;
    scale.value = withSpring(1, { damping: 6, stiffness: 300 });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: interpolate(pillOpacity.value, [0, 1], [0.8, 1]) }],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(minimized.value, [0, 1], [1, 0]),
    maxHeight: interpolate(minimized.value, [0, 1], [LABEL_HEIGHT, 0]),
    marginTop: interpolate(minimized.value, [0, 1], [2, 0]),
  }));

  const color = focused ? Colors.primaryLight : Colors.textMuted;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabItem: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        iconContainer: {
          width: PILL_WIDTH,
          height: PILL_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
        },
        pill: {
          position: "absolute",
          width: PILL_WIDTH,
          height: PILL_HEIGHT,
          borderRadius: PILL_HEIGHT / 2,
          backgroundColor: Colors.primaryMuted,
        },
        label: {
          fontSize: Typography.labelSmall,
          ...Font.semibold,
          marginTop: 2,
        },
      }),
    [Colors],
  );

  return (
    <AnimatedPressable
      style={styles.tabItem}
      onPress={handlePress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={config.label}
    >
      <View style={styles.iconContainer}>
        {/* Active pill background */}
        <Animated.View style={[styles.pill, pillAnimatedStyle]} />

        {/* Icon */}
        <Animated.View style={iconAnimatedStyle}>
          <TabIcon config={config} focused={focused} color={color} />
        </Animated.View>
      </View>

      {/* Label */}
      <Animated.Text
        style={[styles.label, { color }, labelAnimatedStyle]}
        numberOfLines={1}
      >
        {config.label}
      </Animated.Text>
    </AnimatedPressable>
  );
};

// ────────────────────────────────────────────────────────────────────
// Animated tab bar
// ────────────────────────────────────────────────────────────────────

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  state,
  descriptors,
  navigation,
  accessory,
}) => {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const { scrollY } = useScrollContext();

  // Track whether the tab bar should be minimized
  const minimized = useDerivedValue<number>(() => {
    const target: number = scrollY.value > SCROLL_DOWN_THRESHOLD ? 1 : 0;
    return withTiming(target, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  });

  // Slide the whole bar down slightly when minimized (hide label area)
  const barAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(minimized.value, [0, 1], [0, LABEL_HEIGHT]),
      },
    ],
  }));

  // Accessory visibility
  const accessoryVisible = useSharedValue(accessory ? 1 : 0);

  useEffect(() => {
    accessoryVisible.value = withSpring(accessory ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [accessory, accessoryVisible]);

  const accessoryAnimatedStyle = useAnimatedStyle(() => ({
    opacity: accessoryVisible.value,
    transform: [
      {
        translateY: interpolate(accessoryVisible.value, [0, 1], [40, 0]),
      },
    ],
  }));

  // Active indicator position (for potential future sliding indicator)
  const activeIndex = useSharedValue(state.index);

  useEffect(() => {
    activeIndex.value = withTiming(state.index, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [state.index, activeIndex]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: "relative",
        },
        accessoryContainer: {
          backgroundColor: Colors.backgroundCard,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
        },
        tabBar: {
          flexDirection: "row",
          backgroundColor: Colors.backgroundElevated,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT,
          paddingTop: Spacing.sm,
          alignItems: "flex-start",
          justifyContent: "space-around",
        },
      }),
    [Colors],
  );

  return (
    <View style={styles.wrapper}>
      {/* Accessory slot */}
      {accessory && (
        <Animated.View
          style={[styles.accessoryContainer, accessoryAnimatedStyle]}
        >
          {accessory}
        </Animated.View>
      )}

      {/* Tab bar */}
      <Animated.View
        style={[
          styles.tabBar,
          { paddingBottom: Math.max(insets.bottom, 20) },
          barAnimatedStyle,
        ]}
      >
        {state.routes.map((route, index) => {
          const tabConfig = TABS[index];
          if (!tabConfig) return null;

          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              config={tabConfig}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              minimized={minimized}
            />
          );
        })}
      </Animated.View>
    </View>
  );
};
