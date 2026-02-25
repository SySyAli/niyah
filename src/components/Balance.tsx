import React, { useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Typography, Spacing, FontWeight, Font } from "../constants/colors";
import { useColors } from "../hooks/useColors";
import { formatMoney } from "../utils/format";

interface BalanceProps {
  amount: number; // in cents
  label?: string;
  size?: "small" | "medium" | "large" | "display";
  showSign?: boolean;
  showCents?: boolean;
  animate?: boolean;
  color?: "default" | "gain" | "loss" | "auto";
}

export const Balance: React.FC<BalanceProps> = ({
  amount,
  label,
  size = "medium",
  showSign = false,
  showCents = true,
  animate = true,
  color = "default",
}) => {
  const Colors = useColors();
  const opacityAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const isPositive = amount >= 0;

  useEffect(() => {
    if (animate) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [animate, opacityAnim]);

  const getColor = () => {
    if (color === "gain") return Colors.gain;
    if (color === "loss") return Colors.loss;
    if (color === "auto") return isPositive ? Colors.gain : Colors.loss;
    return Colors.text;
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return Typography.titleSmall;
      case "medium":
        return Typography.headlineMedium;
      case "large":
        return Typography.displaySmall;
      case "display":
        return Typography.displayLarge;
    }
  };

  const displayAmount =
    showSign && isPositive
      ? `+${formatMoney(amount, showCents)}`
      : formatMoney(amount, showCents);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: "flex-start",
        },
        label: {
          fontSize: Typography.labelLarge,
          color: Colors.textSecondary,
          marginBottom: Spacing.xs,
          ...Font.medium,
        },
        amount: {
          ...Font.bold,
          fontVariant: ["tabular-nums"],
          letterSpacing: -1,
        },
        compactAmount: {
          fontSize: Typography.bodyMedium,
          ...Font.semibold,
          fontVariant: ["tabular-nums"],
        },
      }),
    [Colors],
  );

  return (
    <View style={styles.container}>
      {label && (
        <Animated.Text style={[styles.label, { opacity: opacityAnim }]}>
          {label}
        </Animated.Text>
      )}
      <Animated.Text
        style={[
          styles.amount,
          {
            fontSize: getFontSize(),
            color: getColor(),
            opacity: opacityAnim,
          },
        ]}
      >
        {displayAmount}
      </Animated.Text>
    </View>
  );
};

// Compact balance display for lists
interface CompactBalanceProps {
  amount: number;
  showSign?: boolean;
}

export const CompactBalance: React.FC<CompactBalanceProps> = ({
  amount,
  showSign = false,
}) => {
  const Colors = useColors();
  const isPositive = amount >= 0;
  const color = isPositive ? Colors.gain : Colors.loss;
  const prefix = showSign ? (isPositive ? "+" : "-") : amount < 0 ? "-" : "";

  const compactAmountStyle = {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  };

  return (
    <Text style={[compactAmountStyle, { color }]}>
      {prefix}
      {formatMoney(Math.abs(amount))}
    </Text>
  );
};

// Animated digit (simplified)
export const AnimatedDigit: React.FC<{
  digit: string;
  fontSize: number;
  color: string;
}> = ({ digit, fontSize, color }) => (
  <Text style={{ fontSize, ...Font.bold, color }}>{digit}</Text>
);
