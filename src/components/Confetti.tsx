import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { Colors } from "../constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ConfettiPieceProps {
  delay: number;
  startX: number;
  color: string;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({
  delay,
  startX,
  color,
}) => {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 2500 + Math.random() * 1500;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        // Fade in quickly
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        // Fall down
        Animated.timing(fallAnim, {
          toValue: SCREEN_HEIGHT + 50,
          duration: duration,
          useNativeDriver: true,
        }),
        // Sway left and right
        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, {
              toValue: 30,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(swayAnim, {
              toValue: -30,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ),
        // Rotate
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ),
      ]),
    ]).start();
  }, [delay, fallAnim, opacityAnim, rotateAnim, swayAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const pieceSize = 8 + Math.random() * 8;

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: startX,
          width: pieceSize,
          height: pieceSize * (0.5 + Math.random() * 0.5),
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? pieceSize / 2 : 2,
          opacity: opacityAnim,
          transform: [
            { translateY: fallAnim },
            { translateX: swayAnim },
            { rotate: spin },
          ],
        },
      ]}
    />
  );
};

interface ConfettiProps {
  count?: number;
  colors?: string[];
}

export const Confetti: React.FC<ConfettiProps> = ({
  count = 50,
  colors = [
    Colors.primary,
    Colors.primaryLight,
    Colors.accentGold, // Dark goldenrod
    Colors.accentClay, // Deep clay red
    "#2A6F97", // Deep teal-blue
    Colors.accent, // Deep plum
    "#8B6914", // Dark amber
  ],
}) => {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    startX: Math.random() * SCREEN_WIDTH,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          startX={piece.startX}
          color={piece.color}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  confettiPiece: {
    position: "absolute",
    top: -20,
  },
});
