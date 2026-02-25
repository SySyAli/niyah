import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  FontWeight,
  Font,
} from "../constants/colors";
import { useColors } from "../hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAD_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const KEY_SIZE = (PAD_WIDTH - 32) / 3;

interface NumPadKeyProps {
  value: string;
  onPress: (value: string) => void;
  variant?: "default" | "action";
}

const NumPadKey: React.FC<NumPadKeyProps> = ({
  value,
  onPress,
  variant = "default",
}) => {
  const Colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const isBackspace = value === "backspace";
  const isEmpty = value === "";

  const styles = useMemo(() => StyleSheet.create({
    key: {
      width: KEY_SIZE,
      height: KEY_SIZE * 0.65,
      borderRadius: Radius.md,
      backgroundColor: Colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    keyPlaceholder: {
      width: KEY_SIZE,
      height: KEY_SIZE * 0.65,
    },
    keyText: {
      fontSize: Typography.headlineMedium,
      ...Font.medium,
      color: Colors.text,
    },
    actionKeyText: {
      color: Colors.textSecondary,
    },
    backspaceText: {
      fontSize: Typography.bodyMedium,
      ...Font.medium,
      color: Colors.textSecondary,
    },
  }), [Colors]);

  if (isEmpty) {
    return <View style={styles.keyPlaceholder} />;
  }

  return (
    <Pressable
      onPress={() => onPress(value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.key, { transform: [{ scale: scaleAnim }] }]}
      >
        {isBackspace ? (
          <Text style={styles.backspaceText}>Delete</Text>
        ) : (
          <Text
            style={[
              styles.keyText,
              variant === "action" && styles.actionKeyText,
            ]}
          >
            {value}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

interface NumPadProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  showDecimal?: boolean;
}

export const NumPad: React.FC<NumPadProps> = ({
  onKeyPress,
  onBackspace,
  showDecimal = false,
}) => {
  const handlePress = (value: string) => {
    if (value === "backspace") {
      onBackspace();
    } else {
      onKeyPress(value);
    }
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [showDecimal ? "." : "", "0", "backspace"],
  ];

  return (
    <View style={containerStyles.container}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={containerStyles.row}>
          {row.map((key, keyIndex) => (
            <NumPadKey
              key={`${rowIndex}-${keyIndex}`}
              value={key}
              onPress={handlePress}
              variant={key === "backspace" ? "action" : "default"}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const containerStyles = StyleSheet.create({
  container: {
    width: PAD_WIDTH,
    alignSelf: "center",
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
});

// Amount display with cursor animation
interface AmountDisplayProps {
  amount: string;
  label?: string;
  placeholder?: string;
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  label,
  placeholder = "$0",
}) => {
  const Colors = useColors();
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = () => {
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => blink());
    };
    blink();
  }, [cursorOpacity]);

  const displayAmount = amount || placeholder;
  const isEmpty = !amount;

  const styles = useMemo(() => StyleSheet.create({
    amountContainer: {
      alignItems: "center",
      paddingVertical: Spacing.xl,
    },
    amountLabel: {
      fontSize: Typography.labelLarge,
      color: Colors.textSecondary,
      marginBottom: Spacing.sm,
      ...Font.medium,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    amountText: {
      fontSize: Typography.displayLarge,
      ...Font.semibold,
      color: Colors.text,
      letterSpacing: -2,
    },
    placeholderText: {
      color: Colors.textTertiary,
    },
    cursor: {
      width: 3,
      height: 50,
      backgroundColor: Colors.primary,
      marginLeft: 2,
      borderRadius: 2,
    },
  }), [Colors]);

  return (
    <View style={styles.amountContainer}>
      {label && <Text style={styles.amountLabel}>{label}</Text>}
      <View style={styles.amountRow}>
        <Text style={[styles.amountText, isEmpty && styles.placeholderText]}>
          {displayAmount}
        </Text>
        {!isEmpty && (
          <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
        )}
      </View>
    </View>
  );
};
