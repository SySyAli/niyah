/**
 * ContinuousScene - A single unified illustration that evolves as the user
 * scrolls through the onboarding. Elements morph into each other via
 * overlapping opacity windows driven by scroll progress (0→3).
 *
 * Stage 0 (Welcome):   Sprout growing from pot, sun, hills
 * Stage 1 (Stake):     Phone with lock icon, floating coins
 * Stage 2 (Block):     Shield with checkmark, timer ring, app icons
 * Stage 3 (Grow):      Money tree with coin fruits, sparkles
 *
 * Persistent across all stages: ground hills, ambient glow, floating particles
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect, Ellipse } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ContinuousSceneProps {
  scrollX: SharedValue<number>;
  pageWidth: number;
  size: number;
}

export const ContinuousScene: React.FC<ContinuousSceneProps> = ({
  scrollX,
  pageWidth,
  size,
}) => {
  // progress: 0 = page 0, 1 = page 1, 2 = page 2, 3 = page 3
  const progress = useDerivedValue(() => scrollX.value / pageWidth);

  // --- Shared looping animations ---
  const sway = useSharedValue(0);
  const pulse = useSharedValue(0);
  const drift = useSharedValue(0);
  const timerAnim = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    timerAnim.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const cx = size / 2;
  const midY = size * 0.43;

  // ============================================================
  //  PERSISTENT LAYERS
  // ============================================================

  // Ground hills
  const hillsStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 3],
          [8, -12],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Ambient glow
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.18, 0.32]),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1.5, 3],
          [size * 0.05, -size * 0.08, size * 0.02],
          Extrapolation.CLAMP,
        ),
      },
      { scale: interpolate(pulse.value, [0, 1], [0.94, 1.06]) },
    ],
  }));

  // Floating particles
  const p1Style = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 0.5, 1], [0.15, 0.3, 0.15]),
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [0, -14]) },
      {
        translateX: interpolate(
          progress.value,
          [0, 3],
          [5, -8],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const p2Style = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 0.5, 1], [0.12, 0.25, 0.12]),
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [-4, -18]) },
      {
        translateX: interpolate(
          progress.value,
          [0, 3],
          [-3, 6],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const p3Style = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 0.5, 1], [0.1, 0.22, 0.1]),
    transform: [{ translateY: interpolate(drift.value, [0, 1], [2, -12]) }],
  }));

  // Sun - fades out after stage 1
  const sunStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1.2, 2],
      [0.85, 0.5, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 3],
          [0, -size * 0.12],
          Extrapolation.CLAMP,
        ),
      },
      { scale: interpolate(pulse.value, [0, 1], [0.97, 1.03]) },
    ],
  }));

  // ============================================================
  //  STAGE 0: Sprout + Pot  (visible 0 → fades out by 1)
  // ============================================================

  const sproutStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.5, 1.0],
      [1, 0.7, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [0, 0.4],
          [1, 1.15],
          Extrapolation.CLAMP,
        ),
      },
      { rotate: `${interpolate(sway.value, [0, 1], [-1.5, 1.5])}deg` },
    ],
  }));

  const potStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.5, 0.9],
      [1, 0.6, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 0.8],
          [0, 10],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // ============================================================
  //  STAGE 1: Phone + Coins  (fades in 0.3→0.8, out 1.5→2)
  // ============================================================

  const phoneW = size * 0.36;
  const phoneH = size * 0.52;

  const phoneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.3, 0.8, 1, 1.5, 2.0],
      [0, 0.5, 1, 0.5, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.3, 1, 2],
          [25, 0, -15],
          Extrapolation.CLAMP,
        ),
      },
      { rotate: `${interpolate(sway.value, [0, 1], [-1, 1])}deg` },
      {
        scale: interpolate(
          progress.value,
          [0.3, 1, 2],
          [0.75, 1, 0.8],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const coinsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.5, 0.9, 1, 1.6, 2.2],
      [0, 0.4, 0.75, 0.4, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ translateY: interpolate(drift.value, [0, 1], [0, -6]) }],
  }));

  // ============================================================
  //  STAGE 2: Shield + Timer + Icons  (fades in 1.3→1.8, out 2.4→3)
  // ============================================================

  const shieldW = size * 0.28;
  const shieldH = size * 0.34;

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.3, 1.8, 2, 2.4, 2.9],
      [0, 0.5, 1, 0.5, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [1.3, 2, 3],
            [0.6, 1, 0.85],
            Extrapolation.CLAMP,
          ) * interpolate(pulse.value, [0, 1], [1, 1.02]),
      },
      {
        translateY: interpolate(
          progress.value,
          [1.3, 2, 3],
          [20, 0, -25],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const timerR = size * 0.2;
  const circumference = 2 * Math.PI * timerR;
  const timerRingProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - timerAnim.value),
  }));

  const timerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.5, 2, 2.5, 3],
      [0, 0.55, 0.35, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ rotate: "-90deg" }],
  }));

  const iconsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.6, 2, 2.4, 2.8],
      [0, 0.55, 0.4, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // ============================================================
  //  STAGE 3: Money Tree  (fades in 2.2→3, stays)
  // ============================================================

  const trunkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [2.2, 2.7, 3],
      [0, 0.6, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [2.2, 3],
          [0.15, 1],
          Extrapolation.CLAMP,
        ),
      },
      { rotate: `${interpolate(sway.value, [0, 1], [-0.4, 0.4])}deg` },
    ],
  }));

  const canopyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [2.4, 2.8, 3],
      [0, 0.4, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [2.4, 3],
            [0.35, 1],
            Extrapolation.CLAMP,
          ) * interpolate(pulse.value, [0, 1], [1, 1.02]),
      },
      { rotate: `${interpolate(sway.value, [0, 1], [-0.7, 0.7])}deg` },
    ],
  }));

  const fruitsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [2.6, 3],
      [0, 0.8],
      Extrapolation.CLAMP,
    ),
    transform: [{ translateX: interpolate(sway.value, [0, 1], [-2, 2]) }],
  }));

  // ============================================================
  //  RENDER
  // ============================================================

  const hillH = size * 0.28;

  const coinPositions = [
    { x: size * 0.06, y: size * 0.22, r: size * 0.03 },
    { x: size * 0.82, y: size * 0.18, r: size * 0.022 },
    { x: size * 0.04, y: size * 0.6, r: size * 0.025 },
    { x: size * 0.84, y: size * 0.58, r: size * 0.028 },
  ];

  const iconData = [
    { x: size * 0.02, y: midY - size * 0.1, color: "#E1306C", s: size * 0.065 },
    { x: size * 0.88, y: midY - size * 0.06, color: "#1DA1F2", s: size * 0.06 },
    {
      x: size * 0.04,
      y: midY + size * 0.14,
      color: "#FF4060",
      s: size * 0.055,
    },
    { x: size * 0.86, y: midY + size * 0.12, color: "#FF2020", s: size * 0.06 },
  ];

  const fruitPositions = [
    { x: cx - size * 0.14, y: size * 0.2 },
    { x: cx + size * 0.06, y: size * 0.16 },
    { x: cx - size * 0.04, y: size * 0.3 },
    { x: cx + size * 0.12, y: size * 0.24 },
  ];

  return (
    <View style={[styles.scene, { width: size, height: size }]}>
      {/* --- Ambient glow --- */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - size * 0.22, top: size * 0.18 },
          glowStyle,
        ]}
      >
        <Svg width={size * 0.44} height={size * 0.44}>
          <Circle
            cx={size * 0.22}
            cy={size * 0.22}
            r={size * 0.2}
            fill="#2D6A4F"
            opacity={0.25}
          />
          <Circle
            cx={size * 0.22}
            cy={size * 0.22}
            r={size * 0.12}
            fill="#40916C"
            opacity={0.18}
          />
        </Svg>
      </Animated.View>

      {/* --- Sun --- */}
      <Animated.View
        style={[styles.abs, { right: size * 0.06, top: size * 0.03 }, sunStyle]}
      >
        <Svg width={size * 0.2} height={size * 0.2}>
          <Circle
            cx={size * 0.1}
            cy={size * 0.1}
            r={size * 0.09}
            fill="#8B7355"
            opacity={0.18}
          />
          <Circle
            cx={size * 0.1}
            cy={size * 0.1}
            r={size * 0.06}
            fill="#7A6840"
            opacity={0.28}
          />
          <Circle
            cx={size * 0.1}
            cy={size * 0.1}
            r={size * 0.035}
            fill="#6B5B35"
            opacity={0.9}
          />
        </Svg>
      </Animated.View>

      {/* --- Floating particles --- */}
      <Animated.View
        style={[styles.abs, { left: size * 0.12, top: size * 0.25 }, p1Style]}
      >
        <Svg width={10} height={10}>
          <Circle cx={5} cy={5} r={4} fill="#2D6A4F" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.abs, { left: size * 0.78, top: size * 0.35 }, p2Style]}
      >
        <Svg width={8} height={8}>
          <Circle cx={4} cy={4} r={3} fill="#6B5B35" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.abs, { left: size * 0.5, top: size * 0.15 }, p3Style]}
      >
        <Svg width={7} height={7}>
          <Circle cx={3.5} cy={3.5} r={3} fill="#40916C" />
        </Svg>
      </Animated.View>

      {/* --- Ground hills --- */}
      <Animated.View
        style={[styles.abs, { bottom: 0, left: -4, right: -4 }, hillsStyle]}
      >
        <Svg width={size + 8} height={hillH} viewBox="0 0 410 110">
          <Path
            d="M -10 65 Q 100 28 205 52 Q 310 76 420 38 L 420 110 L -10 110 Z"
            fill="#2D6A4F"
            opacity={0.3}
          />
          <Path
            d="M -10 80 Q 80 50 185 68 Q 290 86 420 58 L 420 110 L -10 110 Z"
            fill="#9BC887"
            opacity={0.32}
          />
          <Path
            d="M -10 94 Q 120 76 225 88 Q 330 100 420 82 L 420 110 L -10 110 Z"
            fill="#7CB564"
            opacity={0.22}
          />
        </Svg>
      </Animated.View>

      {/* === STAGE 0: Sprout + Pot === */}
      <Animated.View
        style={[
          styles.abs,
          { bottom: size * 0.11, left: cx - size * 0.055 },
          potStyle,
        ]}
      >
        <Svg width={size * 0.11} height={size * 0.09} viewBox="0 0 50 42">
          <Path
            d="M 6 0 L 44 0 L 39 34 Q 38 42 25 42 Q 12 42 11 34 Z"
            fill="#5C4A2E"
          />
          <Path d="M 8 0 L 42 0 L 41 6 L 9 6 Z" fill="#6B5B3A" />
          <Ellipse
            cx={25}
            cy={3}
            rx={18}
            ry={3.5}
            fill="#4A3C25"
            opacity={0.2}
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.abs,
          {
            bottom: size * 0.18,
            left: cx - 1.5,
            transformOrigin: "bottom center",
          },
          sproutStyle,
        ]}
      >
        <Svg width={size * 0.14} height={size * 0.32} viewBox="-22 0 48 140">
          <Rect
            x={0}
            y={0}
            width={3.5}
            height={140}
            rx={1.75}
            fill="#7CB564"
            opacity={0.75}
          />
          <Path
            d="M 3.5 110 Q 16 104 20 94"
            stroke="#7CB564"
            strokeWidth={1.5}
            fill="none"
            opacity={0.6}
          />
          <Ellipse
            cx={22}
            cy={92}
            rx={8}
            ry={4}
            fill="#9BC887"
            opacity={0.4}
            transform="rotate(-22 22 92)"
          />
          <Path
            d="M 0 78 Q -14 72 -17 62"
            stroke="#7CB564"
            strokeWidth={1.5}
            fill="none"
            opacity={0.6}
          />
          <Ellipse
            cx={-19}
            cy={60}
            rx={8}
            ry={4}
            fill="#9BC887"
            opacity={0.4}
            transform="rotate(22 -19 60)"
          />
          <Path
            d="M 3.5 48 Q 14 42 18 34"
            stroke="#7CB564"
            strokeWidth={1.3}
            fill="none"
            opacity={0.5}
          />
          <Ellipse
            cx={20}
            cy={32}
            rx={6}
            ry={3}
            fill="#52B788"
            opacity={0.35}
            transform="rotate(-18 20 32)"
          />
        </Svg>
      </Animated.View>

      {/* === STAGE 1: Phone === */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - phoneW / 2, top: midY - phoneH / 2 },
          phoneStyle,
        ]}
      >
        <Svg width={phoneW} height={phoneH} viewBox="0 0 160 240">
          <Rect
            x={0}
            y={0}
            width={160}
            height={240}
            rx={22}
            fill="#7CB564"
            opacity={0.88}
          />
          <Rect
            x={3}
            y={3}
            width={154}
            height={234}
            rx={19}
            fill="#40916C"
            opacity={0.82}
          />
          <Rect
            x={8}
            y={8}
            width={144}
            height={224}
            rx={16}
            fill="#1B4332"
            opacity={0.88}
          />
          {/* Lock */}
          <Rect
            x={66}
            y={94}
            width={28}
            height={20}
            rx={3.5}
            fill="#9BC887"
            opacity={0.65}
          />
          <Path
            d="M 71 94 L 71 85 Q 71 74 80 74 Q 89 74 89 85 L 89 94"
            stroke="#9BC887"
            strokeWidth={2.5}
            fill="none"
            opacity={0.65}
          />
          <Circle cx={80} cy={104} r={2} fill="#1B4332" />
          {/* Screen lines */}
          <Rect
            x={28}
            y={42}
            width={40}
            height={4.5}
            rx={2.25}
            fill="#7CB564"
            opacity={0.12}
          />
          <Rect
            x={28}
            y={52}
            width={28}
            height={4.5}
            rx={2.25}
            fill="#7CB564"
            opacity={0.08}
          />
          {/* Notch */}
          <Rect
            x={55}
            y={12}
            width={50}
            height={6}
            rx={3}
            fill="#14291C"
            opacity={0.55}
          />
        </Svg>
      </Animated.View>

      {/* === STAGE 1: Floating coins === */}
      <Animated.View
        style={[
          styles.abs,
          { left: 0, top: 0, width: size, height: size },
          coinsStyle,
        ]}
      >
        {coinPositions.map((c, i) => (
          <View key={`c${i}`} style={[styles.abs, { left: c.x, top: c.y }]}>
            <Svg width={c.r * 2 + 4} height={c.r * 2 + 4}>
              <Circle
                cx={c.r + 2}
                cy={c.r + 2}
                r={c.r}
                fill="#6B5B3A"
                opacity={0.65}
              />
              <Circle
                cx={c.r + 2}
                cy={c.r + 2}
                r={c.r * 0.7}
                fill="#6B5B35"
                opacity={0.75}
              />
            </Svg>
          </View>
        ))}
      </Animated.View>

      {/* === STAGE 2: Shield === */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - shieldW / 2, top: midY - shieldH / 2 },
          shieldStyle,
        ]}
      >
        <Svg width={shieldW} height={shieldH} viewBox="0 0 130 158">
          <Path
            d="M 65 8 L 118 32 L 118 84 Q 118 130 65 154 Q 12 130 12 84 L 12 32 Z"
            fill="#9BC887"
            opacity={0.82}
          />
          <Path
            d="M 65 17 L 110 38 L 110 82 Q 110 124 65 145 Q 20 124 20 82 L 20 38 Z"
            fill="#7CB564"
            opacity={0.72}
          />
          <Path
            d="M 65 27 L 102 46 L 102 78 Q 102 116 65 134 Q 28 116 28 78 L 28 46 Z"
            fill="#52B788"
            opacity={0.38}
          />
          <Path
            d="M 46 80 L 59 93 L 87 62"
            stroke="white"
            strokeWidth={5.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.88}
          />
        </Svg>
      </Animated.View>

      {/* === STAGE 2: Timer ring === */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - timerR - 3, top: midY - timerR - 3 },
          timerStyle,
        ]}
      >
        <Svg width={(timerR + 3) * 2} height={(timerR + 3) * 2}>
          <Circle
            cx={timerR + 3}
            cy={timerR + 3}
            r={timerR}
            fill="none"
            stroke="#7CB564"
            strokeWidth={1.5}
            opacity={0.12}
          />
          <AnimatedCircle
            cx={timerR + 3}
            cy={timerR + 3}
            r={timerR}
            fill="none"
            stroke="#9BC887"
            strokeWidth={2}
            strokeDasharray={circumference}
            animatedProps={timerRingProps}
            strokeLinecap="round"
            opacity={0.45}
          />
        </Svg>
      </Animated.View>

      {/* === STAGE 2: App icons === */}
      <Animated.View
        style={[
          styles.abs,
          { left: 0, top: 0, width: size, height: size },
          iconsStyle,
        ]}
      >
        {iconData.map((icon, i) => (
          <View
            key={`i${i}`}
            style={[styles.abs, { left: icon.x, top: icon.y }]}
          >
            <Svg width={icon.s} height={icon.s}>
              <Rect
                x={1}
                y={1}
                width={icon.s - 2}
                height={icon.s - 2}
                rx={icon.s * 0.22}
                fill={icon.color}
                opacity={0.55}
              />
              <Rect
                x={icon.s * 0.3}
                y={icon.s * 0.4}
                width={icon.s * 0.4}
                height={icon.s * 0.08}
                rx={1}
                fill="white"
                opacity={0.25}
              />
            </Svg>
          </View>
        ))}
      </Animated.View>

      {/* === STAGE 3: Tree trunk === */}
      <Animated.View
        style={[
          styles.abs,
          {
            left: cx - size * 0.02,
            top: midY + size * 0.05,
            transformOrigin: "bottom center",
          },
          trunkStyle,
        ]}
      >
        <Svg width={size * 0.04} height={size * 0.25} viewBox="0 0 18 100">
          <Rect
            x={2}
            y={0}
            width={14}
            height={100}
            rx={4}
            fill="#5C4A2E"
            opacity={0.78}
          />
          <Rect
            x={5}
            y={0}
            width={4}
            height={100}
            rx={2}
            fill="#6B5B3A"
            opacity={0.25}
          />
          <Path
            d="M 16 22 Q 26 19 30 14"
            stroke="#5C4A2E"
            strokeWidth={2.2}
            fill="none"
            opacity={0.38}
          />
          <Path
            d="M 2 44 Q -6 41 -10 36"
            stroke="#5C4A2E"
            strokeWidth={2.2}
            fill="none"
            opacity={0.38}
          />
        </Svg>
      </Animated.View>

      {/* === STAGE 3: Canopy === */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - size * 0.18, top: size * 0.1 },
          canopyStyle,
        ]}
      >
        <Svg width={size * 0.36} height={size * 0.3} viewBox="0 0 150 120">
          <Circle cx={50} cy={60} r={40} fill="#9BC887" opacity={0.28} />
          <Circle cx={100} cy={56} r={36} fill="#9BC887" opacity={0.28} />
          <Circle cx={75} cy={48} r={44} fill="#52B788" opacity={0.38} />
          <Circle cx={40} cy={68} r={30} fill="#2D6A4F" opacity={0.22} />
          <Circle cx={110} cy={64} r={28} fill="#2D6A4F" opacity={0.22} />
          <Circle cx={75} cy={65} r={34} fill="#40916C" opacity={0.18} />
        </Svg>
      </Animated.View>

      {/* === STAGE 3: Coin fruits === */}
      <Animated.View
        style={[
          styles.abs,
          { left: 0, top: 0, width: size, height: size },
          fruitsStyle,
        ]}
      >
        {fruitPositions.map((c, i) => {
          const fr = size * 0.021;
          return (
            <View key={`f${i}`} style={[styles.abs, { left: c.x, top: c.y }]}>
              <Svg width={fr * 2 + 4} height={fr * 2 + 7}>
                <Path
                  d={`M ${fr + 2} 0 L ${fr + 2} 3`}
                  stroke="#7CB564"
                  strokeWidth={0.8}
                  opacity={0.35}
                />
                <Circle
                  cx={fr + 2}
                  cy={fr + 5}
                  r={fr}
                  fill="#6B5B3A"
                  opacity={0.65}
                />
                <Circle
                  cx={fr + 2}
                  cy={fr + 5}
                  r={fr * 0.65}
                  fill="#6B5B35"
                  opacity={0.75}
                />
              </Svg>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  scene: { alignSelf: "center" },
  abs: { position: "absolute" },
});
