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
  Path,
  Ellipse,
  Rect,
  Text as SvgText,
} from "react-native-svg";

interface SceneProps {
  scrollX: SharedValue<number>;
  pageIndex: number;
  pageWidth: number;
  size: number;
}

// --- Animated sub-components (each owns its hooks) ---

const FloatingParticle: React.FC<{
  x: number;
  y: number;
  r: number;
  color: string;
  delay: number;
  progress: SharedValue<number>;
}> = ({ x, y, r, color, delay: d, progress }) => {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2800 + d,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 2800 + d,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.4, 1],
      [0, 0.6, 0.8, 0.6, 0],
    ),
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [0, -18]) },
      {
        translateX: interpolate(
          progress.value,
          [-1, 0, 1],
          [40, 0, -20],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={r * 2} height={r * 2}>
        <Circle cx={r} cy={r} r={r} fill={color} opacity={0.55} />
      </Svg>
    </Animated.View>
  );
};

const CoinLeaf: React.FC<{
  x: number;
  y: number;
  coinSize: number;
  index: number;
  progress: SharedValue<number>;
  pulse: SharedValue<number>;
}> = ({ x, y, coinSize: s, index, progress, pulse }) => {
  const style = useAnimatedStyle(() => {
    const stagger = index * 0.08;
    const enterScale = interpolate(
      progress.value,
      [-1, -0.5 + stagger, -0.15 + stagger, 0],
      [0, 0, 1.2, 1],
      Extrapolation.CLAMP,
    );
    const pulseScale = interpolate(pulse.value, [0, 1], [1, 1.07]);
    return {
      opacity: interpolate(
        progress.value,
        [-0.8, -0.2, 0, 0.5, 1],
        [0, 0.7, 1, 0.7, 0],
      ),
      transform: [
        { scale: enterScale * pulseScale },
        {
          translateX: interpolate(
            progress.value,
            [-1, 0, 1],
            [30 + index * 8, 0, -15 - index * 4],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={s} height={s}>
        <Circle cx={s / 2} cy={s / 2} r={s / 2 - 1} fill="#E6A23C" />
        <Circle cx={s / 2} cy={s / 2} r={s / 2 - 4} fill="#F0C060" />
        <SvgText
          x={s / 2}
          y={s / 2 + s * 0.17}
          textAnchor="middle"
          fill="#8B6914"
          fontSize={s * 0.42}
          fontWeight="bold"
        >
          $
        </SvgText>
      </Svg>
    </Animated.View>
  );
};

// --- Main scene ---

export const GardenScene: React.FC<SceneProps> = ({
  scrollX,
  pageIndex,
  pageWidth,
  size,
}) => {
  const progress = useDerivedValue(
    () => (scrollX.value - pageIndex * pageWidth) / pageWidth,
  );

  const sway = useSharedValue(0);
  const coinPulse = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    coinPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const hillsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.3, 1],
      [0, 1, 1, 1, 0],
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [-1, 0, 1],
          [25, 0, -12],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const sunStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.4, 1],
      [0, 0.9, 1, 0.9, 0],
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [-1, 0, 1],
          [60, 0, -30],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [-1, 0, 1],
          [-30, 0, 15],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [-1, 0, 1],
          [0.5, 1, 0.85],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const plantStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.6, 1],
      [0, 0.6, 1, 1, 0],
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
      { rotate: `${interpolate(sway.value, [0, 1], [-1.5, 1.5])}deg` },
    ],
  }));

  const potStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.5, 1],
      [0, 0.6, 1, 0.8, 0],
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [-1, -0.2, 0],
          [40, 8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const cx = size / 2;
  const hillH = size * 0.42;

  const coins = [
    { x: cx + size * 0.07, y: size * 0.18, s: size * 0.1 },
    { x: cx - size * 0.18, y: size * 0.26, s: size * 0.09 },
    { x: cx + size * 0.12, y: size * 0.34, s: size * 0.085 },
    { x: cx - size * 0.15, y: size * 0.42, s: size * 0.095 },
    { x: cx + size * 0.04, y: size * 0.1, s: size * 0.08 },
  ];

  const particles = [
    { x: size * 0.08, y: size * 0.22, r: 4, color: "#7CB564", delay: 0 },
    { x: size * 0.85, y: size * 0.18, r: 3, color: "#E6A23C", delay: 400 },
    { x: size * 0.2, y: size * 0.45, r: 5, color: "#9BC887", delay: 800 },
    { x: size * 0.78, y: size * 0.4, r: 3.5, color: "#F0C060", delay: 1200 },
    { x: size * 0.35, y: size * 0.15, r: 3, color: "#7CB564", delay: 600 },
    { x: size * 0.65, y: size * 0.12, r: 4, color: "#E6A23C", delay: 1000 },
    { x: size * 0.5, y: size * 0.5, r: 3, color: "#9BC887", delay: 300 },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Sun */}
      <Animated.View
        style={[
          styles.absolute,
          { right: size * 0.05, top: size * 0.02 },
          sunStyle,
        ]}
      >
        <Svg width={size * 0.28} height={size * 0.28}>
          <Circle
            cx={size * 0.14}
            cy={size * 0.14}
            r={size * 0.13}
            fill="#F0C060"
            opacity={0.25}
          />
          <Circle
            cx={size * 0.14}
            cy={size * 0.14}
            r={size * 0.1}
            fill="#E6A23C"
            opacity={0.4}
          />
          <Circle
            cx={size * 0.14}
            cy={size * 0.14}
            r={size * 0.065}
            fill="#F0C060"
          />
        </Svg>
      </Animated.View>

      {/* Rolling hills */}
      <Animated.View
        style={[styles.absolute, { bottom: 0, left: 0, right: 0 }, hillsStyle]}
      >
        <Svg width={size} height={hillH} viewBox="0 0 400 180">
          <Path
            d="M -20 120 Q 100 40 200 80 Q 300 120 420 60 L 420 180 L -20 180 Z"
            fill="#9BC887"
            opacity={0.45}
          />
          <Path
            d="M -20 138 Q 80 78 180 108 Q 280 138 420 88 L 420 180 L -20 180 Z"
            fill="#7CB564"
            opacity={0.55}
          />
          <Path
            d="M -20 152 Q 120 108 220 132 Q 320 156 420 128 L 420 180 L -20 180 Z"
            fill="#5A9A42"
            opacity={0.4}
          />
        </Svg>
      </Animated.View>

      {/* Pot */}
      <Animated.View
        style={[
          styles.absolute,
          { bottom: size * 0.12, left: cx - size * 0.085 },
          potStyle,
        ]}
      >
        <Svg width={size * 0.17} height={size * 0.14} viewBox="0 0 60 50">
          <Path
            d="M 5 0 L 55 0 L 48 40 Q 47 50 30 50 Q 13 50 12 40 Z"
            fill="#8B6914"
          />
          <Path d="M 8 0 L 52 0 L 50 8 L 10 8 Z" fill="#A0792C" />
          <Ellipse cx={30} cy={5} rx={24} ry={5} fill="#6B4F10" opacity={0.3} />
        </Svg>
      </Animated.View>

      {/* Plant stem */}
      <Animated.View
        style={[
          styles.absolute,
          {
            bottom: size * 0.24,
            left: cx - 3,
            transformOrigin: "bottom center",
          },
          plantStyle,
        ]}
      >
        <Svg width={6} height={size * 0.48}>
          <Rect
            x={0}
            y={0}
            width={6}
            height={size * 0.48}
            rx={3}
            fill="#5A9A42"
          />
          <Path
            d="M 6 60 Q 18 55 22 48"
            stroke="#5A9A42"
            strokeWidth={2.5}
            fill="none"
          />
          <Path
            d="M 0 90 Q -12 85 -16 78"
            stroke="#5A9A42"
            strokeWidth={2.5}
            fill="none"
          />
          <Path
            d="M 6 120 Q 20 115 24 108"
            stroke="#5A9A42"
            strokeWidth={2.5}
            fill="none"
          />
          <Path
            d="M 0 45 Q -14 40 -18 33"
            stroke="#5A9A42"
            strokeWidth={2.5}
            fill="none"
          />
          <Path
            d="M 6 25 Q 16 20 20 14"
            stroke="#5A9A42"
            strokeWidth={2}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Coin leaves */}
      {coins.map((c, i) => (
        <CoinLeaf
          key={i}
          x={c.x}
          y={c.y}
          coinSize={c.s}
          index={i}
          progress={progress}
          pulse={coinPulse}
        />
      ))}

      {/* Floating particles */}
      {particles.map((p, i) => (
        <FloatingParticle key={`p${i}`} {...p} progress={progress} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignSelf: "center" },
  absolute: { position: "absolute" },
});
