import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors, Typography, Spacing } from "../constants/colors";
import { formatTime } from "../utils/format";

interface TimerProps {
  timeRemaining: number; // in milliseconds
  totalTime?: number; // total session time in milliseconds
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  showProgress?: boolean;
}

export const Timer: React.FC<TimerProps> = ({
  timeRemaining,
  totalTime = timeRemaining,
  size = "large",
  showLabel = true,
  showProgress = true,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isLow = timeRemaining < 60000; // Less than 1 minute
  const isCritical = timeRemaining < 10000; // Less than 10 seconds

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  const getTimerSize = () => {
    switch (size) {
      case "small":
        return { ring: 120, stroke: 6, font: Typography.headlineMedium };
      case "medium":
        return { ring: 180, stroke: 8, font: Typography.displaySmall };
      case "large":
        return { ring: 240, stroke: 10, font: Typography.displayMedium };
    }
  };

  const timerSize = getTimerSize();
  const progress = totalTime > 0 ? timeRemaining / totalTime : 1;

  // SVG circle calculations
  const radius = (timerSize.ring - timerSize.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (isCritical) return Colors.danger;
    if (isLow) return Colors.warning;
    return Colors.primary;
  };

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      {showProgress && (
        <View
          style={[
            styles.ringContainer,
            { width: timerSize.ring, height: timerSize.ring },
          ]}
        >
          {/* SVG Progress Ring */}
          <Svg
            width={timerSize.ring}
            height={timerSize.ring}
            style={styles.svgContainer}
          >
            {/* Background circle */}
            <Circle
              cx={timerSize.ring / 2}
              cy={timerSize.ring / 2}
              r={radius}
              stroke={Colors.backgroundTertiary}
              strokeWidth={timerSize.stroke}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={timerSize.ring / 2}
              cy={timerSize.ring / 2}
              r={radius}
              stroke={getColor()}
              strokeWidth={timerSize.stroke}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${timerSize.ring / 2}, ${timerSize.ring / 2}`}
            />
          </Svg>

          {/* Center content */}
          <View style={styles.timeContainer}>
            {showLabel && <Text style={styles.label}>Remaining</Text>}
            <Text
              style={[
                styles.time,
                { fontSize: timerSize.font, color: getColor() },
              ]}
            >
              {formatTime(timeRemaining)}
            </Text>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      )}
      {!showProgress && (
        <View style={styles.simpleContainer}>
          {showLabel && <Text style={styles.label}>Time Remaining</Text>}
          <Text
            style={[
              styles.time,
              { fontSize: timerSize.font, color: getColor() },
            ]}
          >
            {formatTime(timeRemaining)}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

// Simple inline timer for headers
interface InlineTimerProps {
  timeRemaining: number;
}

export const InlineTimer: React.FC<InlineTimerProps> = ({ timeRemaining }) => {
  const isLow = timeRemaining < 60000;

  return (
    <Text style={[styles.inlineTime, isLow && { color: Colors.warning }]}>
      {formatTime(timeRemaining)}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  svgContainer: {
    position: "absolute",
  },
  timeContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  simpleContainer: {
    alignItems: "center",
  },
  label: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  time: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  progressText: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  inlineTime: {
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
});
