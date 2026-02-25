import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Font,
} from "../../src/constants/colors";
import { Card, Button, Timer } from "../../src/components";
import * as Haptics from "expo-haptics";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { useCountdown } from "../../src/hooks/useCountdown";
import { formatMoney } from "../../src/utils/format";

export default function ActiveSessionScreen() {
  const router = useRouter();
  const { activeGroupSession, completeGroupSession } = useGroupSessionStore();
  // Tracks intentional navigation away (complete or surrender) so the
  // useEffect guard doesn't redirect home when activeGroupSession clears.
  const isNavigatingAwayRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartedAt, setPauseStartedAt] = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState(0);

  const { timeRemaining, start, stop } = useCountdown({
    onComplete: () => {
      isNavigatingAwayRef.current = true;
      // Delay by one animation cycle (950ms + buffer) so the final drain
      // animation reaches 100% before we navigate away.
      setTimeout(() => {
        const session = useGroupSessionStore.getState().activeGroupSession;
        if (session) {
          completeGroupSession(
            session.participants.map((p) => ({
              userId: p.userId,
              completed: true,
            })),
          );
        }
        router.replace("/session/complete");
      }, 1000);
    },
  });

  useEffect(() => {
    if (activeGroupSession) {
      if (isPaused) {
        stop();
      } else {
        start(new Date(activeGroupSession.endsAt.getTime() + totalPausedMs));
      }
    } else if (!isNavigatingAwayRef.current) {
      // No active session and we didn't navigate away ourselves — stale route.
      router.replace("/(tabs)");
    }
  }, [activeGroupSession, isPaused, router, start, stop, totalPausedMs]);

  if (!activeGroupSession) {
    return null;
  }

  const handlePauseResume = () => {
    if (isPaused) {
      const pausedAt = pauseStartedAt ?? Date.now();
      const pausedDuration = Date.now() - pausedAt;
      setTotalPausedMs((previous) => previous + pausedDuration);
      setPauseStartedAt(null);
      setIsPaused(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setPauseStartedAt(Date.now());
      setIsPaused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const currentPauseMs =
    isPaused && pauseStartedAt ? Date.now() - pauseStartedAt : 0;
  const totalDuration =
    activeGroupSession.endsAt.getTime() -
    activeGroupSession.startedAt.getTime() +
    totalPausedMs +
    currentPauseMs;
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
            <View
              style={[
                styles.statusDot,
                isPaused && { backgroundColor: Colors.warning },
              ]}
            />
            <Text
              style={[styles.statusText, isPaused && { color: Colors.warning }]}
            >
              {isPaused ? "SESSION PAUSED" : "SESSION ACTIVE"}
            </Text>
          </View>
          <Text style={styles.title}>Stay Focused</Text>
          <Text style={styles.subtitle}>
            {isPaused
              ? "Timer is paused — resume when you're ready"
              : "Distracting apps are blocked"}
          </Text>
        </View>

        {/* Timer */}
        <View style={styles.timerSection}>
          <Timer
            timeRemaining={timeRemaining}
            totalTime={totalDuration}
            size="medium"
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
            {formatMoney(activeGroupSession.stakePerParticipant)}
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
          <View style={styles.footerButtonsRow}>
            <View style={styles.footerButton}>
              <Button
                title={isPaused ? "Resume" : "Pause"}
                onPress={handlePauseResume}
                variant="secondary"
                size="medium"
              />
            </View>
            <View style={styles.footerButton}>
              <Button
                title="Surrender"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  isNavigatingAwayRef.current = true;
                  router.push("/session/surrender");
                }}
                variant="outline"
                size="medium"
              />
            </View>
          </View>
          <Text style={styles.warningText}>
            Warning: Surrendering forfeits your{" "}
            {formatMoney(activeGroupSession.stakePerParticipant)} stake
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
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
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
    ...Font.bold,
    color: Colors.gain,
    letterSpacing: 1,
  },
  title: {
    fontSize: Typography.headlineMedium,
    ...Font.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  timerSection: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressSection: {
    marginBottom: Spacing.md,
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
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  payoutLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  payoutAmount: {
    fontSize: Typography.titleLarge,
    ...Font.bold,
    color: Colors.gain,
  },
  tipsSection: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tipsList: {
    gap: 4,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  tipBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    marginTop: "auto",
    gap: Spacing.sm,
  },
  footerButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
  warningText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: Typography.labelSmall,
  },
});
