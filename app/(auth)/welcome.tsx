import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  interpolateColor,
  Extrapolation,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import {
  GardenScene,
  StakeScene,
  ShieldScene,
  GrowthScene,
} from "../../src/components/onboarding";
import { AppleSignInButton } from "../../src/components/AppleSignInButton";

// --- Page data ---

const PAGES = [
  {
    title: "Welcome to\nNiyah",
    subtitle:
      "Put real money on the line to build\nfocus habits that actually stick.",
    hint: "Swipe to learn more \u2192",
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

const BG_COLORS = ["#F2EFE8", "#EDE9DF", "#E6E2D6", "#DDD9CE"];

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
            [pageWidth * 0.25, 0, -pageWidth * 0.25],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.textContainer, style]}>
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
      width: interpolate(scrollX.value, input, [8, 24, 8], Extrapolation.CLAMP),
      opacity: interpolate(
        scrollX.value,
        input,
        [0.3, 1, 0.3],
        Extrapolation.CLAMP,
      ),
      backgroundColor: interpolateColor(scrollX.value, input, [
        Colors.textMuted,
        Colors.text,
        Colors.textMuted,
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

// Apple icon
const AppleIcon = () => (
  <Svg width={20} height={24} viewBox="0 0 17 20" fill={Colors.text}>
    <Path d="M13.26 10.04c-.02-2.15 1.76-3.19 1.84-3.24-1-1.47-2.56-1.67-3.12-1.7-1.33-.13-2.59.78-3.26.78-.67 0-1.72-.76-2.82-.74-1.45.02-2.79.85-3.54 2.15-1.51 2.62-.39 6.51 1.08 8.64.72 1.04 1.58 2.21 2.7 2.17 1.09-.04 1.5-.7 2.81-.7 1.32 0 1.69.7 2.82.68 1.17-.02 1.9-1.06 2.61-2.1.82-1.2 1.16-2.37 1.18-2.43-.03-.01-2.27-.87-2.29-3.46v-.05zM11.1 3.55c.6-.72 1-1.73.89-2.73-.86.04-1.9.57-2.52 1.3-.55.64-1.03 1.66-.9 2.64.96.07 1.93-.49 2.53-1.21z" />
  </Svg>
);

// --- Main Screen ---

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const lastPage = useSharedValue(0);

  const hapticFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const currentPage = Math.round(event.contentOffset.x / width);
      if (currentPage !== lastPage.value) {
        lastPage.value = currentPage;
        runOnJS(hapticFeedback)();
      }
    },
  });

  // Animated background color
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      PAGES.map((_, i) => i * width),
      BG_COLORS,
    ),
  }));

  const illustrationSize = Math.min(width * 0.85, height * 0.42);

  const handleAuthSuccess = () => {
    router.replace("/(tabs)");
  };

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {/* Scrollable pages */}
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {PAGES.map((page, index) => (
            <View key={index} style={[styles.page, { width }]}>
              <AnimatedPageText
                page={page}
                index={index}
                scrollX={scrollX}
                pageWidth={width}
              />
              <View style={styles.illustrationContainer}>
                {index === 0 && (
                  <GardenScene
                    scrollX={scrollX}
                    pageIndex={0}
                    pageWidth={width}
                    size={illustrationSize}
                  />
                )}
                {index === 1 && (
                  <StakeScene
                    scrollX={scrollX}
                    pageIndex={1}
                    pageWidth={width}
                    size={illustrationSize}
                  />
                )}
                {index === 2 && (
                  <ShieldScene
                    scrollX={scrollX}
                    pageIndex={2}
                    pageWidth={width}
                    size={illustrationSize}
                  />
                )}
                {index === 3 && (
                  <GrowthScene
                    scrollX={scrollX}
                    pageIndex={3}
                    pageWidth={width}
                    size={illustrationSize}
                  />
                )}
              </View>
            </View>
          ))}
        </Animated.ScrollView>

        {/* Fixed bottom section */}
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

          {/* Social auth icons (Coinbase-style circles) */}
          <View style={styles.socialRow}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
              onPress={async () => {
                // Google Sign-In uses the native SDK so we import it directly
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
                  // Silently handle user cancellations
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  textContainer: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.displaySmall,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: Typography.displaySmall * 1.1,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: Typography.bodyLarge * 1.45,
  },
  hint: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
  },
  illustrationContainer: {
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
    height: 8,
    borderRadius: 4,
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
    fontWeight: "700",
    color: "#FFFFFF",
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
    fontSize: Typography.labelMedium,
    fontWeight: "600",
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textSecondary,
  },
  signInLink: {
    fontSize: Typography.bodySmall,
    fontWeight: "700",
    color: Colors.text,
  },
});
