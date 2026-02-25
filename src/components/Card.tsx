import React, { useRef, useEffect, useMemo } from "react";
import {
  StyleSheet,
  ViewStyle,
  StyleProp,
  Pressable,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Radius, Spacing } from "../constants/colors";
import { useColors } from "../hooks/useColors";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "elevated" | "outlined" | "interactive";
  onPress?: () => void;
  animate?: boolean;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = "default",
  onPress,
  animate = true,
  delay = 0,
}) => {
  const Colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, [animate, delay, opacityAnim]);

  const handlePressIn = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: Colors.backgroundCard,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
        },
        elevated: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        },
        outlined: {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: Colors.border,
        },
        interactive: {
          backgroundColor: Colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: Colors.border,
        },
      }),
    [Colors],
  );

  const getVariantStyle = () => {
    switch (variant) {
      case "elevated":
        return styles.elevated;
      case "outlined":
        return styles.outlined;
      case "interactive":
        return styles.interactive;
      default:
        return {};
    }
  };

  const content = (
    <Animated.View
      style={[
        styles.card,
        getVariantStyle(),
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};
