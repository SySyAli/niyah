import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Typography, Spacing, Radius, Font } from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import {
  Card,
  Button,
  Timer,
  SessionScreenScaffold,
} from "../../src/components";
import * as Haptics from "expo-haptics";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { useCountdown } from "../../src/hooks/useCountdown";
import { formatMoney } from "../../src/utils/format";
import { SOLO_COMPLETION_MULTIPLIER } from "../../src/constants/config";
import {
  stopBlocking,
  onShieldViolation,
  isScreenTimeAvailable,
} from "../../src/config/screentime";

type SessionMode = "solo_quick" | "solo_scheduled" | "group";

export default function ActiveSessionScreen() {
  const Colors = useColors();
  const params = useLocalSearchParams<{ mode?: SessionMode }>();
  const mode: SessionMode = params.mode ?? "group";
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        violationCard: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: Colors.lossLight,
          borderWidth: 1,
          borderColor: Colors.loss,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          marginBottom: Spacing.md,
          borderRadius: Radius.lg,
        },
        violationLabel: {
          fontSize: Typography.bodySmall,
          color: Colors.loss,
          ...Font.medium,
        },
        violationCount: {
          fontSize: Typography.titleMedium,
          ...Font.bold,
          color: Colors.loss,
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
        footerButtonsRow: {
          flexDirection: "row",
          gap: Spacing.sm,
        },
        footerButton: {
          flex: 1,
        },
        participantsCard: {
          backgroundColor: Colors.backgroundCard,
          borderRadius: Radius.lg,
          padding: Spacing.md,
          marginBottom: Spacing.md,
        },
        participantsTitle: {
          fontSize: Typography.bodyMedium,
          ...Font.semibold,
          color: Colors.text,
          marginBottom: Spacing.sm,
        },
        participantRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: Spacing.xs,
        },
        participantDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: Spacing.sm,
        },
        participantName: {
          flex: 1,
          fontSize: Typography.bodySmall,
          color: Colors.text,
          ...Font.medium,
        },
        participantStatus: {
          fontSize: Typography.labelSmall,
          color: Colors.textSecondary,
          ...Font.medium,
        },
        warningText: {
          textAlign: "center",
          color: Colors.textMuted,
          fontSize: Typography.labelSmall,
        },
      }),
    [Colors],
  );
  const router = useRouter();
  const {
    activeGroupSession,
    completeGroupSession,
    activeSession,
    activeGroupSessions,
    reportCompletion,
    reportSurrender,
    subscribeToSession,
  } = useGroupSessionStore();
  // Tracks intentional navigation away (complete or surrender) so the
  // useEffect guard doesn't redirect home when activeGroupSession clears.
  const isNavigatingAwayRef = useRef(false);
  const [violationCount, setViolationCount] = useState(0);

  // Only use activeSession if it's currently running. A stale completed/cancelled
  // session must not poison derived values — especially sessionEndsAtMs, which
  // would make the timer start at 0ms and fire onComplete immediately.
  const effectiveFirestoreSession =
    activeSession?.status === "active" ? activeSession : null;

  // Normalize data from whichever session source is active
  const sessionEndsAtMs =
    effectiveFirestoreSession?.endsAt?.getTime() ??
    activeGroupSession?.endsAt?.getTime();
  const sessionStartedAtMs =
    effectiveFirestoreSession?.startedAt?.getTime() ??
    activeGroupSession?.startedAt?.getTime();
  const stakeAmount =
    effectiveFirestoreSession?.stakePerParticipant ??
    activeGroupSession?.stakePerParticipant ??
    0;
  const poolTotal =
    effectiveFirestoreSession?.poolTotal ?? activeGroupSession?.poolTotal ?? 0;
  const participantCount = effectiveFirestoreSession
    ? Object.keys(effectiveFirestoreSession.participants).length
    : (activeGroupSession?.participants.length ?? 0);

  const { timeRemaining, start } = useCountdown({
    onComplete: () => {
      isNavigatingAwayRef.current = true;
      if (isScreenTimeAvailable) {
        stopBlocking().catch(() => {});
      }
      // Delay one render cycle so the drain animation reaches 100% before navigating.
      setTimeout(async () => {
        const store = useGroupSessionStore.getState();
        const firestoreSession =
          store.activeSession?.status === "active" ? store.activeSession : null;
        const session = store.activeGroupSession;

        // If this is a Firestore-backed session, report to server
        if (firestoreSession) {
          try {
            await reportCompletion(firestoreSession.id);
          } catch (err) {
            // Fallback to legacy local completion
            console.warn("Server report failed, using local completion:", err);
            if (session) {
              completeGroupSession(
                session.participants.map((p) => ({
                  userId: p.userId,
                  completed: true,
                })),
              );
            }
          }
          router.replace("/session/complete");
        } else if (session) {
          completeGroupSession(
            session.participants.map((p) => ({
              userId: p.userId,
              completed: true,
            })),
          );
          // Quick-block: go home instead of showing money completion screen
          if (mode === "solo_quick") {
            router.dismissAll();
          } else {
            router.replace("/session/complete");
          }
        }
      }, 1000);
    },
  });

  // Use stable identifiers rather than object references. activeSession is a
  // new object on every Firestore snapshot, which would otherwise tear down
  // and re-create the shield listener on every document update — creating a
  // window where a violation could be missed.
  const hasActiveSession = !!(
    activeGroupSession?.id ?? effectiveFirestoreSession?.id
  );
  useEffect(() => {
    if (!isScreenTimeAvailable || !hasActiveSession) return;
    const unsubscribe = onShieldViolation(() => {
      setViolationCount((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    });
    return unsubscribe;
  }, [hasActiveSession]);

  // Subscribe to Firestore session for real-time participant updates
  useEffect(() => {
    if (activeSession?.id) {
      subscribeToSession(activeSession.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  // Recovery: if the app was force-quit during an active session, activeSession is
  // null on restart even though activeGroupSessions has the session. Subscribe so
  // the screen can render.
  const recoverySessionId = !effectiveFirestoreSession?.id
    ? activeGroupSessions?.find((s) => s.status === "active")?.id
    : undefined;
  useEffect(() => {
    if (recoverySessionId) {
      subscribeToSession(recoverySessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverySessionId]);

  useEffect(() => {
    if (sessionEndsAtMs) {
      start(new Date(sessionEndsAtMs));
    } else if (!isNavigatingAwayRef.current) {
      // No active session and we didn't navigate here intentionally — stale route.
      router.dismissAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEndsAtMs, router]);

  if (!activeGroupSession && !effectiveFirestoreSession) {
    return null;
  }

  const totalDuration =
    sessionEndsAtMs && sessionStartedAtMs
      ? sessionEndsAtMs - sessionStartedAtMs
      : (effectiveFirestoreSession?.duration ?? 0);
  const progress = totalDuration > 0 ? 1 - timeRemaining / totalDuration : 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(progress * 100)),
  );

  return (
    <SessionScreenScaffold
      headerVariant="none"
      scrollable={false}
      stickyFooter={true}
      footer={
        <>
          <Button
            title={mode === "solo_quick" ? "End Session" : "Surrender"}
            onPress={() => {
              Alert.alert(
                mode === "solo_quick" ? "End Blocking?" : "Surrender Session?",
                mode === "solo_quick"
                  ? "Are you sure you want to stop blocking apps?"
                  : `You will forfeit your ${formatMoney(stakeAmount)} stake. This cannot be undone.`,
                [
                  { text: "Keep Going", style: "cancel" },
                  {
                    text: mode === "solo_quick" ? "End" : "Surrender",
                    style: "destructive",
                    onPress: async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      isNavigatingAwayRef.current = true;
                      if (isScreenTimeAvailable) {
                        stopBlocking().catch(() => {});
                      }
                      if (mode === "solo_quick") {
                        // Quick-block: no money involved, just clear session and go home
                        completeGroupSession(
                          (activeGroupSession?.participants ?? []).map((p) => ({
                            userId: p.userId,
                            completed: false,
                          })),
                        );
                        router.dismissAll();
                      } else if (effectiveFirestoreSession) {
                        // Firestore-backed: report to server, then go to complete screen
                        try {
                          await reportSurrender(effectiveFirestoreSession.id);
                        } catch (err) {
                          console.warn("Server surrender report failed:", err);
                        }
                        router.replace("/session/complete");
                      } else {
                        // Legacy flow: surrender screen handles payment + local state
                        router.push("/session/surrender");
                      }
                    },
                  },
                ],
              );
            }}
            variant="outline"
            size="large"
          />
          {mode !== "solo_quick" && (
            <Text style={styles.warningText}>
              Warning: Surrendering forfeits your {formatMoney(stakeAmount)}{" "}
              stake
            </Text>
          )}
        </>
      }
    >
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

      {/* Payout Card — hidden for solo quick-block (no money involved) */}
      {mode !== "solo_quick" && (
        <Card style={styles.payoutCard}>
          <Text style={styles.payoutLabel}>Complete to earn</Text>
          <Text style={styles.payoutAmount}>
            {participantCount <= 1
              ? formatMoney(stakeAmount * SOLO_COMPLETION_MULTIPLIER)
              : `Up to ${formatMoney(poolTotal)}`}
          </Text>
        </Card>
      )}

      {/* Violation Counter */}
      {violationCount > 0 && (
        <Card style={styles.violationCard}>
          <Text style={styles.violationLabel}>Blocked app attempts</Text>
          <Text style={styles.violationCount}>{violationCount}</Text>
        </Card>
      )}

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
    </SessionScreenScaffold>
  );
}
