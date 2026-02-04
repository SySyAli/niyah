import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Animated } from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Card, Button, Balance, Confetti } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { useSessionStore } from "../../src/store/sessionStore";
import { formatMoney } from "../../src/utils/format";

export default function CompleteScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const sessionHistory = useSessionStore((state) => state.sessionHistory);
  const [showConfetti, setShowConfetti] = useState(true);

  const lastSession = sessionHistory[0];

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide confetti after animation completes
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleDone = () => {
    router.replace("/(tabs)");
  };

  const getStreakMessage = () => {
    const streak = user?.currentStreak || 0;
    if (streak === 1) return "Great start! Keep going tomorrow.";
    if (streak >= 10) return "Incredible! You are unstoppable!";
    if (streak >= 5) return "Amazing streak! Bonus multipliers unlocked!";
    if (streak >= 3) return `${streak}-day streak! You are on fire!`;
    return `${streak}-day streak! Keep it going!`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {showConfetti && <Confetti count={60} />}
      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.checkCircle}>
            <Text style={styles.checkmark}>Done</Text>
          </View>
          <Text style={styles.title}>Congratulations</Text>
          <Text style={styles.subtitle}>You completed your focus session</Text>
        </Animated.View>

        {/* Earnings Card */}
        <Card style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>You earned</Text>
          <Balance
            amount={lastSession?.actualPayout || 0}
            size="display"
            color="gain"
          />
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {formatMoney(user?.totalEarnings || 0, false)}
            </Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>

        {/* Motivation Card */}
        <Card style={styles.motivationCard}>
          <Text style={styles.motivationText}>{getStreakMessage()}</Text>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Button title="Done" onPress={handleDone} size="large" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gainLight,
    borderWidth: 3,
    borderColor: Colors.gain,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  checkmark: {
    fontSize: Typography.titleMedium,
    fontWeight: "700",
    color: Colors.gain,
  },
  title: {
    fontSize: Typography.displaySmall,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  earningsCard: {
    alignItems: "center",
    backgroundColor: Colors.gainLight,
    borderWidth: 1,
    borderColor: Colors.gain,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  earningsLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  statValue: {
    fontSize: Typography.headlineSmall,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  motivationCard: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.xl,
  },
  motivationText: {
    fontSize: Typography.bodyMedium,
    color: Colors.text,
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    gap: Spacing.md,
  },
});
