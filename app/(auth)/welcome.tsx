import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  interpolateColor,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  FontWeight,
} from "../../src/constants/colors";
import { ContinuousScene, StonesScene } from "../../src/components/onboarding";

// --- Page data ---

const PAGES = [
  {
    title: "Welcome to\nNiyah",
    subtitle:
      "Tie screen-time limits with money,\nand earn more if you stick to them.",
    hint: "Swipe to learn more \u2794",
  },
  {
    title: "Stake Your\nFocus",
    subtitle:
      "Commit real dollars to each session.\nWhen Instagram costs $5, you stay focused.",
  },
  {
    title: "Block\nDistractions",
    subtitle:
      "Distracting apps are locked during\nyour session. No willpower needed.",
  },
  {
    title: "Grow Your\nWealth",
    subtitle:
      "Complete sessions to earn payouts.\nBuild streaks for bonus multipliers.",
  },
];

// Dark green palette — page 0 matches Figma (#1B4332)
const BG_COLORS = ["#1B4332", "#1E1B16", "#221F19", "#252019"];

// --- Sub-components ---

const AnimatedPageText: React.FC<{
  page: (typeof PAGES)[number];
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}> = ({ page, index, scrollX, pageWidth }) => {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: index * pageWidth - scrollX.value }],
  }));

  return (
    <Animated.View style={[styles.textBlock, { width: pageWidth }, style]}>
      <Text style={styles.title}>{page.title}</Text>
      <Text style={styles.subtitle}>{page.subtitle}</Text>
      {page.hint && <Text style={styles.hint}>{page.hint}</Text>}
    </Animated.View>
  );
};

const AnimatedDot: React.FC<{
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}> = ({ index, scrollX, pageWidth }) => {
  const style = useAnimatedStyle(() => {
    const input = [
      (index - 1) * pageWidth,
      index * pageWidth,
      (index + 1) * pageWidth,
    ];
    return {
      width: interpolate(scrollX.value, input, [6, 28, 6], Extrapolation.CLAMP),
      opacity: interpolate(
        scrollX.value,
        input,
        [0.25, 1, 0.25],
        Extrapolation.CLAMP,
      ),
      backgroundColor: interpolateColor(scrollX.value, input, [
        "rgba(242, 237, 228, 0.2)",
        "rgba(242, 237, 228, 0.65)",
        "rgba(242, 237, 228, 0.2)",
      ]),
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
};

// --- Main Screen ---

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const lastPage = useRef(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newPage = Math.round(event.nativeEvent.contentOffset.x / width);
      if (newPage !== lastPage.current) {
        lastPage.current = newPage;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [width],
  );

  // Animated background color
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      PAGES.map((_, i) => i * width),
      BG_COLORS,
    ),
  }));

  const illustrationSize = Math.min(width * 1.05, height * 0.52);

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <StatusBar style="light" />

      {/* Soft gradient wash */}
      <LinearGradient
        colors={[
          "rgba(0, 0, 0, 0.12)",
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, 0.06)",
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* === Main swipeable area === */}
        <View style={styles.mainArea}>
          {/* Text overlays - stacked, only one visible at a time */}
          <View style={styles.textArea} pointerEvents="none">
            {PAGES.map((page, i) => (
              <AnimatedPageText
                key={i}
                page={page}
                index={i}
                scrollX={scrollX}
                pageWidth={width}
              />
            ))}
          </View>

          {/* Continuous scene — Stages 1-3 illustrations (non-interactive) */}
          <View style={styles.sceneArea} pointerEvents="none">
            <ContinuousScene
              scrollX={scrollX}
              pageWidth={width}
              size={illustrationSize}
            />
          </View>

          {/* Invisible scroll capture — captures swipe gestures */}
          <Animated.ScrollView
            style={StyleSheet.absoluteFill}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            bounces={false}
            decelerationRate="fast"
            overScrollMode="never"
            onMomentumScrollEnd={handleMomentumEnd}
          >
            {PAGES.map((_, i) => (
              <View key={i} style={{ width }} />
            ))}
          </Animated.ScrollView>

          {/* Interactive stones layer — ABOVE ScrollView so taps reach Pressables.
              pointerEvents="box-none" lets swipes pass through to ScrollView. */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Spacer matching textArea height */}
            <View style={{ height: 160 }} pointerEvents="none" />
            {/* Center stones in the remaining space (mirrors sceneArea layout) */}
            <View style={styles.stonesOverlay} pointerEvents="box-none">
              <StonesScene
                scrollX={scrollX}
                pageWidth={width}
                size={illustrationSize}
              />
            </View>
          </View>
        </View>

        {/* === Bottom section === */}
        <View style={styles.bottomSection}>
          {/* Pagination dots */}
          <View style={styles.dotsContainer}>
            {PAGES.map((_, i) => (
              <AnimatedDot
                key={i}
                index={i}
                scrollX={scrollX}
                pageWidth={width}
              />
            ))}
          </View>

          {/* Auth buttons — Log in (outline) + Sign up (filled) */}
          <View style={styles.authRow}>
            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.authButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(auth)/login");
              }}
            >
              <Text style={styles.loginButtonText}>Log in</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.signupButton,
                pressed && styles.authButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(auth)/signup");
              }}
            >
              <Text style={styles.signupButtonText}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
  },
  textArea: {
    paddingTop: Spacing.xl,
    height: 160,
    zIndex: 2,
  },
  textBlock: {
    position: "absolute",
    top: Spacing.xl,
    left: 0,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  title: {
    fontSize: Typography.displaySmall,
    fontWeight: FontWeight.heavy,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: Typography.displaySmall * 1.1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: Typography.bodyLarge * 1.5,
    textAlign: "center",
  },
  hint: {
    fontSize: Typography.bodySmall,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  sceneArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  stonesOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  authRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  loginButton: {
    flex: 1,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.white,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: Typography.bodyMedium,
    fontWeight: FontWeight.medium,
    color: Colors.white,
  },
  signupButton: {
    flex: 1,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  signupButtonText: {
    fontSize: Typography.bodyMedium,
    fontWeight: FontWeight.medium,
    color: "#000000",
  },
  authButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
