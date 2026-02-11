import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  FontWeight,
} from "../../src/constants/colors";
import { Card, Button, Balance, Confetti } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { usePartnerStore } from "../../src/store/partnerStore";
import { formatMoney } from "../../src/utils/format";

export default function CompleteScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { duoSessionHistory, markSettlementReceived } = usePartnerStore();
  const [showConfetti, setShowConfetti] = useState(true);

  const lastSession = duoSessionHistory[0];

  // Determine outcome
  const userWon = lastSession?.userCompleted && !lastSession?.partnerCompleted;
  const bothCompleted =
    lastSession?.userCompleted && lastSession?.partnerCompleted;
  const amountOwed = lastSession?.amountOwed || 0;

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
  }, [opacityAnim, scaleAnim]);

  const handleDone = () => {
    router.replace("/(tabs)");
  };

  const handleMarkReceived = () => {
    if (lastSession) {
      markSettlementReceived(lastSession.id);
    }
  };

  const getStreakMessage = () => {
    const streak = user?.currentStreak || 0;
    if (streak === 1) return "Great start! Keep growing your plant.";
    if (streak >= 10) return "Incredible! Your money plant is thriving!";
    if (streak >= 5) return "Amazing streak! You're becoming an Oak!";
    if (streak >= 3) return `${streak}-day streak! Your plant is growing!`;
    return `${streak}-day streak! Keep it going!`;
  };

  const getOutcomeMessage = () => {
    if (bothCompleted) {
      return "You and your partner both completed! You both keep your stakes.";
    }
    if (userWon) {
      return `You won! ${lastSession?.partnerName} owes you ${formatMoney(Math.abs(amountOwed))}.`;
    }
    return "Great job completing your session!";
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
          <Text style={styles.subtitle}>You completed your duo session</Text>
        </Animated.View>

        {/* Outcome Card */}
        <Card style={styles.outcomeCard}>
          <Text style={styles.outcomeLabel}>
            {bothCompleted
              ? "Both Completed"
              : userWon
                ? "You Won!"
                : "Session Complete"}
          </Text>
          <Text style={styles.outcomeMessage}>{getOutcomeMessage()}</Text>

          {/* Stake returned */}
          <View style={styles.stakeRow}>
            <Text style={styles.stakeLabel}>Stake returned:</Text>
            <Balance
              amount={lastSession?.stakeAmount || 0}
              size="large"
              color="gain"
            />
          </View>
        </Card>

        {/* Settlement Card - if user won */}
        {userWon && amountOwed < 0 && (
          <Card style={styles.settlementCard}>
            <Text style={styles.settlementTitle}>Awaiting Payment</Text>
            <Text style={styles.settlementText}>
              {lastSession?.partnerName} should pay you{" "}
              {formatMoney(Math.abs(amountOwed))} via Venmo
            </Text>
            {lastSession?.partnerVenmo && (
              <Text style={styles.venmoHandle}>{lastSession.partnerVenmo}</Text>
            )}
            <View style={styles.settlementButtons}>
              <Button
                title="Mark as Received"
                onPress={handleMarkReceived}
                variant="primary"
              />
            </View>
            <Text style={styles.settlementNote}>
              Mark as received once payment is confirmed
            </Text>
          </Card>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {user?.reputation?.score || 50}
            </Text>
            <Text style={styles.statLabel}>Rep Score</Text>
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
    fontWeight: FontWeight.bold,
    color: Colors.gain,
  },
  title: {
    fontSize: Typography.displaySmall,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Outcome card
  outcomeCard: {
    alignItems: "center",
    backgroundColor: Colors.gainLight,
    borderWidth: 1,
    borderColor: Colors.gain,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  outcomeLabel: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.gain,
    marginBottom: Spacing.xs,
  },
  outcomeMessage: {
    fontSize: Typography.bodySmall,
    color: Colors.text,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  stakeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stakeLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
  },
  // Settlement card
  settlementCard: {
    alignItems: "center",
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  settlementTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  settlementText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  venmoHandle: {
    fontSize: Typography.bodyMedium,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  settlementButtons: {
    marginBottom: Spacing.sm,
  },
  settlementNote: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    textAlign: "center",
  },
  // Stats
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
    fontWeight: FontWeight.bold,
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
