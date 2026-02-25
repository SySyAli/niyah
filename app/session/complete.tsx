import React, { useRef, useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Card, Button, Confetti } from "../../src/components";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../src/store/authStore";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { formatMoney } from "../../src/utils/format";
import type { SessionTransfer } from "../../src/types";

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  // Header
  header: {
    alignItems: "center",
    marginTop: 0,
    marginBottom: Spacing.md,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gainLight,
    borderWidth: 2,
    borderColor: Colors.gain,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  checkmark: {
    fontSize: 30,
    color: Colors.gain,
  },
  title: {
    fontSize: Typography.headlineSmall,
    ...Font.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Section title (shared)
  sectionTitle: {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  // Results card
  resultsCard: {
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  participantLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  participantName: {
    fontSize: Typography.bodySmall,
    ...Font.medium,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeCompleted: {
    backgroundColor: Colors.gainLight,
  },
  badgeFailed: {
    backgroundColor: Colors.lossLight,
  },
  statusBadgeText: {
    fontSize: Typography.labelSmall,
    ...Font.semibold,
  },
  badgeTextCompleted: {
    color: Colors.gain,
  },
  badgeTextFailed: {
    color: Colors.loss,
  },
  payoutValue: {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
  },
  payoutGain: {
    color: Colors.gain,
  },
  payoutNeutral: {
    color: Colors.textMuted,
  },
  // Payments section
  paymentsSection: {
    marginBottom: Spacing.sm,
  },
  noPaymentsCard: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundCard,
  },
  noPaymentsText: {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  noPaymentsSubtext: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  // Transfer cards
  transferCard: {
    marginBottom: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  transferCardOverdue: {
    borderWidth: 1,
    borderColor: Colors.loss,
    backgroundColor: Colors.lossLight,
  },
  transferCardSettled: {
    borderWidth: 1,
    borderColor: Colors.gain,
    backgroundColor: Colors.gainLight,
  },
  transferCardDisputed: {
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningLight,
  },
  transferRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  transferDirection: {
    fontSize: Typography.bodySmall,
    ...Font.medium,
    color: Colors.text,
    flex: 1,
  },
  transferAmount: {
    fontSize: Typography.bodyMedium,
    ...Font.bold,
  },
  amountOwed: {
    color: Colors.loss,
  },
  amountIncoming: {
    color: Colors.gain,
  },
  venmoHandle: {
    fontSize: Typography.labelSmall,
    color: Colors.primary,
    ...Font.medium,
    marginBottom: Spacing.xs,
  },
  transferAction: {
    marginTop: 2,
  },
  awaitingText: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    ...Font.medium,
  },
  overdueText: {
    fontSize: Typography.labelMedium,
    color: Colors.loss,
    ...Font.semibold,
  },
  settledText: {
    fontSize: Typography.labelMedium,
    color: Colors.gain,
    ...Font.semibold,
  },
  disputedText: {
    fontSize: Typography.labelMedium,
    color: Colors.warning,
    ...Font.semibold,
  },
  // Stats
  statsGrid: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
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
    fontSize: Typography.titleLarge,
    ...Font.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Motivation
  motivationCard: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  motivationText: {
    fontSize: Typography.bodySmall,
    color: Colors.text,
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    marginTop: "auto",
    gap: Spacing.sm,
  },
});

export default function CompleteScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const {
    groupSessionHistory,
    markTransferConfirmed,
    markTransferPaid,
    getVenmoPayLink,
  } = useGroupSessionStore();
  const [showConfetti, setShowConfetti] = useState(true);

  const lastSession = groupSessionHistory[0];
  const myParticipant = lastSession?.participants.find(
    (p) => p.userId === user?.id,
  );
  // Transfers that require actual settlement (exclude "none" status from even-split)
  const activeTransfers =
    lastSession?.transfers.filter((t) => t.status !== "none") ?? [];

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [opacityAnim, scaleAnim]);

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/(tabs)");
  };

  const handleMarkReceived = (transferId: string) => {
    if (lastSession) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      markTransferConfirmed(lastSession.id, transferId);
    }
  };

  const handlePayVenmo = async (transfer: SessionTransfer) => {
    const recipient = lastSession?.participants.find(
      (p) => p.userId === transfer.toUserId,
    );
    if (!recipient?.venmoHandle) {
      Alert.alert(
        "No Venmo Handle",
        `${recipient?.name ?? "Your partner"} hasn't added their Venmo handle. Pay them directly.`,
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const venmoUrl = getVenmoPayLink(
      transfer.amount,
      recipient.venmoHandle,
      `NIYAH session payment`,
    );
    try {
      const canOpen = await Linking.canOpenURL(venmoUrl);
      await Linking.openURL(
        canOpen
          ? venmoUrl
          : `https://venmo.com/${recipient.venmoHandle.replace("@", "")}`,
      );
      // Mark as payment indicated once they've been sent to Venmo
      if (lastSession) {
        markTransferPaid(lastSession.id, transfer.id);
      }
    } catch {
      Alert.alert(
        "Error",
        "Could not open Venmo. Please pay your partner manually.",
      );
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

  return (
    <SafeAreaView style={styles.container}>
      {showConfetti && <Confetti count={60} />}
      <View style={styles.content}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={styles.checkCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.title}>Session Complete</Text>
          <Text style={styles.subtitle}>
            {myParticipant?.completed ? "You stayed focused!" : "Session ended"}
          </Text>
        </Animated.View>

        {/* Results: who completed and what they earned */}
        {lastSession && (
          <Card style={styles.resultsCard}>
            <Text style={styles.sectionTitle}>Results</Text>
            {lastSession.participants.map((p) => (
              <View key={p.userId} style={styles.participantRow}>
                <View style={styles.participantLeft}>
                  <Text style={styles.participantName}>
                    {p.userId === user?.id ? "You" : p.name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      p.completed ? styles.badgeCompleted : styles.badgeFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        p.completed
                          ? styles.badgeTextCompleted
                          : styles.badgeTextFailed,
                      ]}
                    >
                      {p.completed ? "Completed" : "Surrendered"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.payoutValue,
                    p.completed ? styles.payoutGain : styles.payoutNeutral,
                  ]}
                >
                  {formatMoney(p.payout ?? p.stakeAmount)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Payments: who owes who and current state */}
        <View style={styles.paymentsSection}>
          <Text style={styles.sectionTitle}>Payments</Text>

          {activeTransfers.length === 0 ? (
            <Card style={styles.noPaymentsCard}>
              <Text style={styles.noPaymentsText}>No payments needed</Text>
              <Text style={styles.noPaymentsSubtext}>
                Everyone's stake has been settled automatically.
              </Text>
            </Card>
          ) : (
            activeTransfers.map((transfer) => {
              const iAmPayer = transfer.fromUserId === user?.id;
              const iAmRecipient = transfer.toUserId === user?.id;
              const counterparty = lastSession?.participants.find(
                (p) =>
                  p.userId ===
                  (iAmPayer ? transfer.toUserId : transfer.fromUserId),
              );

              return (
                <Card
                  key={transfer.id}
                  style={[
                    styles.transferCard,
                    transfer.status === "overdue" && styles.transferCardOverdue,
                    transfer.status === "settled" && styles.transferCardSettled,
                    transfer.status === "disputed" &&
                      styles.transferCardDisputed,
                  ]}
                >
                  <View style={styles.transferRow}>
                    <Text style={styles.transferDirection}>
                      {iAmPayer
                        ? `You owe ${counterparty?.name ?? transfer.toUserName}`
                        : iAmRecipient
                          ? `${counterparty?.name ?? transfer.fromUserName} owes you`
                          : `${transfer.fromUserName} → ${transfer.toUserName}`}
                    </Text>
                    <Text
                      style={[
                        styles.transferAmount,
                        iAmPayer ? styles.amountOwed : styles.amountIncoming,
                      ]}
                    >
                      {formatMoney(transfer.amount)}
                    </Text>
                  </View>

                  {counterparty?.venmoHandle && (
                    <Text style={styles.venmoHandle}>
                      {counterparty.venmoHandle}
                    </Text>
                  )}

                  <View style={styles.transferAction}>
                    {(transfer.status === "pending" ||
                      transfer.status === "overdue") &&
                      iAmPayer && (
                        <Button
                          title={
                            transfer.status === "overdue"
                              ? "Pay Now (Overdue)"
                              : "Pay via Venmo"
                          }
                          onPress={() => handlePayVenmo(transfer)}
                          variant={
                            transfer.status === "overdue" ? "danger" : "primary"
                          }
                          size="small"
                        />
                      )}
                    {transfer.status === "pending" && iAmRecipient && (
                      <Text style={styles.awaitingText}>Awaiting payment</Text>
                    )}
                    {transfer.status === "overdue" && iAmRecipient && (
                      <Text style={styles.overdueText}>Payment overdue</Text>
                    )}
                    {transfer.status === "payment_indicated" &&
                      iAmRecipient && (
                        <Button
                          title="Mark as Received"
                          onPress={() => handleMarkReceived(transfer.id)}
                          variant="secondary"
                          size="small"
                        />
                      )}
                    {transfer.status === "payment_indicated" && iAmPayer && (
                      <Text style={styles.awaitingText}>
                        Sent — awaiting confirmation
                      </Text>
                    )}
                    {transfer.status === "settled" && (
                      <Text style={styles.settledText}>Settled ✓</Text>
                    )}
                    {transfer.status === "disputed" && (
                      <Text style={styles.disputedText}>Disputed</Text>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Stats */}
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

        {/* Motivation */}
        <Card style={styles.motivationCard}>
          <Text style={styles.motivationText}>{getStreakMessage()}</Text>
        </Card>

        <View style={styles.footer}>
          <Button title="Done" onPress={handleDone} size="medium" />
        </View>
      </View>
    </SafeAreaView>
  );
}
