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
import Svg, { Circle, Rect, Path, Text as SvgText } from "react-native-svg";

interface SceneProps {
  scrollX: SharedValue<number>;
  pageIndex: number;
  pageWidth: number;
  size: number;
}

// Simplified sparkle
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
            duration: 3500 + d * 0.3,
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
      [-1, -0.3, 0, 0.4, 1],
      [0, 0.3, 1, 0.3, 0],
    );
    return {
      opacity:
        pageOpacity *
        interpolate(rise.value, [0, 0.15, 0.7, 1], [0, 0.8, 0.4, 0]),
      transform: [
        { translateY: interpolate(rise.value, [0, 1], [0, -60]) },
        {
          scale: interpolate(
            rise.value,
            [0, 0.2, 0.6, 1],
            [0.3, 0.9, 0.7, 0.2],
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: startY }, style]}
    >
      <Svg width={s} height={s}>
        <Circle cx={s / 2} cy={s / 2} r={s / 3} fill="#EDD49A" opacity={0.7} />
      </Svg>
    </Animated.View>
  );
};

// Simplified coin fruit
const CoinFruit: React.FC<{
  x: number;
  y: number;
  coinSize: number;
  index: number;
  progress: SharedValue<number>;
  sway: SharedValue<number>;
}> = ({ x, y, coinSize: s, index, progress, sway }) => {
  const style = useAnimatedStyle(() => {
    const stagger = index * 0.06;
    return {
      opacity: interpolate(
        progress.value,
        [-1, -0.3 + stagger, 0, 0.4, 1],
        [0, 0.3, 0.85, 0.3, 0],
      ),
      transform: [
        { translateX: interpolate(sway.value, [0, 1], [-2, 2]) },
        {
          scale: interpolate(
            progress.value,
            [-1, -0.2 + stagger, 0],
            [0, 0.8, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={s} height={s + 5}>
        <Path
          d={`M ${s / 2} 0 L ${s / 2} 5`}
          stroke="#7CB564"
          strokeWidth={1.2}
          opacity={0.5}
        />
        <Circle
          cx={s / 2}
          cy={s / 2 + 5}
          r={s / 2 - 1}
          fill="#D4BC94"
          opacity={0.75}
        />
        <Circle
          cx={s / 2}
          cy={s / 2 + 5}
          r={s / 2 - 3}
          fill="#EDD49A"
          opacity={0.85}
        />
        <SvgText
          x={s / 2}
          y={s / 2 + 5 + s * 0.15}
          textAnchor="middle"
          fill="#B09868"
          fontSize={s * 0.38}
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

  const treeSway = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    treeSway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const trunkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.5, 1],
      [0, 0.4, 1, 1, 0],
    ),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [-1, -0.3, 0],
          [0.2, 0.7, 1],
          Extrapolation.CLAMP,
        ),
      },
      { rotate: `${interpolate(treeSway.value, [0, 1], [-0.6, 0.6])}deg` },
    ],
  }));

  const canopyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.2, 0, 0.4, 1],
      [0, 0.3, 1, 0.4, 0],
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [-1, -0.2, 0],
            [0.4, 0.8, 1],
            Extrapolation.CLAMP,
          ) * interpolate(breathe.value, [0, 1], [1, 1.02]),
      },
      { rotate: `${interpolate(treeSway.value, [0, 1], [-0.8, 0.8])}deg` },
    ],
  }));

  const groundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.3, 1],
      [0, 0.7, 1, 0.7, 0],
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [-1, 0, 1],
          [15, 0, -8],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const cx = size / 2;
  const trunkBottom = size * 0.7;
  const trunkH = size * 0.3;
  const canopyCy = size * 0.28;

  const coinFruits = [
    { x: cx - size * 0.18, y: canopyCy + size * 0.04, s: size * 0.055 },
    { x: cx + size * 0.1, y: canopyCy - size * 0.01, s: size * 0.05 },
    { x: cx - size * 0.06, y: canopyCy + size * 0.14, s: size * 0.06 },
    { x: cx + size * 0.17, y: canopyCy + size * 0.07, s: size * 0.048 },
  ];

  const sparkles = [
    { x: size * 0.18, y: size * 0.32, s: 10, delay: 0 },
    { x: size * 0.72, y: size * 0.28, s: 8, delay: 800 },
    { x: size * 0.38, y: size * 0.18, s: 11, delay: 1600 },
    { x: size * 0.58, y: size * 0.38, s: 9, delay: 2400 },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ground */}
      <Animated.View
        style={[styles.absolute, { bottom: 0, left: 0, right: 0 }, groundStyle]}
      >
        <Svg width={size} height={size * 0.15} viewBox="0 0 400 65">
          <Path
            d="M -20 25 Q 100 5 200 18 Q 300 32 420 8 L 420 65 L -20 65 Z"
            fill="#9BC887"
            opacity={0.25}
          />
          <Path
            d="M -20 38 Q 80 18 200 30 Q 320 42 420 22 L 420 65 L -20 65 Z"
            fill="#B8D9B0"
            opacity={0.2}
          />
        </Svg>
      </Animated.View>

      {/* Trunk */}
      <Animated.View
        style={[
          styles.absolute,
          {
            left: cx - size * 0.03,
            top: trunkBottom - trunkH,
            transformOrigin: "bottom center",
          },
          trunkStyle,
        ]}
      >
        <Svg width={size * 0.06} height={trunkH} viewBox="0 0 24 120">
          <Rect
            x={4}
            y={0}
            width={16}
            height={120}
            rx={5}
            fill="#C4A87A"
            opacity={0.8}
          />
          <Rect
            x={7}
            y={0}
            width={5}
            height={120}
            rx={2.5}
            fill="#D4BC94"
            opacity={0.3}
          />
          <Path
            d="M 20 28 Q 32 24 36 18"
            stroke="#C4A87A"
            strokeWidth={3}
            fill="none"
            opacity={0.5}
          />
          <Path
            d="M 4 52 Q -8 48 -12 42"
            stroke="#C4A87A"
            strokeWidth={3}
            fill="none"
            opacity={0.5}
          />
          <Path
            d="M 20 72 Q 30 68 34 62"
            stroke="#C4A87A"
            strokeWidth={2.5}
            fill="none"
            opacity={0.4}
          />
        </Svg>
      </Animated.View>

      {/* Canopy */}
      <Animated.View
        style={[
          styles.absolute,
          { left: cx - size * 0.22, top: canopyCy - size * 0.16 },
          canopyStyle,
        ]}
      >
        <Svg width={size * 0.44} height={size * 0.36} viewBox="0 0 180 145">
          <Circle cx={60} cy={72} r={48} fill="#9BC887" opacity={0.35} />
          <Circle cx={120} cy={68} r={44} fill="#9BC887" opacity={0.35} />
          <Circle cx={90} cy={58} r={52} fill="#A8D5A2" opacity={0.45} />
          <Circle cx={50} cy={82} r={36} fill="#B8D9B0" opacity={0.3} />
          <Circle cx={130} cy={78} r={34} fill="#B8D9B0" opacity={0.3} />
          <Circle cx={90} cy={78} r={42} fill="#C5E6C0" opacity={0.25} />
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
          sway={treeSway}
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
