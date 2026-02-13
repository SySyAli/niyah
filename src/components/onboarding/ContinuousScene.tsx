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

  // --- Shared looping animations (for Stages 1-3) ---
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
  //  STAGE 1: Phone + Coins  (fades in 0.3→0.8, out 1.5→2)
  // ============================================================

  const phoneW = size * 0.36;
  const phoneH = size * 0.52;

  // Stage 1 phone + coins removed — replaced by hero red blob in BlobsScene
  const phoneStyle = useAnimatedStyle(() => ({
    opacity: 0,
  }));

  const coinsStyle = useAnimatedStyle(() => ({
    opacity: 0,
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
      {/* Stage 0 blobs are rendered by BlobsScene in welcome.tsx */}

      {/* ================================================================
       *  STAGE 1 — STAKE: PHONE
       *  A smartphone centered on screen with a lock icon and UI hints.
       *  Fades in from below during 0.3→1, fades out during 1.5→2.
       *  Sways gently. Scales up on entry, down on exit.
       *  ================================================================ */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - phoneW / 2, top: midY - phoneH / 2 },
          phoneStyle,
        ]}
      >
        <Svg width={phoneW} height={phoneH} viewBox="0 0 160 240">
          {/* SHAPE: Phone outer bezel — light green rounded rectangle */}
          <Rect
            x={0}
            y={0}
            width={160}
            height={240}
            rx={22}
            fill="#7CB564"
            opacity={0.88}
          />
          {/* SHAPE: Phone inner bezel — mid green, slightly inset */}
          <Rect
            x={3}
            y={3}
            width={154}
            height={234}
            rx={19}
            fill="#40916C"
            opacity={0.82}
          />
          {/* SHAPE: Phone screen — dark green rectangle (the "display") */}
          <Rect
            x={8}
            y={8}
            width={144}
            height={224}
            rx={16}
            fill="#1B4332"
            opacity={0.88}
          />

          {/* --- Lock icon (center of screen) --- */}
          {/* SHAPE: Lock body — small light-green rounded rectangle */}
          <Rect
            x={66}
            y={94}
            width={28}
            height={20}
            rx={3.5}
            fill="#9BC887"
            opacity={0.65}
          />
          {/* SHAPE: Lock shackle — U-shaped arc above lock body */}
          <Path
            d="M 71 94 L 71 85 Q 71 74 80 74 Q 89 74 89 85 L 89 94"
            stroke="#9BC887"
            strokeWidth={2.5}
            fill="none"
            opacity={0.65}
          />
          {/* SHAPE: Lock keyhole — tiny dark circle inside lock body */}
          <Circle cx={80} cy={104} r={2} fill="#1B4332" />

          {/* --- Screen content hints (text placeholder lines) --- */}
          {/* SHAPE: Top text line — wider faint green bar */}
          <Rect
            x={28}
            y={42}
            width={40}
            height={4.5}
            rx={2.25}
            fill="#7CB564"
            opacity={0.12}
          />
          {/* SHAPE: Second text line — shorter faint green bar below */}
          <Rect
            x={28}
            y={52}
            width={28}
            height={4.5}
            rx={2.25}
            fill="#7CB564"
            opacity={0.08}
          />

          {/* SHAPE: Camera notch — dark pill shape at top of screen */}
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

      {/* ================================================================
       *  STAGE 1 — STAKE: FLOATING COINS
       *  Four small coin circles scattered around the phone.
       *  Each coin = outer ring + inner circle (two-tone gold).
       *  Float upward gently. Fade in/out with the phone.
       *
       *  Positions (from coinPositions array):
       *    [0] top-left     [1] top-right
       *    [2] bottom-left  [3] bottom-right
       *  ================================================================ */}
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
              {/* SHAPE: Coin outer ring — darker gold circle */}
              <Circle
                cx={c.r + 2}
                cy={c.r + 2}
                r={c.r}
                fill="#6B5B3A"
                opacity={0.65}
              />
              {/* SHAPE: Coin inner face — brighter gold center */}
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

      {/* ================================================================
       *  STAGE 2 — BLOCK: SHIELD
       *  A large shield shape with a checkmark, centered on screen.
       *  Three nested shield layers (outer → mid → inner) + checkmark.
       *  Scales up on entry. Gentle pulse on scale. Fades out for Stage 3.
       *  ================================================================ */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - shieldW / 2, top: midY - shieldH / 2 },
          shieldStyle,
        ]}
      >
        <Svg width={shieldW} height={shieldH} viewBox="0 0 130 158">
          {/* SHAPE: Shield outer layer — lightest green, full shield outline */}
          <Path
            d="M 65 8 L 118 32 L 118 84 Q 118 130 65 154 Q 12 130 12 84 L 12 32 Z"
            fill="#9BC887"
            opacity={0.82}
          />
          {/* SHAPE: Shield middle layer — medium green, slightly smaller */}
          <Path
            d="M 65 17 L 110 38 L 110 82 Q 110 124 65 145 Q 20 124 20 82 L 20 38 Z"
            fill="#7CB564"
            opacity={0.72}
          />
          {/* SHAPE: Shield inner layer — teal green, innermost area */}
          <Path
            d="M 65 27 L 102 46 L 102 78 Q 102 116 65 134 Q 28 116 28 78 L 28 46 Z"
            fill="#52B788"
            opacity={0.38}
          />
          {/* SHAPE: Checkmark — white stroke path (the "✓" inside shield) */}
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

      {/* ================================================================
       *  STAGE 2 — BLOCK: TIMER RING
       *  A circular progress ring behind/around the shield.
       *  Rotated -90deg so the ring starts from the top (12 o'clock).
       *  Background track + animated progress arc (strokeDashoffset).
       *  ================================================================ */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - timerR - 3, top: midY - timerR - 3 },
          timerStyle,
        ]}
      >
        <Svg width={(timerR + 3) * 2} height={(timerR + 3) * 2}>
          {/* SHAPE: Timer background track — faint green circle outline */}
          <Circle
            cx={timerR + 3}
            cy={timerR + 3}
            r={timerR}
            fill="none"
            stroke="#7CB564"
            strokeWidth={1.5}
            opacity={0.12}
          />
          {/* SHAPE: Timer progress arc — animated green arc that fills over 8s */}
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

      {/* ================================================================
       *  STAGE 2 — BLOCK: APP ICONS  (deflected/blocked apps)
       *  Four small rounded-square "app icons" floating around the shield.
       *  Each has a colored background + tiny white bar (placeholder logo).
       *
       *  Positions (from iconData array):
       *    [0] left-upper  — Instagram pink (#E1306C)
       *    [1] right-upper — Twitter blue (#1DA1F2)
       *    [2] left-lower  — TikTok pink (#FF4060)
       *    [3] right-lower — YouTube red (#FF2020)
       *  ================================================================ */}
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
              {/* SHAPE: App icon background — colored rounded square */}
              <Rect
                x={1}
                y={1}
                width={icon.s - 2}
                height={icon.s - 2}
                rx={icon.s * 0.22}
                fill={icon.color}
                opacity={0.55}
              />
              {/* SHAPE: App icon logo placeholder — tiny white horizontal bar */}
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

      {/* ================================================================
       *  STAGE 3 — GROW: TREE TRUNK
       *  A vertical brown trunk that grows upward from the ground.
       *  scaleY animates from 0.15→1 as user scrolls to final page.
       *  Has two small branch stubs poking out (right at y=22, left at y=44).
       *  ================================================================ */}
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
          {/* SHAPE: Trunk main body — wide brown rounded rectangle */}
          <Rect
            x={2}
            y={0}
            width={14}
            height={100}
            rx={4}
            fill="#5C4A2E"
            opacity={0.78}
          />
          {/* SHAPE: Trunk highlight stripe — thinner lighter strip for depth */}
          <Rect
            x={5}
            y={0}
            width={4}
            height={100}
            rx={2}
            fill="#6B5B3A"
            opacity={0.25}
          />
          {/* SHAPE: Right branch stub — small curved line going up-right */}
          <Path
            d="M 16 22 Q 26 19 30 14"
            stroke="#5C4A2E"
            strokeWidth={2.2}
            fill="none"
            opacity={0.38}
          />
          {/* SHAPE: Left branch stub — small curved line going up-left */}
          <Path
            d="M 2 44 Q -6 41 -10 36"
            stroke="#5C4A2E"
            strokeWidth={2.2}
            fill="none"
            opacity={0.38}
          />
        </Svg>
      </Animated.View>

      {/* ================================================================
       *  STAGE 3 — GROW: CANOPY (tree crown / foliage)
       *  Six overlapping circles forming a bushy tree-top above the trunk.
       *  Scales up from 0.35→1. Gentle sway + pulse.
       *  ================================================================ */}
      <Animated.View
        style={[
          styles.abs,
          { left: cx - size * 0.18, top: size * 0.1 },
          canopyStyle,
        ]}
      >
        <Svg width={size * 0.36} height={size * 0.3} viewBox="0 0 150 120">
          {/* SHAPE: Left foliage cluster — large light-green circle */}
          <Circle cx={50} cy={60} r={40} fill="#9BC887" opacity={0.28} />
          {/* SHAPE: Right foliage cluster — large light-green circle */}
          <Circle cx={100} cy={56} r={36} fill="#9BC887" opacity={0.28} />
          {/* SHAPE: Center foliage dome — largest teal circle (main canopy mass) */}
          <Circle cx={75} cy={48} r={44} fill="#52B788" opacity={0.38} />
          {/* SHAPE: Left shadow cluster — smaller dark-green circle for depth */}
          <Circle cx={40} cy={68} r={30} fill="#2D6A4F" opacity={0.22} />
          {/* SHAPE: Right shadow cluster — smaller dark-green circle for depth */}
          <Circle cx={110} cy={64} r={28} fill="#2D6A4F" opacity={0.22} />
          {/* SHAPE: Center shadow overlay — mid-green circle for dimension */}
          <Circle cx={75} cy={65} r={34} fill="#40916C" opacity={0.18} />
        </Svg>
      </Animated.View>

      {/* ================================================================
       *  STAGE 3 — GROW: COIN FRUITS
       *  Four small coins "hanging" from the canopy like fruit.
       *  Each has a tiny stem line + outer ring + inner face.
       *  Sway left/right with the ambient sway animation.
       *
       *  Positions (from fruitPositions array):
       *    [0] left side of canopy    [1] center-right, highest
       *    [2] center-left, lower     [3] right side of canopy
       *  ================================================================ */}
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
                {/* SHAPE: Fruit stem — tiny vertical green line */}
                <Path
                  d={`M ${fr + 2} 0 L ${fr + 2} 3`}
                  stroke="#7CB564"
                  strokeWidth={0.8}
                  opacity={0.35}
                />
                {/* SHAPE: Fruit outer ring — small dark-gold circle */}
                <Circle
                  cx={fr + 2}
                  cy={fr + 5}
                  r={fr}
                  fill="#6B5B3A"
                  opacity={0.65}
                />
                {/* SHAPE: Fruit inner face — smaller brighter-gold center */}
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
