import React, { useRef } from "react";
import {
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Pressable,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Colors,
  Radius,
  Typography,
  FontWeight,
  Font,
} from "../constants/colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const getBackgroundColor = () => {
    if (disabled) return Colors.buttonDisabled;
    switch (variant) {
      case "primary":
        return Colors.primary;
      case "secondary":
        return Colors.backgroundSecondary;
      case "danger":
        return Colors.danger;
      case "ghost":
        return "transparent";
      case "outline":
        return "transparent";
      default:
        return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.textTertiary;
    switch (variant) {
      case "primary":
        return Colors.white;
      case "secondary":
        return Colors.text;
      case "danger":
        return Colors.white;
      case "ghost":
        return Colors.primary;
      case "outline":
        return Colors.text;
      default:
        return Colors.white;
    }
  };

  const getPadding = () => {
    switch (size) {
      case "small":
        return { paddingVertical: 10, paddingHorizontal: 16 };
      case "medium":
        return { paddingVertical: 16, paddingHorizontal: 24 };
      case "large":
        return { paddingVertical: 18, paddingHorizontal: 32 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return Typography.bodySmall;
      case "medium":
        return Typography.bodyMedium;
      case "large":
        return Typography.bodyLarge;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={fullWidth && styles.fullWidth}
    >
      <Animated.View
        style={[
          styles.base,
          {
            backgroundColor: getBackgroundColor(),
            ...getPadding(),
            transform: [{ scale: scaleAnim }],
          },
          variant === "outline" && styles.outline,
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "primary" ? Colors.white : Colors.text}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: {
    width: "100%",
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    ...Font.semibold,
    letterSpacing: 0.3,
  },
});
