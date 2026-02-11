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

// Floating coin orbiting the phone
const OrbitingCoin: React.FC<{
  x: number;
  y: number;
  coinSize: number;
  delay: number;
  index: number;
  progress: SharedValue<number>;
}> = ({ x, y, coinSize: s, delay: d, index, progress }) => {
  const float = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    float.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2200 + index * 300,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 2200 + index * 300,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );
    spin.value = withDelay(
      d,
      withRepeat(
        withTiming(1, { duration: 4000 + index * 500, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const stagger = index * 0.1;
    return {
      opacity: interpolate(
        progress.value,
        [-1, -0.5 + stagger, -0.1, 0, 0.5, 1],
        [0, 0, 0.8, 1, 0.8, 0],
      ),
      transform: [
        { translateY: interpolate(float.value, [0, 1], [0, -12 - index * 3]) },
        {
          translateX: interpolate(
            float.value,
            [0, 1],
            [0, index % 2 === 0 ? 6 : -6],
          ),
        },
        {
          scale: interpolate(
            progress.value,
            [-1, -0.3 + stagger, 0],
            [0.3, 0.8, 1],
            Extrapolation.CLAMP,
          ),
        },
        { rotateY: `${interpolate(spin.value, [0, 1], [0, 360])}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, style]}>
      <Svg width={s} height={s}>
        <Circle cx={s / 2} cy={s / 2} r={s / 2 - 1} fill="#E6A23C" />
        <Circle cx={s / 2} cy={s / 2} r={s / 2 - 4} fill="#F0C060" />
        <Circle
          cx={s / 2}
          cy={s / 2}
          r={s / 2 - 7}
          fill="#E6A23C"
          opacity={0.3}
        />
        <SvgText
          x={s / 2}
          y={s / 2 + s * 0.15}
          textAnchor="middle"
          fill="#8B6914"
          fontSize={s * 0.38}
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

  // Phone rocking animation
  const rock = useSharedValue(0);
  useEffect(() => {
    rock.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Glow pulse
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Phone enters from right, tilts into position
  const phoneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.5, 0, 0.5, 1],
      [0, 0.7, 1, 0.7, 0],
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [-1, -0.2, 0, 1],
          [120, 20, 0, -60],
          Extrapolation.CLAMP,
        ),
      },
      {
        rotate: `${interpolate(progress.value, [-1, 0], [-5, 15], Extrapolation.CLAMP) + interpolate(rock.value, [0, 1], [-2, 2])}deg`,
      },
      {
        scale: interpolate(
          progress.value,
          [-1, -0.3, 0, 1],
          [0.6, 0.85, 1, 0.85],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Glow behind phone
  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(
        progress.value,
        [-1, -0.3, 0, 0.3, 1],
        [0, 0.3, 0.5, 0.3, 0],
      ) * interpolate(glow.value, [0, 1], [0.6, 1]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.9, 1.1]) }],
  }));

  const phoneW = size * 0.48;
  const phoneH = size * 0.72;
  const phoneCx = size / 2 - phoneW / 2;
  const phoneCy = size * 0.14;

  const coins = [
    { x: size * 0.08, y: size * 0.12, s: size * 0.12, delay: 0 },
    { x: size * 0.75, y: size * 0.08, s: size * 0.09, delay: 300 },
    { x: size * 0.7, y: size * 0.55, s: size * 0.1, delay: 600 },
    { x: size * 0.05, y: size * 0.58, s: size * 0.08, delay: 900 },
    { x: size * 0.38, y: size * 0.02, s: size * 0.14, delay: 150 }, // large coin on top
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow */}
      <Animated.View
        style={[
          styles.absolute,
          { left: phoneCx - size * 0.06, top: phoneCy + phoneH * 0.15 },
          glowStyle,
        ]}
      >
        <Svg width={phoneW + size * 0.12} height={phoneH * 0.7}>
          <Circle
            cx={(phoneW + size * 0.12) / 2}
            cy={phoneH * 0.35}
            r={phoneW * 0.6}
            fill="#7CB564"
            opacity={0.2}
          />
          <Circle
            cx={(phoneW + size * 0.12) / 2}
            cy={phoneH * 0.35}
            r={phoneW * 0.4}
            fill="#7CB564"
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
          <Rect x={0} y={0} width={180} height={280} rx={24} fill="#5A9A42" />
          {/* Phone inner frame */}
          <Rect x={4} y={4} width={172} height={272} rx={20} fill="#4A8A35" />
          {/* Screen */}
          <Rect x={10} y={10} width={160} height={260} rx={16} fill="#2A3A20" />

          {/* Lock icon on screen */}
          <Rect
            x={75}
            y={105}
            width={30}
            height={24}
            rx={4}
            fill="#7CB564"
            opacity={0.8}
          />
          <Path
            d="M 80 105 L 80 95 Q 80 82 90 82 Q 100 82 100 95 L 100 105"
            stroke="#7CB564"
            strokeWidth={3.5}
            fill="none"
            opacity={0.8}
          />
          <Circle cx={90} cy={117} r={3} fill="#2A3A20" />

          {/* Decorative screen elements */}
          <Rect
            x={30}
            y={45}
            width={50}
            height={6}
            rx={3}
            fill="#7CB564"
            opacity={0.2}
          />
          <Rect
            x={30}
            y={58}
            width={35}
            height={6}
            rx={3}
            fill="#7CB564"
            opacity={0.15}
          />
          <Rect
            x={30}
            y={190}
            width={120}
            height={8}
            rx={4}
            fill="#7CB564"
            opacity={0.1}
          />
          <Rect
            x={30}
            y={210}
            width={80}
            height={8}
            rx={4}
            fill="#7CB564"
            opacity={0.08}
          />

          {/* Notch */}
          <Rect x={60} y={14} width={60} height={8} rx={4} fill="#1A2A14" />
        </Svg>
      </Animated.View>

      {/* Orbiting coins */}
      {coins.map((c, i) => (
        <OrbitingCoin
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
