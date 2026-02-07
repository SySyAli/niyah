import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Card, Button, Timer } from "../../src/components";
import { usePartnerStore } from "../../src/store/partnerStore";
import { useCountdown } from "../../src/hooks/useCountdown";
import { formatMoney } from "../../src/utils/format";

export default function ActiveSessionScreen() {
  const router = useRouter();
  const { activeDuoSession, completeDuoSession } = usePartnerStore();

  const { timeRemaining, start } = useCountdown({
    onComplete: () => {
      completeDuoSession(true, true); // User completed, assume partner completed for demo
      router.replace("/session/complete");
    },
  });

  useEffect(() => {
    if (activeDuoSession) {
      start(activeDuoSession.endsAt);
    } else {
      router.replace("/(tabs)");
    }
  }, [activeDuoSession, router, start]);

  if (!activeDuoSession) {
    return null;
  }

  const totalDuration =
    activeDuoSession.endsAt.getTime() - activeDuoSession.startedAt.getTime();
  const progress = 1 - timeRemaining / totalDuration;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(progress * 100)),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Status Header */}
        <View style={styles.header}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>SESSION ACTIVE</Text>
          </View>
          <Text style={styles.title}>Stay Focused</Text>
          <Text style={styles.subtitle}>Distracting apps are blocked</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerSection}>
          <Timer
            timeRemaining={timeRemaining}
            totalTime={totalDuration}
            size="large"
            showProgress={true}
          />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{progressPercent}% complete</Text>
        </View>

        {/* Payout Card */}
        <Card style={styles.payoutCard}>
          <Text style={styles.payoutLabel}>Complete to keep</Text>
          <Text style={styles.payoutAmount}>
            {formatMoney(activeDuoSession.stakeAmount)}
          </Text>
        </Card>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Stay strong</Text>
          <View style={styles.tipsList}>
            {[
              "Put your phone face down",
              "Take short breaks for water",
              "Deep breaths help refocus",
            ].map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="I Need to Surrender"
            onPress={() => router.push("/session/surrender")}
            variant="outline"
            size="large"
          />
          <Text style={styles.warningText}>
            Warning: Surrendering forfeits your{" "}
            {formatMoney(activeDuoSession.stakeAmount)} stake
          </Text>
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
  },
  header: {
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gainLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gain,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.labelSmall,
    fontWeight: "700",
    color: Colors.gain,
    letterSpacing: 1,
  },
  title: {
    fontSize: Typography.headlineLarge,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  timerSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  progressSection: {
    marginBottom: Spacing.xl,
  },
  progressContainer: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  progressText: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  payoutCard: {
    alignItems: "center",
    backgroundColor: Colors.gainLight,
    borderWidth: 1,
    borderColor: Colors.gain,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  payoutLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  payoutAmount: {
    fontSize: Typography.displaySmall,
    fontWeight: "700",
    color: Colors.gain,
  },
  tipsSection: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tipsTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tipsList: {
    gap: Spacing.xs,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  tipText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
  footer: {
    marginTop: "auto",
    gap: Spacing.md,
  },
  warningText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: Typography.labelSmall,
  },
});
