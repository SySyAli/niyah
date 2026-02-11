import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
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
import Svg, { Path } from "react-native-svg";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  FontWeight,
} from "../../src/constants/colors";
import { ContinuousScene } from "../../src/components/onboarding";
import { AppleSignInButton } from "../../src/components/AppleSignInButton";

// --- Page data ---

const PAGES = [
  {
    title: "Welcome to\nNiyah",
    subtitle:
      "Put real money on the line to build\nfocus habits that actually stick.",
    hint: "Swipe to explore",
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

// Warm beige palette that blends seamlessly between pages
const BG_COLORS = ["#1A1714", "#1E1B16", "#221F19", "#252019"];

// --- Sub-components ---

const AnimatedPageText: React.FC<{
  page: (typeof PAGES)[number];
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}> = ({ page, index, scrollX, pageWidth }) => {
  const style = useAnimatedStyle(() => {
    const input = [
      (index - 1) * pageWidth,
      index * pageWidth,
      (index + 1) * pageWidth,
    ];
    return {
      opacity: interpolate(
        scrollX.value,
        input,
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            input,
            [30, 0, -30],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            scrollX.value,
            input,
            [6, 0, 6],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.textBlock, style]}>
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

// Google "G" icon
const GoogleIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

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

  const illustrationSize = Math.min(width * 0.88, height * 0.4);

  const handleAuthSuccess = () => {
    router.replace("/(tabs)");
  };

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <StatusBar style="dark" />

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

          {/* Continuous scene - single evolving illustration */}
          <View style={styles.sceneArea} pointerEvents="none">
            <ContinuousScene
              scrollX={scrollX}
              pageWidth={width}
              size={illustrationSize}
            />
          </View>

          {/* Invisible scroll capture - sits on top, captures swipe gestures */}
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

          {/* Get Started button */}
          <Pressable
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.getStartedPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(auth)/signup");
            }}
          >
            <Text style={styles.getStartedText}>Get started</Text>
          </Pressable>

          {/* OR divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social auth icons */}
          <View style={styles.socialRow}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
              onPress={async () => {
                try {
                  const { signInWithGoogle } = await import(
                    "../../src/config/firebase"
                  );
                  const { useAuthStore } = await import(
                    "../../src/store/authStore"
                  );
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const accessToken = await signInWithGoogle();
                  await useAuthStore.getState().loginWithGoogle(accessToken);
                  handleAuthSuccess();
                } catch (error: any) {
                  if (error?.code !== "SIGN_IN_CANCELLED") {
                    console.error("Google sign-in error:", error);
                  }
                }
              }}
            >
              <GoogleIcon />
            </Pressable>

            {Platform.OS === "ios" && (
              <AppleSignInButton compact onSuccess={handleAuthSuccess} />
            )}
          </View>

          {/* Sign in link */}
          <View style={styles.signInRow}>
            <Text style={styles.signInText}>I already have an account. </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(auth)/login");
              }}
            >
              <Text style={styles.signInLink}>Sign in</Text>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    height: 160,
    zIndex: 2,
  },
  textBlock: {
    position: "absolute",
    top: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  title: {
    fontSize: Typography.displaySmall,
    fontWeight: FontWeight.heavy,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: Typography.displaySmall * 1.1,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: Typography.bodyLarge * 1.5,
  },
  hint: {
    fontSize: Typography.bodySmall,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    letterSpacing: 0.3,
  },
  sceneArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
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
  getStartedButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  getStartedText: {
    fontSize: Typography.bodyLarge,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.labelSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  socialButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing.xs,
  },
  signInText: {
    fontSize: Typography.bodySmall,
    color: Colors.textTertiary,
  },
  signInLink: {
    fontSize: Typography.bodySmall,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
});
