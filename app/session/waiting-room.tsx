import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Alert, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Card, Button } from "../../src/components";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { useAuthStore } from "../../src/store/authStore";
import { formatMoney, formatTime } from "../../src/utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: Typography.headlineMedium,
      ...Font.bold,
      color: Colors.text,
    },
    subtitle: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      marginTop: Spacing.xs,
    },
    sessionInfoRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: Spacing.lg,
      marginTop: Spacing.md,
    },
    sessionInfoItem: {
      alignItems: "center",
    },
    sessionInfoLabel: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      marginBottom: Spacing.xs,
    },
    sessionInfoValue: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
    },
    participantsCard: {
      marginBottom: Spacing.md,
    },
    participantsTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.md,
    },
    participantRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: Spacing.md,
    },
    participantAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: Spacing.md,
    },
    participantInitial: {
      fontSize: Typography.titleSmall,
      ...Font.bold,
      color: Colors.white,
    },
    participantDetails: {
      flex: 1,
    },
    participantName: {
      fontSize: Typography.bodyMedium,
      ...Font.medium,
      color: Colors.text,
    },
    badge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.sm,
      alignSelf: "flex-start",
      marginTop: Spacing.xs,
    },
    badgeInvited: {
      backgroundColor: Colors.backgroundTertiary,
    },
    badgeAccepted: {
      backgroundColor: Colors.warningLight,
    },
    badgeReady: {
      backgroundColor: Colors.gainLight,
    },
    badgeYou: {
      backgroundColor: Colors.infoLight,
    },
    badgeTextInvited: {
      fontSize: Typography.labelSmall,
      ...Font.medium,
      color: Colors.textSecondary,
    },
    badgeTextAccepted: {
      fontSize: Typography.labelSmall,
      ...Font.medium,
      color: Colors.warning,
    },
    badgeTextReady: {
      fontSize: Typography.labelSmall,
      ...Font.medium,
      color: Colors.gain,
    },
    badgeTextYou: {
      fontSize: Typography.labelSmall,
      ...Font.medium,
      color: Colors.info,
    },
    progressCard: {
      alignItems: "center",
      marginBottom: Spacing.md,
    },
    progressText: {
      fontSize: Typography.bodyMedium,
      ...Font.medium,
      color: Colors.text,
    },
    progressBar: {
      width: "100%",
      height: 6,
      backgroundColor: Colors.backgroundTertiary,
      borderRadius: Radius.full,
      overflow: "hidden",
      marginTop: Spacing.md,
    },
    progressFill: {
      height: "100%",
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
    },
    countdownCard: {
      alignItems: "center",
      backgroundColor: Colors.warningLight,
      borderWidth: 1,
      borderColor: Colors.warning,
      marginBottom: Spacing.md,
    },
    countdownLabel: {
      fontSize: Typography.labelMedium,
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    countdownValue: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.warning,
    },
    footer: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    cancelRow: {
      flexDirection: "row",
      gap: Spacing.md,
    },
    cancelButton: {
      flex: 1,
    },
    shareButton: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: Colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      marginTop: Spacing.md,
    },
  });

// ─── Component ────────────────────────────────────────────────────────────────

export default function WaitingRoomScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const userId = useAuthStore((state) => state.user?.id);

  const {
    activeSession,
    subscribeToSession,
    markOnline,
    startSession,
    cancelSession,
  } = useGroupSessionStore();

  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  // Prevent calling markOnline more than once per session
  const hasMarkedOnlineRef = useRef(false);

  // Subscribe to Firestore session on mount.
  // subscribeToSession manages its own unsubscribe token in the store;
  // calling it again tears down the previous subscription automatically.
  useEffect(() => {
    if (!sessionId) return;
    subscribeToSession(sessionId);
  }, [sessionId, subscribeToSession]);

  // markOnlineForSession CF requires status === "ready" (all participants accepted).
  // Call it when the session first reaches "ready" status, not on mount — the session
  // may still be "pending" (awaiting other accepts) when we first land here.
  useEffect(() => {
    if (
      activeSession?.status === "ready" &&
      sessionId &&
      !hasMarkedOnlineRef.current
    ) {
      hasMarkedOnlineRef.current = true;
      markOnline(sessionId).catch(() => {
        // Non-critical: status will show as not online, user can try again
      });
    }
  }, [activeSession?.status, sessionId, markOnline]);

  // Countdown timer for auto-timeout
  useEffect(() => {
    if (!activeSession?.autoTimeoutAt) {
      setCountdownMs(null);
      return;
    }

    const tick = () => {
      const remaining = activeSession.autoTimeoutAt!.getTime() - Date.now();
      setCountdownMs(remaining > 0 ? remaining : 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  // Use .getTime() so the effect compares by value, not by reference.
  // parseGroupSessionDoc creates a new Date object on every snapshot even if
  // the underlying timestamp is unchanged, which would otherwise reset the
  // interval on every Firestore update.
  }, [activeSession?.autoTimeoutAt?.getTime()]);

  // React to session status changes
  useEffect(() => {
    if (!activeSession) return;

    if (activeSession.status === "cancelled") {
      Alert.alert("Session Cancelled", "This session has been cancelled.", [
        { text: "OK", onPress: () => router.dismissAll() },
      ]);
    }

    if (activeSession.status === "active") {
      router.replace("/session/active");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.status, router]);

  // Derived state
  const participants = activeSession
    ? Object.entries(activeSession.participants)
    : [];
  const totalCount = participants.length;

  const acceptedCount = participants.filter(([, p]) => p.accepted).length;

  const onlineCount = participants.filter(([, p]) => p.online).length;

  const allOnline = totalCount > 0 && onlineCount === totalCount;

  const isProposer = activeSession?.proposerId === userId;

  const handleStart = useCallback(async () => {
    if (!sessionId) return;
    try {
      await startSession(sessionId);
    } catch {
      Alert.alert("Error", "Failed to start session. Please try again.");
    }
  }, [sessionId, startSession]);

  const handleCancel = useCallback(() => {
    if (!sessionId) return;
    Alert.alert(
      "Cancel Session",
      "Are you sure you want to cancel this session? All participants will be notified.",
      [
        { text: "Keep Waiting", style: "cancel" },
        {
          text: "Cancel Session",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSession(sessionId);
            } catch {
              Alert.alert("Error", "Failed to cancel session. Please try again.");
            }
          },
        },
      ],
    );
  }, [sessionId, cancelSession]);

  const handleShare = useCallback(async () => {
    if (!sessionId) return;
    try {
      await Share.share({
        message: `Join my NIYAH focus session! https://niyah.app/join/${sessionId}`,
      });
    } catch {
      // User cancelled share sheet
    }
  }, [sessionId]);

  const getStatusBadge = (
    participantId: string,
    participant: { accepted: boolean; online: boolean },
  ) => {
    if (participantId === userId) {
      return (
        <View style={[styles.badge, styles.badgeYou]}>
          <Text style={styles.badgeTextYou}>You</Text>
        </View>
      );
    }
    if (participant.online) {
      return (
        <View style={[styles.badge, styles.badgeReady]}>
          <Text style={styles.badgeTextReady}>Ready</Text>
        </View>
      );
    }
    if (participant.accepted) {
      return (
        <View style={[styles.badge, styles.badgeAccepted]}>
          <Text style={styles.badgeTextAccepted}>Accepted</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeInvited]}>
        <Text style={styles.badgeTextInvited}>Invited</Text>
      </View>
    );
  };

  // Loading state
  if (!activeSession) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading session...</Text>
      </SafeAreaView>
    );
  }

  const progressPercent = totalCount > 0 ? (onlineCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Waiting Room</Text>
          <Text style={styles.subtitle}>Waiting for everyone to be ready</Text>
          <View style={styles.sessionInfoRow}>
            <View style={styles.sessionInfoItem}>
              <Text style={styles.sessionInfoLabel}>Stake</Text>
              <Text style={styles.sessionInfoValue}>
                {formatMoney(activeSession.stakePerParticipant)}
              </Text>
            </View>
            <View style={styles.sessionInfoItem}>
              <Text style={styles.sessionInfoLabel}>Duration</Text>
              <Text style={styles.sessionInfoValue}>
                {formatTime(activeSession.duration)}
              </Text>
            </View>
            <View style={styles.sessionInfoItem}>
              <Text style={styles.sessionInfoLabel}>Pool</Text>
              <Text style={styles.sessionInfoValue}>
                {formatMoney(activeSession.poolTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* Participant List */}
        <Card style={styles.participantsCard}>
          <Text style={styles.participantsTitle}>Participants</Text>
          {participants.map(([participantId, participant]) => (
            <View key={participantId} style={styles.participantRow}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantInitial}>
                  {participant.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantDetails}>
                <Text style={styles.participantName}>{participant.name}</Text>
                {getStatusBadge(participantId, participant)}
              </View>
            </View>
          ))}
        </Card>

        {/* Progress Indicator */}
        <Card style={styles.progressCard}>
          <Text style={styles.progressText}>
            {allOnline
              ? "Everyone is ready!"
              : acceptedCount < totalCount
                ? `${acceptedCount} of ${totalCount} accepted`
                : `${onlineCount} of ${totalCount} online`}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </Card>

        {/* Countdown Timer */}
        {activeSession.autoTimeoutAt && countdownMs !== null && (
          <Card style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>Auto-cancels in</Text>
            <Text style={styles.countdownValue}>
              {formatCountdown(countdownMs)}
            </Text>
          </Card>
        )}
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {isProposer && allOnline && (
          <Button title="Start Session" onPress={handleStart} size="large" />
        )}
        <View style={styles.cancelRow}>
          <View style={styles.shareButton}>
            <Button
              title="Share Invite"
              onPress={handleShare}
              variant="outline"
              size="medium"
            />
          </View>
          {isProposer && (
            <View style={styles.cancelButton}>
              <Button
                title="Cancel Session"
                onPress={handleCancel}
                variant="danger"
                size="small"
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
