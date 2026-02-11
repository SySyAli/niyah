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

// Simplified floating coin
const FloatingCoin: React.FC<{
  x: number;
  y: number;
  coinSize: number;
  delay: number;
  index: number;
  progress: SharedValue<number>;
}> = ({ x, y, coinSize: s, delay: d, index, progress }) => {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 3000 + index * 400,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 3000 + index * 400,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const stagger = index * 0.08;
    return {
      opacity: interpolate(
        progress.value,
        [-1, -0.4 + stagger, 0, 0.4, 1],
        [0, 0.4, 0.85, 0.4, 0],
      ),
      transform: [
        { translateY: interpolate(float.value, [0, 1], [0, -10 - index * 2]) },
        {
          scale: interpolate(
            progress.value,
            [-1, -0.2 + stagger, 0],
            [0.4, 0.85, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={s} height={s}>
        <Circle
          cx={s / 2}
          cy={s / 2}
          r={s / 2 - 1}
          fill="#D4BC94"
          opacity={0.8}
        />
        <Circle
          cx={s / 2}
          cy={s / 2}
          r={s / 2 - 3.5}
          fill="#EDD49A"
          opacity={0.9}
        />
        <SvgText
          x={s / 2}
          y={s / 2 + s * 0.15}
          textAnchor="middle"
          fill="#B09868"
          fontSize={s * 0.36}
          fontWeight="bold"
        >
          $
        </SvgText>
      </Svg>
    </Animated.View>
  );
};

export const StakeScene: React.FC<SceneProps> = ({
  scrollX,
  pageIndex,
  pageWidth,
  size,
}) => {
  const progress = useDerivedValue(
    () => (scrollX.value - pageIndex * pageWidth) / pageWidth,
  );

  const rock = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    rock.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const phoneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.4, 1],
      [0, 0.6, 1, 0.6, 0],
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [-1, -0.1, 0, 1],
          [80, 10, 0, -40],
          Extrapolation.CLAMP,
        ),
      },
      {
        rotate: `${interpolate(rock.value, [0, 1], [-1.5, 1.5])}deg`,
      },
      {
        scale: interpolate(
          progress.value,
          [-1, -0.2, 0, 1],
          [0.7, 0.9, 1, 0.9],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(
        progress.value,
        [-1, -0.2, 0, 0.2, 1],
        [0, 0.2, 0.35, 0.2, 0],
      ) * interpolate(glow.value, [0, 1], [0.6, 1]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.92, 1.08]) }],
  }));

  const phoneW = size * 0.44;
  const phoneH = size * 0.66;
  const phoneCx = size / 2 - phoneW / 2;
  const phoneCy = size * 0.17;

  const coins = [
    { x: size * 0.1, y: size * 0.15, s: size * 0.09, delay: 0 },
    { x: size * 0.76, y: size * 0.12, s: size * 0.07, delay: 400 },
    { x: size * 0.72, y: size * 0.55, s: size * 0.08, delay: 800 },
    { x: size * 0.07, y: size * 0.56, s: size * 0.065, delay: 1200 },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow */}
      <Animated.View
        style={[
          styles.absolute,
          { left: phoneCx - size * 0.08, top: phoneCy + phoneH * 0.15 },
          glowStyle,
        ]}
      >
        <Svg width={phoneW + size * 0.16} height={phoneH * 0.7}>
          <Circle
            cx={(phoneW + size * 0.16) / 2}
            cy={phoneH * 0.35}
            r={phoneW * 0.55}
            fill="#A8D5A2"
            opacity={0.2}
          />
          <Circle
            cx={(phoneW + size * 0.16) / 2}
            cy={phoneH * 0.35}
            r={phoneW * 0.35}
            fill="#C5E6C0"
            opacity={0.15}
          />
        </Svg>
      </Animated.View>

      {/* Phone body */}
      <Animated.View
        style={[styles.absolute, { left: phoneCx, top: phoneCy }, phoneStyle]}
      >
        <Svg width={phoneW} height={phoneH} viewBox="0 0 180 280">
          {/* Phone outer frame */}
          <Rect
            x={0}
            y={0}
            width={180}
            height={280}
            rx={26}
            fill="#7CB564"
            opacity={0.9}
          />
          <Rect
            x={4}
            y={4}
            width={172}
            height={272}
            rx={22}
            fill="#6BA854"
            opacity={0.85}
          />
          {/* Screen */}
          <Rect
            x={10}
            y={10}
            width={160}
            height={260}
            rx={18}
            fill="#2D4228"
            opacity={0.9}
          />

          {/* Lock icon */}
          <Rect
            x={75}
            y={108}
            width={30}
            height={22}
            rx={4}
            fill="#9BC887"
            opacity={0.7}
          />
          <Path
            d="M 80 108 L 80 98 Q 80 85 90 85 Q 100 85 100 98 L 100 108"
            stroke="#9BC887"
            strokeWidth={3}
            fill="none"
            opacity={0.7}
          />
          <Circle cx={90} cy={119} r={2.5} fill="#2D4228" />

          {/* Subtle screen lines */}
          <Rect
            x={32}
            y={48}
            width={44}
            height={5}
            rx={2.5}
            fill="#7CB564"
            opacity={0.15}
          />
          <Rect
            x={32}
            y={60}
            width={30}
            height={5}
            rx={2.5}
            fill="#7CB564"
            opacity={0.1}
          />
          <Rect
            x={32}
            y={195}
            width={116}
            height={6}
            rx={3}
            fill="#7CB564"
            opacity={0.08}
          />
          <Rect
            x={32}
            y={212}
            width={76}
            height={6}
            rx={3}
            fill="#7CB564"
            opacity={0.06}
          />

          {/* Notch */}
          <Rect
            x={62}
            y={14}
            width={56}
            height={7}
            rx={3.5}
            fill="#1E2E1A"
            opacity={0.6}
          />
        </Svg>
      </Animated.View>

      {/* Floating coins */}
      {coins.map((c, i) => (
        <FloatingCoin
          key={i}
          x={c.x}
          y={c.y}
          coinSize={c.s}
          delay={c.delay}
          index={i}
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
