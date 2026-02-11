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
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SceneProps {
  scrollX: SharedValue<number>;
  pageIndex: number;
  pageWidth: number;
  size: number;
}

// Simplified ripple
const Ripple: React.FC<{
  cx: number;
  cy: number;
  maxR: number;
  delay: number;
  progress: SharedValue<number>;
}> = ({ cx, cy, maxR, delay: d, progress }) => {
  const expand = useSharedValue(0);

  useEffect(() => {
    expand.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
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
      [-1, -0.3, 0, 0.3, 1],
      [0, 0.4, 1, 0.4, 0],
    );
    return {
      opacity:
        pageOpacity * interpolate(expand.value, [0, 0.2, 1], [0.3, 0.25, 0]),
      transform: [{ scale: interpolate(expand.value, [0, 1], [0.4, 1]) }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: cx - maxR,
          top: cy - maxR,
          width: maxR * 2,
          height: maxR * 2,
        },
        style,
      ]}
    >
      <Svg width={maxR * 2} height={maxR * 2}>
        <Circle
          cx={maxR}
          cy={maxR}
          r={maxR - 2}
          fill="none"
          stroke="#9BC887"
          strokeWidth={1.5}
          opacity={0.4}
        />
      </Svg>
    </Animated.View>
  );
};

// Soft deflected icon
const DeflectedIcon: React.FC<{
  x: number;
  y: number;
  color: string;
  iconSize: number;
  delay: number;
  index: number;
  progress: SharedValue<number>;
}> = ({ x, y, color, iconSize: s, delay: d, index, progress }) => {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const stagger = index * 0.1;
    return {
      opacity: interpolate(
        progress.value,
        [-1, -0.3 + stagger, 0, 0.3, 1],
        [0, 0.3, 0.65, 0.3, 0],
      ),
      transform: [
        {
          translateY: interpolate(
            anim.value,
            [0, 1],
            [0, index % 2 === 0 ? -6 : 6],
          ),
        },
        { scale: interpolate(anim.value, [0, 0.5, 1], [0.9, 1, 0.9]) },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={s} height={s}>
        <Rect
          x={2}
          y={2}
          width={s - 4}
          height={s - 4}
          rx={s * 0.22}
          fill={color}
          opacity={0.7}
        />
        <Rect
          x={s * 0.3}
          y={s * 0.38}
          width={s * 0.4}
          height={s * 0.1}
          rx={2}
          fill="white"
          opacity={0.35}
        />
        <Rect
          x={s * 0.35}
          y={s * 0.52}
          width={s * 0.3}
          height={s * 0.1}
          rx={2}
          fill="white"
          opacity={0.2}
        />
      </Svg>
    </Animated.View>
  );
};

export const ShieldScene: React.FC<SceneProps> = ({
  scrollX,
  pageIndex,
  pageWidth,
  size,
}) => {
  const progress = useDerivedValue(
    () => (scrollX.value - pageIndex * pageWidth) / pageWidth,
  );

  const pulse = useSharedValue(0);
  const timerProgress = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    timerProgress.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.3, 1],
      [0, 0.5, 1, 0.5, 0],
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [-1, -0.15, 0],
            [0.5, 0.9, 1],
            Extrapolation.CLAMP,
          ) * interpolate(pulse.value, [0, 1], [1, 1.02]),
      },
    ],
  }));

  const timerRingRadius = size * 0.26;
  const circumference = 2 * Math.PI * timerRingRadius;

  const timerRingProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - timerProgress.value),
  }));

  const timerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.2, 0, 0.2, 1],
      [0, 0.4, 0.7, 0.4, 0],
    ),
    transform: [{ rotate: "-90deg" }],
  }));

  const cx = size / 2;
  const cy = size * 0.45;
  const shieldW = size * 0.34;
  const shieldH = size * 0.4;

  const icons = [
    {
      x: size * 0.04,
      y: cy - size * 0.12,
      color: "#E1306C",
      s: size * 0.085,
      delay: 0,
    },
    {
      x: size * 0.82,
      y: cy - size * 0.08,
      color: "#1DA1F2",
      s: size * 0.075,
      delay: 600,
    },
    {
      x: size * 0.08,
      y: cy + size * 0.18,
      color: "#FF4060",
      s: size * 0.07,
      delay: 1200,
    },
    {
      x: size * 0.78,
      y: cy + size * 0.16,
      color: "#FF2020",
      s: size * 0.075,
      delay: 1800,
    },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ripples */}
      <Ripple
        cx={cx}
        cy={cy}
        maxR={size * 0.36}
        delay={0}
        progress={progress}
      />
      <Ripple
        cx={cx}
        cy={cy}
        maxR={size * 0.32}
        delay={1500}
        progress={progress}
      />

      {/* Timer ring */}
      <Animated.View
        style={[
          styles.absolute,
          { left: cx - timerRingRadius - 4, top: cy - timerRingRadius - 4 },
          timerStyle,
        ]}
      >
        <Svg
          width={(timerRingRadius + 4) * 2}
          height={(timerRingRadius + 4) * 2}
        >
          <Circle
            cx={timerRingRadius + 4}
            cy={timerRingRadius + 4}
            r={timerRingRadius}
            fill="none"
            stroke="#7CB564"
            strokeWidth={2}
            opacity={0.15}
          />
          <AnimatedCircle
            cx={timerRingRadius + 4}
            cy={timerRingRadius + 4}
            r={timerRingRadius}
            fill="none"
            stroke="#9BC887"
            strokeWidth={2.5}
            strokeDasharray={circumference}
            animatedProps={timerRingProps}
            strokeLinecap="round"
            opacity={0.6}
          />
        </Svg>
      </Animated.View>

      {/* Shield */}
      <Animated.View
        style={[
          styles.absolute,
          { left: cx - shieldW / 2, top: cy - shieldH / 2 },
          shieldStyle,
        ]}
      >
        <Svg width={shieldW} height={shieldH} viewBox="0 0 140 170">
          <Path
            d="M 70 10 L 125 35 L 125 90 Q 125 140 70 165 Q 15 140 15 90 L 15 35 Z"
            fill="#9BC887"
            opacity={0.85}
          />
          <Path
            d="M 70 20 L 116 42 L 116 88 Q 116 132 70 153 Q 24 132 24 88 L 24 42 Z"
            fill="#7CB564"
            opacity={0.75}
          />
          <Path
            d="M 70 30 L 108 50 L 108 84 Q 108 122 70 140 Q 32 122 32 84 L 32 50 Z"
            fill="#A8D5A2"
            opacity={0.4}
          />
          {/* Checkmark */}
          <Path
            d="M 50 86 L 64 100 L 94 66"
            stroke="white"
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        </Svg>
      </Animated.View>

      {/* Deflected app icons */}
      {icons.map((icon, i) => (
        <DeflectedIcon
          key={i}
          x={icon.x}
          y={icon.y}
          color={icon.color}
          iconSize={icon.s}
          delay={icon.delay}
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
