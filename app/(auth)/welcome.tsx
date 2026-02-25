import React, { useCallback, useRef, useMemo } from "react";
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
import Svg, { Path } from "react-native-svg";
import {
  Typography,
  Spacing,
  Radius,
  FontWeight,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import {
  ContinuousScene,
  BlobsScene,
  Onboarding2Scene,
  Onboarding3Scene,
} from "../../src/components/onboarding";

// ── DEBUG: Set to true to enable drag-to-position mode on Onboarding3Scene ──
// Must match DEBUG_LAYOUT in Onboarding3Scene.tsx
const DEBUG_LAYOUT = false;

// --- Page data ---

const PAGES = [
  {
    title: "Welcome to\nNiyah",
    subtitle:
      "Tie screen-time limits with money,\nand earn more if you stick to them.",
    hint: "Swipe to learn more \u2794",
  },
  {
    title: "Take your focus\nto the next level",
    subtitle:
      "Block distracting apps and set limits.\nPut up real $$ to test your strength.",
  },
  {
    title: "Earn real f*ckin\nmoney.",
    subtitle:
      "Withdraw immediately once you hit your\ngoal. Only lose what you put in.",
  },
  {
    title: "Grow Your\nWealth",
    subtitle:
      "Complete sessions to earn payouts.\nBuild streaks for bonus multipliers.",
  },
];

// Dark green palette — pages 0-1 match Figma (#1B4332), then transition darker
const BG_COLORS = ["#1B4332", "#1B4332", "#1B4332", "#252019"];

// --- Niyah logo (brand mark shown on page 0) ---

const LOGO_STROKE = 1;

const NiyahLogo: React.FC<{ width?: number }> = ({ width: w = 86 }) => {
  const h = w * (27 / 86);
  return (
    <Svg width={w} height={h} viewBox="0 0 86 27" fill="none">
      {/* Outer outline + filled compound shape */}
      <Path
        d="M85.5 4.77763V12.063L85.2765 12.865L84.8294 13.5334L84.1588 14.0681L81.141 15.338V22.4897L80.9175 23.0244L79.7998 23.9601L77.0056 24.8959L71.1936 25.8316L64.5993 26.3663L49.1193 26.5L43.978 26.2326L37.3836 25.5643L33.1364 24.7622L30.454 23.6928L29.951 24.2275L28.6098 24.8959L23.5802 26.099L19.5565 26.5H12.3475L7.42966 25.9653L3.96482 25.1632L2.62361 24.6285L1.05886 23.5591L0.611775 22.7571L0.500003 22.0887V15.0707L0.83531 14.0013L1.72946 13.0656L2.40007 12.6645L5.08252 11.7288L8.6591 11.0604L11.621 10.7931L11.7886 10.5925V4.51028L12.0122 3.97558L12.4592 3.44087L13.9122 2.63882L16.8182 1.83676L20.8419 1.16838L27.1009 0.633676L38.1101 0.5L44.8162 0.901028L49.1752 1.43573L52.5283 2.10411L55.546 3.3072L56.6078 2.50514L57.9491 1.97044L61.9727 1.0347L67.5611 0.5H72.6466L78.235 1.0347L82.2587 1.97044L84.6059 3.17352L85.2765 3.97558L85.5 4.77763Z"
        fill="black"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      {/* Inner detail fills */}
      <Path
        d="M79.4086 17.3432L79.0733 17.2763L77.788 17.8111L75.3291 18.3458L69.07 19.1478L62.9227 19.5488L52.0253 19.6825L45.0957 19.4152L38.9484 18.8805L34.0306 18.0784L31.4599 17.2763L31.2922 17.4769V21.8213L33.807 22.8239L36.6012 23.3586L45.878 24.2943L55.6578 24.5617L62.1404 24.428L69.9642 23.8933L76.2232 22.9576L79.241 22.0219L79.4086 21.8213V17.3432Z"
        fill="#2D6A4F"
      />
      <Path
        d="M2.23242 17.7442V21.8213L2.51184 22.2892L4.63543 23.2249L8.3238 24.027L15.9241 24.5617L21.3448 24.2943L26.2627 23.4923L28.6098 22.6902L29.5598 21.955L29.504 17.6774L25.4803 18.8805L21.7919 19.4152L17.88 19.6825H13.9122L8.77088 19.2815L4.18837 18.3458L2.45596 17.5437L2.23242 17.7442Z"
        fill="#2D6A4F"
      />
      <Path
        d="M54.7078 7.31748L54.2607 7.25064L52.9753 7.78535L50.6282 8.32005L45.9339 8.98843L40.6808 9.38946L31.3481 9.52314L21.0654 8.85476L16.93 8.18638L13.5769 7.25064L13.521 10.5925L19.333 10.6594L23.4684 11.0604L27.3803 11.8625L29.1686 12.5308L30.6216 13.4666L31.4599 12.9319L33.6953 12.2635L39.619 11.3278L46.4369 10.7931L54.5401 10.6594L54.7078 10.4589V7.31748Z"
        fill="#2D6A4F"
      />
      <Path
        d="M56.4402 7.58483V10.4589L56.6078 10.6594L64.3757 10.7931L71.0819 11.3278L76.335 12.1298L78.4586 12.6645L79.8557 13.3329L81.8116 12.9319L82.8176 12.5308L83.7676 11.7956L83.7117 7.51799L79.688 8.72108L75.9997 9.25578L71.976 9.52314H68.12L62.9786 9.12211L58.3961 8.18638L56.6637 7.38432L56.4402 7.58483Z"
        fill="#2D6A4F"
      />
      {/* Highlighted faces */}
      <Path
        d="M78.738 15.0707L77.788 14.6028L74.7702 13.9344L66.6111 12.9987L61.358 12.7314H49.1193L42.4132 13.1324L37.6072 13.6671L33.36 14.4692L32.1305 14.8702L31.9629 15.2712L34.813 16.1401L41.7426 17.0758L48.0016 17.4769L58.2285 17.6105L65.4934 17.3432L71.6407 16.8085L77.1174 15.8728L78.4586 15.4717L78.738 15.0707Z"
        fill="#40916C"
      />
      <Path
        d="M29.3363 14.937L27.1568 13.9344L22.3508 12.9987L19.2212 12.7314H12.6828L9.4415 12.9987L5.64136 13.6671L2.73538 14.7365L2.45596 15.2712L3.07067 15.7391L4.85898 16.4075L8.10028 17.0758L11.6769 17.4769L17.6565 17.6105L21.7919 17.3432L25.3685 16.8085L28.7216 15.7391L29.3363 15.2712V14.937Z"
        fill="#40916C"
      />
      <Path
        d="M83.5441 4.77763L81.3646 3.77506L76.5585 2.83933L73.5408 2.57198H66.8905L62.6433 2.97301L59.2903 3.64139L56.9431 4.57712L56.6637 5.11182L57.2784 5.57969L59.0667 6.24807L62.308 6.91645L65.8846 7.31748L71.6407 7.45116L75.9997 7.1838L80.1351 6.51542L82.9293 5.57969L83.5441 5.11182V4.77763Z"
        fill="#40916C"
      />
      <Path
        d="M54.2607 4.91131L52.9753 4.30977L50.0694 3.64139L43.6986 2.83933L39.3396 2.57198H28.7774L22.9655 2.97301L18.0477 3.64139L14.1358 4.7108L13.9681 5.11182L17.0418 6.1144L22.4066 6.91645L27.7715 7.31748L36.4336 7.45116L42.6926 7.1838L48.0575 6.6491L52.3047 5.84704L53.8695 5.31234L54.2607 4.91131Z"
        fill="#40916C"
      />
      {/* Stroked outlines */}
      <Path
        d="M79.4086 17.3432L79.0733 17.2763L77.788 17.8111L75.3291 18.3458L69.07 19.1478L62.9227 19.5488L52.0253 19.6825L45.0957 19.4152L38.9484 18.8805L34.0306 18.0784L31.4599 17.2763L31.2922 17.4769V21.8213L33.807 22.8239L36.6012 23.3586L45.878 24.2943L55.6578 24.5617L62.1404 24.428L69.9642 23.8933L76.2232 22.9576L79.241 22.0219L79.4086 21.8213V17.3432Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M2.23242 17.7442V21.8213L2.51184 22.2892L4.63543 23.2249L8.3238 24.027L15.9241 24.5617L21.3448 24.2943L26.2627 23.4923L28.6098 22.6902L29.5598 21.955L29.504 17.6774L25.4803 18.8805L21.7919 19.4152L17.88 19.6825H13.9122L8.77088 19.2815L4.18837 18.3458L2.45596 17.5437L2.23242 17.7442Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M54.7078 7.31748L54.2607 7.25064L52.9753 7.78535L50.6282 8.32005L45.9339 8.98843L40.6808 9.38946L31.3481 9.52314L21.0654 8.85476L16.93 8.18638L13.5769 7.25064L13.521 10.5925L19.333 10.6594L23.4684 11.0604L27.3803 11.8625L29.1686 12.5308L30.6216 13.4666L31.4599 12.9319L33.6953 12.2635L39.619 11.3278L46.4369 10.7931L54.5401 10.6594L54.7078 10.4589V7.31748Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M56.4402 7.58483V10.4589L56.6078 10.6594L64.3757 10.7931L71.0819 11.3278L76.335 12.1298L78.4586 12.6645L79.8557 13.3329L81.8116 12.9319L82.8176 12.5308L83.7676 11.7956L83.7117 7.51799L79.688 8.72108L75.9997 9.25578L71.976 9.52314H68.12L62.9786 9.12211L58.3961 8.18638L56.6637 7.38432L56.4402 7.58483Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M78.738 15.0707L77.788 14.6028L74.7702 13.9344L66.6111 12.9987L61.358 12.7314H49.1193L42.4132 13.1324L37.6072 13.6671L33.36 14.4692L32.1305 14.8702L31.9629 15.2712L34.813 16.1401L41.7426 17.0758L48.0016 17.4769L58.2285 17.6105L65.4934 17.3432L71.6407 16.8085L77.1174 15.8728L78.4586 15.4717L78.738 15.0707Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M29.3363 14.937L27.1568 13.9344L22.3508 12.9987L19.2212 12.7314H12.6828L9.4415 12.9987L5.64136 13.6671L2.73538 14.7365L2.45596 15.2712L3.07067 15.7391L4.85898 16.4075L8.10028 17.0758L11.6769 17.4769L17.6565 17.6105L21.7919 17.3432L25.3685 16.8085L28.7216 15.7391L29.3363 15.2712V14.937Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M83.5441 4.77763L81.3646 3.77506L76.5585 2.83933L73.5408 2.57198H66.8905L62.6433 2.97301L59.2903 3.64139L56.9431 4.57712L56.6637 5.11182L57.2784 5.57969L59.0667 6.24807L62.308 6.91645L65.8846 7.31748L71.6407 7.45116L75.9997 7.1838L80.1351 6.51542L82.9293 5.57969L83.5441 5.11182V4.77763Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M54.2607 4.91131L52.9753 4.30977L50.0694 3.64139L43.6986 2.83933L39.3396 2.57198H28.7774L22.9655 2.97301L18.0477 3.64139L14.1358 4.7108L13.9681 5.11182L17.0418 6.1144L22.4066 6.91645L27.7715 7.31748L36.4336 7.45116L42.6926 7.1838L48.0575 6.6491L52.3047 5.84704L53.8695 5.31234L54.2607 4.91131Z"
        stroke="black"
        strokeWidth={LOGO_STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// --- Sub-components ---

const AnimatedPageText: React.FC<{
  page: (typeof PAGES)[number];
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}> = ({ page, index, scrollX, pageWidth }) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: index * pageWidth - scrollX.value }],
  }));

  return (
    <Animated.View style={[styles.textBlock, { width: pageWidth }, style]}>
      <Text style={styles.title}>{page.title}</Text>
      {index === 0 && (
        <View style={styles.logoContainer}>
          <NiyahLogo width={90} />
        </View>
      )}
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
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
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
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
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

  // Blobs background — only visible on page 0, fades out on scroll
  const blobsBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [0, width * 0.5],
      [0.85, 0],
      Extrapolation.CLAMP,
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
          <View
            style={styles.sceneArea}
            pointerEvents={DEBUG_LAYOUT ? "box-none" : "none"}
          >
            <ContinuousScene
              scrollX={scrollX}
              pageWidth={width}
              size={illustrationSize}
            />
            {/* Onboarding 2 scene — overlays on page 1 (scroll-driven).
                Uses full width for positioning, aligned to top of scene area. */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  justifyContent: "flex-start",
                  alignItems: "center",
                  paddingTop: 0,
                },
              ]}
              pointerEvents="none"
            >
              <Onboarding2Scene
                scrollX={scrollX}
                pageWidth={width}
                size={width}
              />
            </View>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  justifyContent: "flex-start",
                  alignItems: "center",
                  paddingTop: 0,
                  ...(DEBUG_LAYOUT ? { zIndex: 9999 } : {}),
                },
              ]}
              pointerEvents={DEBUG_LAYOUT ? undefined : "none"}
            >
              <Onboarding3Scene
                scrollX={scrollX}
                pageWidth={width}
                size={width}
              />
            </View>
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
            pointerEvents={DEBUG_LAYOUT ? "none" : undefined}
          >
            {PAGES.map((_, i) => (
              <View key={i} style={{ width }} />
            ))}
          </Animated.ScrollView>

          {/* Interactive blobs layer — ABOVE ScrollView so taps reach Pressables. */}
          <View
            style={StyleSheet.absoluteFill}
            pointerEvents={DEBUG_LAYOUT ? "none" : "box-none"}
          >
            {/* Spacer matching textArea height */}
            <View style={{ height: 220 }} pointerEvents="none" />
            {/* Center blobs in the remaining space (mirrors sceneArea layout) */}
            <View style={styles.blobsOverlay} pointerEvents="box-none">
              {/* Rounded background behind blobs (Figma: #608976, 70px radius) — page 0 only */}
              <Animated.View
                style={[
                  styles.blobsBackground,
                  {
                    width: illustrationSize * 0.95,
                    height: illustrationSize * 0.95,
                  },
                  blobsBgStyle,
                ]}
                pointerEvents="none"
              />
              <BlobsScene
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

          {/* Get Started button */}
          <Pressable
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.authButtonPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(auth)/auth-entry");
            }}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
      height: 220,
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
      fontSize: 41,
      ...Font.heavy,
      color: Colors.text,
      letterSpacing: -0.5,
      lineHeight: 41 * 1.1,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      color: Colors.text,
      marginTop: Spacing.sm,
      lineHeight: 16 * 1.5,
      textAlign: "center",
    },
    hint: {
      fontSize: Typography.bodySmall,
      ...Font.bold,
      color: Colors.text,
      marginTop: Spacing.xs,
      letterSpacing: 0.3,
      textAlign: "center",
    },
    logoContainer: {
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    sceneArea: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    blobsBackground: {
      position: "absolute",
      backgroundColor: "#608976",
      borderRadius: 70,
    },
    blobsOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    bottomSection: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      gap: Spacing.md,
      zIndex: 10,
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
      height: 52,
      borderRadius: Radius.full,
      backgroundColor: Colors.white,
      alignItems: "center",
      justifyContent: "center",
    },
    getStartedButtonText: {
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
      color: "#000000",
    },
    authButtonPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.97 }],
    },
  });
