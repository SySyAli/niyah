import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Rect,
  Path,
  Text as SvgText,
  Polygon,
} from "react-native-svg";

interface SceneProps {
  scrollX: SharedValue<number>;
  pageIndex: number;
  pageWidth: number;
  size: number;
}

// Rising sparkle particle
const Sparkle: React.FC<{
  x: number;
  startY: number;
  sparkleSize: number;
  delay: number;
  progress: SharedValue<number>;
}> = ({ x, startY, sparkleSize: s, delay: d, progress }) => {
  const rise = useSharedValue(0);

  useEffect(() => {
    rise.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 3000 + d * 0.5,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const pageOpacity = interpolate(
      progress.value,
      [-1, -0.3, 0, 0.5, 1],
      [0, 0.4, 1, 0.4, 0],
    );
    return {
      opacity:
        pageOpacity * interpolate(rise.value, [0, 0.2, 0.8, 1], [0, 1, 0.6, 0]),
      transform: [
        { translateY: interpolate(rise.value, [0, 1], [0, -80]) },
        {
          scale: interpolate(rise.value, [0, 0.3, 0.7, 1], [0.3, 1, 0.8, 0.3]),
        },
        { rotate: `${interpolate(rise.value, [0, 1], [0, 120])}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: startY }, style]}
    >
      <Svg width={s} height={s}>
        <Polygon
          points={`${s / 2},0 ${s * 0.6},${s * 0.4} ${s},${s / 2} ${s * 0.6},${s * 0.6} ${s / 2},${s} ${s * 0.4},${s * 0.6} 0,${s / 2} ${s * 0.4},${s * 0.4}`}
          fill="#F0C060"
        />
      </Svg>
    </Animated.View>
  );
};

// Coin fruit hanging from tree
const CoinFruit: React.FC<{
  x: number;
  y: number;
  coinSize: number;
  index: number;
  progress: SharedValue<number>;
  shimmer: SharedValue<number>;
}> = ({ x, y, coinSize: s, index, progress, shimmer }) => {
  const sway = useSharedValue(0);

  useEffect(() => {
    sway.value = withDelay(
      index * 200,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2000 + index * 200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 2000 + index * 200,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const stagger = index * 0.06;
    return {
      opacity:
        interpolate(
          progress.value,
          [-1, -0.4 + stagger, -0.1, 0, 0.5, 1],
          [0, 0, 0.5, 1, 0.5, 0],
        ) * interpolate(shimmer.value, [0, 1], [0.85, 1]),
      transform: [
        { translateX: interpolate(sway.value, [0, 1], [-3, 3]) },
        { translateY: interpolate(sway.value, [0, 1], [0, 4]) },
        {
          scale: interpolate(
            progress.value,
            [-1, -0.3 + stagger, 0],
            [0, 0.7, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={s} height={s + 6}>
        {/* Stem */}
        <Path
          d={`M ${s / 2} 0 L ${s / 2} 6`}
          stroke="#5A9A42"
          strokeWidth={1.5}
        />
        {/* Coin */}
        <Circle cx={s / 2} cy={s / 2 + 6} r={s / 2 - 1} fill="#E6A23C" />
        <Circle cx={s / 2} cy={s / 2 + 6} r={s / 2 - 3.5} fill="#F0C060" />
        <SvgText
          x={s / 2}
          y={s / 2 + 6 + s * 0.15}
          textAnchor="middle"
          fill="#8B6914"
          fontSize={s * 0.4}
          fontWeight="bold"
        >
          $
        </SvgText>
      </Svg>
    </Animated.View>
  );
};

export const GrowthScene: React.FC<SceneProps> = ({
  scrollX,
  pageIndex,
  pageWidth,
  size,
}) => {
  const progress = useDerivedValue(
    () => (scrollX.value - pageIndex * pageWidth) / pageWidth,
  );

  // Tree sway
  const treeSway = useSharedValue(0);
  useEffect(() => {
    treeSway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Canopy breathe
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Shimmer for coins
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Trunk grows from bottom
  const trunkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.5, 0, 0.6, 1],
      [0, 0.5, 1, 1, 0],
    ),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [-1, -0.4, 0],
          [0.1, 0.6, 1],
          Extrapolation.CLAMP,
        ),
      },
      { rotate: `${interpolate(treeSway.value, [0, 1], [-0.8, 0.8])}deg` },
    ],
  }));

  // Canopy appears after trunk
  const canopyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.5, 1],
      [0, 0.3, 1, 0.5, 0],
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [-1, -0.3, 0],
            [0.3, 0.7, 1],
            Extrapolation.CLAMP,
          ) * interpolate(breathe.value, [0, 1], [1, 1.03]),
      },
      { rotate: `${interpolate(treeSway.value, [0, 1], [-1, 1])}deg` },
    ],
  }));

  // Ground
  const groundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.4, 1],
      [0, 0.8, 1, 0.8, 0],
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [-1, 0, 1],
          [20, 0, -10],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Streak flame
  const flameStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.2, 0, 0.5, 1],
      [0, 0.3, 1, 0.5, 0],
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [-1, -0.1, 0],
            [0, 0.8, 1],
            Extrapolation.CLAMP,
          ) * interpolate(breathe.value, [0, 1], [0.92, 1.08]),
      },
    ],
  }));

  const cx = size / 2;
  const trunkBottom = size * 0.7;
  const trunkH = size * 0.32;

  // Coin positions (relative to canopy center)
  const canopyCy = size * 0.28;
  const coinFruits = [
    { x: cx - size * 0.2, y: canopyCy + size * 0.05, s: size * 0.065 },
    { x: cx + size * 0.12, y: canopyCy - size * 0.02, s: size * 0.06 },
    { x: cx - size * 0.08, y: canopyCy + size * 0.15, s: size * 0.07 },
    { x: cx + size * 0.2, y: canopyCy + size * 0.08, s: size * 0.055 },
    { x: cx - size * 0.15, y: canopyCy - size * 0.06, s: size * 0.06 },
    { x: cx + size * 0.05, y: canopyCy + size * 0.2, s: size * 0.065 },
  ];

  const sparkles = [
    { x: size * 0.15, y: size * 0.35, s: 12, delay: 0 },
    { x: size * 0.75, y: size * 0.3, s: 10, delay: 600 },
    { x: size * 0.35, y: size * 0.2, s: 14, delay: 1200 },
    { x: size * 0.6, y: size * 0.4, s: 11, delay: 1800 },
    { x: size * 0.25, y: size * 0.5, s: 9, delay: 2400 },
    { x: size * 0.8, y: size * 0.45, s: 13, delay: 500 },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ground */}
      <Animated.View
        style={[styles.absolute, { bottom: 0, left: 0, right: 0 }, groundStyle]}
      >
        <Svg width={size} height={size * 0.18} viewBox="0 0 400 80">
          <Path
            d="M -20 30 Q 100 0 200 20 Q 300 40 420 10 L 420 80 L -20 80 Z"
            fill="#5A9A42"
            opacity={0.35}
          />
          <Path
            d="M -20 45 Q 80 20 200 35 Q 320 50 420 25 L 420 80 L -20 80 Z"
            fill="#7CB564"
            opacity={0.25}
          />
        </Svg>
      </Animated.View>

      {/* Streak flame at base */}
      <Animated.View
        style={[
          styles.absolute,
          { left: cx - size * 0.05, top: trunkBottom - size * 0.02 },
          flameStyle,
        ]}
      >
        <Svg width={size * 0.1} height={size * 0.1} viewBox="0 0 40 40">
          <Path
            d="M 20 2 Q 32 14 30 24 Q 28 34 20 38 Q 12 34 10 24 Q 8 14 20 2 Z"
            fill="#E6A23C"
          />
          <Path
            d="M 20 12 Q 26 18 24 26 Q 22 32 20 34 Q 18 32 16 26 Q 14 18 20 12 Z"
            fill="#F0C060"
          />
        </Svg>
      </Animated.View>

      {/* Trunk */}
      <Animated.View
        style={[
          styles.absolute,
          {
            left: cx - size * 0.035,
            top: trunkBottom - trunkH,
            transformOrigin: "bottom center",
          },
          trunkStyle,
        ]}
      >
        <Svg width={size * 0.07} height={trunkH} viewBox="0 0 28 130">
          <Rect x={4} y={0} width={20} height={130} rx={6} fill="#8B6914" />
          <Rect
            x={8}
            y={0}
            width={6}
            height={130}
            rx={3}
            fill="#A0792C"
            opacity={0.4}
          />
          {/* Branch stubs */}
          <Path
            d="M 24 30 Q 38 25 42 18"
            stroke="#8B6914"
            strokeWidth={4}
            fill="none"
          />
          <Path
            d="M 4 55 Q -10 50 -14 42"
            stroke="#8B6914"
            strokeWidth={4}
            fill="none"
          />
          <Path
            d="M 24 75 Q 36 70 40 64"
            stroke="#8B6914"
            strokeWidth={3.5}
            fill="none"
          />
          <Path
            d="M 4 95 Q -8 92 -12 86"
            stroke="#8B6914"
            strokeWidth={3}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Canopy (overlapping circles) */}
      <Animated.View
        style={[
          styles.absolute,
          { left: cx - size * 0.25, top: canopyCy - size * 0.18 },
          canopyStyle,
        ]}
      >
        <Svg width={size * 0.5} height={size * 0.4} viewBox="0 0 200 160">
          {/* Back canopy */}
          <Circle cx={70} cy={80} r={55} fill="#5A9A42" opacity={0.5} />
          <Circle cx={130} cy={75} r={50} fill="#5A9A42" opacity={0.5} />
          {/* Middle canopy */}
          <Circle cx={100} cy={65} r={58} fill="#7CB564" opacity={0.7} />
          <Circle cx={55} cy={90} r={42} fill="#7CB564" opacity={0.6} />
          <Circle cx={145} cy={85} r={40} fill="#7CB564" opacity={0.6} />
          {/* Front canopy */}
          <Circle cx={100} cy={85} r={48} fill="#9BC887" opacity={0.5} />
          <Circle cx={75} cy={70} r={35} fill="#9BC887" opacity={0.4} />
          <Circle cx={125} cy={72} r={33} fill="#9BC887" opacity={0.4} />
        </Svg>
      </Animated.View>

      {/* Coin fruits */}
      {coinFruits.map((c, i) => (
        <CoinFruit
          key={i}
          x={c.x}
          y={c.y}
          coinSize={c.s}
          index={i}
          progress={progress}
          shimmer={shimmer}
        />
      ))}

      {/* Rising sparkles */}
      {sparkles.map((s, i) => (
        <Sparkle
          key={`s${i}`}
          x={s.x}
          startY={s.y}
          sparkleSize={s.s}
          delay={s.delay}
          progress={progress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignSelf: "center" },
  absolute: { position: "absolute" },
});
