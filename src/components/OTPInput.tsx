import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Colors,
  Spacing,
  Radius,
  Typography,
  FontWeight,
  Font,
} from "../constants/colors";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
}

const CELL_SIZE = 52;
const CELL_GAP = Spacing.sm;

const AnimatedCell: React.FC<{
  index: number;
  digit: string;
  isFocused: boolean;
  isActive: boolean;
  error: boolean;
}> = ({ index, digit, isFocused, isActive, error }) => {
  const scale = useSharedValue(1);
  const cursorOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const borderColorProgress = useSharedValue(0);

  // Blinking cursor for the active (focused) cell
  useEffect(() => {
    if (isActive) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 350, easing: Easing.ease }),
          withTiming(1, { duration: 400 }),
          withTiming(0, { duration: 350, easing: Easing.ease }),
        ),
        -1,
        false,
      );
    } else {
      cursorOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isActive, cursorOpacity]);

  // Scale up when digit is filled
  useEffect(() => {
    if (digit) {
      scale.value = withSpring(1, {
        damping: 8,
        stiffness: 300,
        mass: 0.6,
      });
      // Briefly overshoot then settle
      scale.value = withSequence(
        withSpring(1.12, { damping: 6, stiffness: 400, mass: 0.5 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [digit, scale]);

  // Border color animation for focused state
  useEffect(() => {
    borderColorProgress.value = withTiming(isFocused || isActive ? 1 : 0, {
      duration: 200,
    });
  }, [isFocused, isActive, borderColorProgress]);

  // Shake animation for error
  useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(3, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shakeX]);

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
  }));

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const getBorderColor = () => {
    if (error) return Colors.danger;
    if (isActive || isFocused) return Colors.borderFocused;
    if (digit) return Colors.primary;
    return Colors.border;
  };

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(300)}
      style={[
        styles.cell,
        cellStyle,
        {
          borderColor: getBorderColor(),
          borderWidth: isActive || error ? 2 : 1.5,
          backgroundColor: digit
            ? Colors.backgroundTertiary
            : Colors.backgroundCard,
        },
      ]}
    >
      {digit ? (
        <Text style={[styles.digit, error && styles.digitError]}>{digit}</Text>
      ) : isActive ? (
        <Animated.View style={[styles.cursor, cursorStyle]} />
      ) : null}
    </Animated.View>
  );
};

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  error = false,
}) => {
  const inputRef = useRef<TextInput>(null);

  const handlePress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      // Only allow digits
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, length);

      // Haptic feedback when a new digit is added
      if (cleaned.length > value.length) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Notify when all digits are filled
      if (cleaned.length === length && value.length < length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onChange(cleaned);
    },
    [length, onChange, value.length],
  );

  // Trigger error haptic
  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [error]);

  const digits = value.split("");
  const activeIndex = digits.length < length ? digits.length : -1;

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.cellsRow}>
        {Array.from({ length }, (_, index) => (
          <AnimatedCell
            key={index}
            index={index}
            digit={digits[index] || ""}
            isFocused={index < digits.length}
            isActive={index === activeIndex}
            error={error}
          />
        ))}
      </View>

      {/* Hidden TextInput that captures keyboard input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        textContentType="oneTimeCode"
        caretHidden
        autoFocus={false}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  cellsRow: {
    flexDirection: "row",
    gap: CELL_GAP,
    justifyContent: "center",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 8,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: {
    fontSize: Typography.headlineSmall,
    ...Font.bold,
    color: Colors.text,
    textAlign: "center",
  },
  digitError: {
    color: Colors.danger,
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
