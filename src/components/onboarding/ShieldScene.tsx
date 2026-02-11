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

// App icon that bounces off the shield
const BouncingIcon: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  iconSize: number;
  delay: number;
  index: number;
  progress: SharedValue<number>;
}> = ({
  startX,
  startY,
  endX,
  endY,
  color,
  iconSize: s,
  delay: d,
  index,
  progress,
}) => {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 1800,
            easing: Easing.out(Easing.back(1.5)),
          }),
          withTiming(0.7, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const stagger = index * 0.12;
    const pageOpacity = interpolate(
      progress.value,
      [-1, -0.4 + stagger, 0, 0.4, 1],
      [0, 0.5, 1, 0.5, 0],
    );
    return {
      opacity:
        pageOpacity * interpolate(bounce.value, [0, 0.3, 1], [0.3, 1, 1]),
      transform: [
        { translateX: interpolate(bounce.value, [0, 1], [startX, endX]) },
        { translateY: interpolate(bounce.value, [0, 1], [startY, endY]) },
        {
          scale: interpolate(
            bounce.value,
            [0, 0.5, 0.7, 1],
            [0.6, 1, 1.15, 0.9],
          ),
        },
        {
          rotate: `${interpolate(bounce.value, [0, 1], [0, index % 2 === 0 ? 15 : -15])}deg`,
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
      <Svg width={s} height={s}>
        <Rect
          x={2}
          y={2}
          width={s - 4}
          height={s - 4}
          rx={s * 0.22}
          fill={color}
        />
        <Rect
          x={s * 0.3}
          y={s * 0.35}
          width={s * 0.4}
          height={s * 0.12}
          rx={2}
          fill="white"
          opacity={0.5}
        />
        <Rect
          x={s * 0.35}
          y={s * 0.52}
          width={s * 0.3}
          height={s * 0.12}
          rx={2}
          fill="white"
          opacity={0.3}
        />
      </Svg>
    </Animated.View>
  );
};

// Ripple circle expanding from shield center
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
          withTiming(1, { duration: 2500, easing: Easing.out(Easing.ease) }),
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
      [0, 0.5, 1, 0.5, 0],
    );
    return {
      opacity:
        pageOpacity * interpolate(expand.value, [0, 0.3, 1], [0.4, 0.3, 0]),
      transform: [{ scale: interpolate(expand.value, [0, 1], [0.3, 1]) }],
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
          stroke="#7CB564"
          strokeWidth={2}
          opacity={0.4}
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

  // Shield pulse
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Timer ring progress
  const timerProgress = useSharedValue(0);
  useEffect(() => {
    timerProgress.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.4, 0, 0.4, 1],
      [0, 0.6, 1, 0.6, 0],
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [-1, -0.2, 0],
            [0.4, 0.9, 1],
            Extrapolation.CLAMP,
          ) * interpolate(pulse.value, [0, 1], [1, 1.03]),
      },
      {
        translateY: interpolate(
          progress.value,
          [-1, 0, 1],
          [30, 0, -15],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Timer ring (animated strokeDashoffset)
  const timerRingRadius = size * 0.28;
  const circumference = 2 * Math.PI * timerRingRadius;

  const timerRingProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - timerProgress.value),
  }));

  const timerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.3, 1],
      [0, 0.5, 0.8, 0.5, 0],
    ),
    transform: [
      { rotate: "-90deg" },
      {
        scale: interpolate(
          progress.value,
          [-1, -0.2, 0],
          [0.5, 0.9, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const cx = size / 2;
  const cy = size * 0.45;
  const shieldW = size * 0.36;
  const shieldH = size * 0.42;

  // App icons: start position (edges) → end position (bounced away from shield)
  const appIcons = [
    {
      startX: -10,
      startY: cy - 20,
      endX: size * 0.05,
      endY: cy - size * 0.18,
      color: "#E1306C",
      s: size * 0.1,
      delay: 0,
    }, // Instagram-pink
    {
      startX: size * 0.85,
      startY: cy - 10,
      endX: size * 0.78,
      endY: cy - size * 0.15,
      color: "#1DA1F2",
      s: size * 0.09,
      delay: 800,
    }, // Twitter-blue
    {
      startX: size * 0.1,
      startY: size * 0.8,
      endX: size * 0.12,
      endY: cy + size * 0.22,
      color: "#FF0050",
      s: size * 0.085,
      delay: 1600,
    }, // TikTok-red
    {
      startX: size * 0.8,
      startY: size * 0.75,
      endX: size * 0.72,
      endY: cy + size * 0.2,
      color: "#FF0000",
      s: size * 0.09,
      delay: 2400,
    }, // YouTube-red
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Ripples */}
      <Ripple
        cx={cx}
        cy={cy}
        maxR={size * 0.38}
        delay={0}
        progress={progress}
      />
      <Ripple
        cx={cx}
        cy={cy}
        maxR={size * 0.34}
        delay={1200}
        progress={progress}
      />
      <Ripple
        cx={cx}
        cy={cy}
        maxR={size * 0.42}
        delay={2400}
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
          {/* Track */}
          <Circle
            cx={timerRingRadius + 4}
            cy={timerRingRadius + 4}
            r={timerRingRadius}
            fill="none"
            stroke="#5A9A42"
            strokeWidth={3}
            opacity={0.2}
          />
          {/* Progress */}
          <AnimatedCircle
            cx={timerRingRadius + 4}
            cy={timerRingRadius + 4}
            r={timerRingRadius}
            fill="none"
            stroke="#7CB564"
            strokeWidth={3.5}
            strokeDasharray={circumference}
            animatedProps={timerRingProps}
            strokeLinecap="round"
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
          {/* Shield shape */}
          <Path
            d="M 70 10 L 125 35 L 125 90 Q 125 140 70 165 Q 15 140 15 90 L 15 35 Z"
            fill="#7CB564"
          />
          <Path
            d="M 70 18 L 118 40 L 118 88 Q 118 133 70 156 Q 22 133 22 88 L 22 40 Z"
            fill="#5A9A42"
          />
          {/* Inner highlight */}
          <Path
            d="M 70 28 L 110 48 L 110 85 Q 110 125 70 145 Q 30 125 30 85 L 30 48 Z"
            fill="#7CB564"
            opacity={0.6}
          />
          {/* Checkmark */}
          <Path
            d="M 50 85 L 65 100 L 95 65"
            stroke="white"
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      {/* Bouncing app icons */}
      {appIcons.map((icon, i) => (
        <BouncingIcon
          key={i}
          startX={icon.startX}
          startY={icon.startY}
          endX={icon.endX}
          endY={icon.endY}
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
