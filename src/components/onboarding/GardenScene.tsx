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
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path, Ellipse, Rect } from "react-native-svg";

interface SceneProps {
  scrollX: SharedValue<number>;
  pageIndex: number;
  pageWidth: number;
  size: number;
}

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
  const pulse = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
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
          [20, 0, -10],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const sunStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.3, 1],
      [0, 0.8, 1, 0.8, 0],
    ),
    transform: [
      {
        scale:
          interpolate(
            progress.value,
            [-1, 0, 1],
            [0.6, 1, 0.8],
            Extrapolation.CLAMP,
          ) * interpolate(pulse.value, [0, 1], [0.97, 1.03]),
      },
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

  const plantStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.5, 1],
      [0, 0.5, 1, 1, 0],
    ),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [-1, -0.2, 0],
          [0.3, 0.8, 1],
          Extrapolation.CLAMP,
        ),
      },
      { rotate: `${interpolate(sway.value, [0, 1], [-1.5, 1.5])}deg` },
    ],
  }));

  const potStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [-1, -0.3, 0, 0.5, 1],
      [0, 0.5, 1, 0.8, 0],
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [-1, -0.1, 0],
          [30, 5, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Soft glow behind plant
  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(
        progress.value,
        [-1, -0.2, 0, 0.3, 1],
        [0, 0.2, 0.4, 0.2, 0],
      ) * interpolate(pulse.value, [0, 1], [0.7, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
  }));

  const cx = size / 2;
  const hillH = size * 0.38;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Soft glow */}
      <Animated.View
        style={[
          styles.absolute,
          { left: cx - size * 0.25, top: size * 0.2 },
          glowStyle,
        ]}
      >
        <Svg width={size * 0.5} height={size * 0.5}>
          <Circle
            cx={size * 0.25}
            cy={size * 0.25}
            r={size * 0.22}
            fill="#A8D5A2"
            opacity={0.25}
          />
          <Circle
            cx={size * 0.25}
            cy={size * 0.25}
            r={size * 0.14}
            fill="#C5E6C0"
            opacity={0.2}
          />
        </Svg>
      </Animated.View>

      {/* Sun */}
      <Animated.View
        style={[
          styles.absolute,
          { right: size * 0.06, top: size * 0.04 },
          sunStyle,
        ]}
      >
        <Svg width={size * 0.24} height={size * 0.24}>
          <Circle
            cx={size * 0.12}
            cy={size * 0.12}
            r={size * 0.11}
            fill="#F5DEB3"
            opacity={0.2}
          />
          <Circle
            cx={size * 0.12}
            cy={size * 0.12}
            r={size * 0.075}
            fill="#F0D9A0"
            opacity={0.35}
          />
          <Circle
            cx={size * 0.12}
            cy={size * 0.12}
            r={size * 0.045}
            fill="#EDD49A"
          />
        </Svg>
      </Animated.View>

      {/* Rolling hills */}
      <Animated.View
        style={[styles.absolute, { bottom: 0, left: 0, right: 0 }, hillsStyle]}
      >
        <Svg width={size} height={hillH} viewBox="0 0 400 160">
          <Path
            d="M -20 100 Q 100 40 200 70 Q 300 100 420 50 L 420 160 L -20 160 Z"
            fill="#B8D9B0"
            opacity={0.35}
          />
          <Path
            d="M -20 120 Q 80 70 180 95 Q 280 120 420 80 L 420 160 L -20 160 Z"
            fill="#9BC887"
            opacity={0.4}
          />
          <Path
            d="M -20 140 Q 120 105 220 125 Q 320 145 420 120 L 420 160 L -20 160 Z"
            fill="#7CB564"
            opacity={0.3}
          />
        </Svg>
      </Animated.View>

      {/* Pot */}
      <Animated.View
        style={[
          styles.absolute,
          { bottom: size * 0.12, left: cx - size * 0.075 },
          potStyle,
        ]}
      >
        <Svg width={size * 0.15} height={size * 0.12} viewBox="0 0 60 50">
          <Path
            d="M 8 0 L 52 0 L 46 40 Q 45 50 30 50 Q 15 50 14 40 Z"
            fill="#C4A87A"
          />
          <Path d="M 10 0 L 50 0 L 49 7 L 11 7 Z" fill="#D4BC94" />
          <Ellipse
            cx={30}
            cy={4}
            rx={22}
            ry={4}
            fill="#B09868"
            opacity={0.25}
          />
        </Svg>
      </Animated.View>

      {/* Plant stem + leaves */}
      <Animated.View
        style={[
          styles.absolute,
          {
            bottom: size * 0.22,
            left: cx - 2.5,
            transformOrigin: "bottom center",
          },
          plantStyle,
        ]}
      >
        <Svg width={size * 0.2} height={size * 0.42} viewBox="-30 0 65 180">
          <Rect
            x={0}
            y={0}
            width={5}
            height={180}
            rx={2.5}
            fill="#7CB564"
            opacity={0.85}
          />
          {/* Leaves */}
          <Path
            d="M 5 130 Q 22 120 28 108"
            stroke="#7CB564"
            strokeWidth={2}
            fill="none"
            opacity={0.7}
          />
          <Ellipse
            cx={30}
            cy={106}
            rx={10}
            ry={5}
            fill="#9BC887"
            opacity={0.5}
            transform="rotate(-25 30 106)"
          />
          <Path
            d="M 0 100 Q -18 92 -22 80"
            stroke="#7CB564"
            strokeWidth={2}
            fill="none"
            opacity={0.7}
          />
          <Ellipse
            cx={-24}
            cy={78}
            rx={10}
            ry={5}
            fill="#9BC887"
            opacity={0.5}
            transform="rotate(25 -24 78)"
          />
          <Path
            d="M 5 65 Q 20 58 25 48"
            stroke="#7CB564"
            strokeWidth={1.8}
            fill="none"
            opacity={0.6}
          />
          <Ellipse
            cx={27}
            cy={46}
            rx={8}
            ry={4}
            fill="#A8D5A2"
            opacity={0.45}
            transform="rotate(-20 27 46)"
          />
          <Path
            d="M 0 35 Q -15 28 -18 18"
            stroke="#7CB564"
            strokeWidth={1.5}
            fill="none"
            opacity={0.55}
          />
          <Ellipse
            cx={-20}
            cy={16}
            rx={7}
            ry={3.5}
            fill="#A8D5A2"
            opacity={0.4}
            transform="rotate(20 -20 16)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignSelf: "center" },
  absolute: { position: "absolute" },
});
