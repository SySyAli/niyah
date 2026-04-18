import React, { useRef, useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Linking, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import {
  Card,
  Button,
  Confetti,
  SessionScreenScaffold,
  withErrorBoundary,
} from "../../src/components";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../src/store/authStore";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { useSessionStore } from "../../src/store/sessionStore";
import { formatMoney } from "../../src/utils/format";
import type { GroupSessionDoc, SessionTransfer } from "../../src/types";

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
    sectionTitle: {
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.sm,
    },
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
    badgePending: {
      backgroundColor: Colors.backgroundTertiary,
    },
    badgeTextPending: {
      color: Colors.textSecondary,
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
  });

// ─── FirestoreResultsCard ─────────────────────────────────────────────────────

interface FirestoreResultsCardProps {
  session: GroupSessionDoc;
  userId: string | undefined;
  styles: ReturnType<typeof makeStyles>;
}

function FirestoreResultsCard({
  session,
  userId,
  styles,
}: FirestoreResultsCardProps) {
  const participants = Object.entries(session.participants);
  return (
    <Card style={styles.resultsCard}>
      <Text style={styles.sectionTitle}>Results</Text>
      {participants.map(([uid, p]) => {
        const completed = p.completed === true;
        const surrendered = p.surrendered === true;
        const inProgress = !completed && !surrendered;
        const payout = session.payouts?.[uid];
        return (
          <View key={uid} style={styles.participantRow}>
            <View style={styles.participantLeft}>
              <Text style={styles.participantName}>
                {uid === userId ? "You" : p.name}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  completed
                    ? styles.badgeCompleted
                    : inProgress
                      ? styles.badgePending
                      : styles.badgeFailed,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    completed
                      ? styles.badgeTextCompleted
                      : inProgress
                        ? styles.badgeTextPending
                        : styles.badgeTextFailed,
                  ]}
                >
                  {completed
                    ? "Completed"
                    : inProgress
                      ? "In Progress"
                      : "Surrendered"}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.payoutValue,
                completed ? styles.payoutGain : styles.payoutNeutral,
              ]}
            >
              {completed
                ? payout != null
                  ? `+${formatMoney(payout)}`
                  : "Pending"
                : inProgress
                  ? "–"
                  : "Forfeited"}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

function CompleteScreenInner() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const user = useAuthStore((state) => state.user);
  const {
    groupSessionHistory,
    activeSession: firestoreSession,
    markTransferConfirmed,
    markTransferPaid,
    getVenmoPayLink,
  } = useGroupSessionStore();
  const soloHistory = useSessionStore((s) => s.sessionHistory);
  const isSolo = params.type === "solo";
  const lastSolo = soloHistory[0];

  // Legacy local history (demo/legacy sessions)
  const lastSession = groupSessionHistory[0];
  const myParticipant = lastSession?.participants.find(
    (p) => p.userId === user?.id,
  );

  // Firestore fallback: used when legacy history is empty (new group session flow)
  const firestoreMyParticipant =
    user?.id && firestoreSession
      ? firestoreSession.participants[user.id]
      : null;
  const didComplete = isSolo
    ? lastSolo?.status === "completed"
    : myParticipant?.completed || firestoreMyParticipant?.completed;

  const activeTransfers =
    lastSession?.transfers.filter((t) => t.status !== "none") ??
    (firestoreSession?.transfers ?? []).filter((t) => t.status !== "none");

  const isSoloSession =
    isSolo ||
    (lastSession
      ? (lastSession.participants.length ?? 0) <= 1
      : Object.keys(firestoreSession?.participants ?? {}).length <= 1);

  // Only celebrate if the current user actually completed.
  // Initialized to false because the Firestore snapshot confirming completion
  // may arrive after the screen first renders (CF writes → snapshot is async).
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiStartedRef = useRef(false);

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
  }, [opacityAnim, scaleAnim]);

  // Start confetti once didComplete becomes true (may be after initial render).
  useEffect(() => {
    if (didComplete && !confettiStartedRef.current) {
      confettiStartedRef.current = true;
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [didComplete]);

  // Wallet balance now auto-syncs via onSnapshot listener in walletStore.
  // No manual hydrate needed on session completion.

  // Track transfer actions already in-flight so rapid taps don't double-fire
  // markTransferPaid / markTransferConfirmed (each would write a duplicate
  // settlement record).
  const [pendingTransferIds, setPendingTransferIds] = useState<Set<string>>(
    () => new Set(),
  );
  const isPending = (id: string) => pendingTransferIds.has(id);
  const lockTransfer = (id: string) =>
    setPendingTransferIds((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.dismissAll();
  };

  const handleMarkReceived = (transferId: string) => {
    if (!lastSession || isPending(transferId)) return;
    lockTransfer(transferId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markTransferConfirmed(lastSession.id, transferId);
  };

  const handlePayVenmo = async (transfer: SessionTransfer) => {
    if (isPending(transfer.id)) return;
    lockTransfer(transfer.id);
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
      `Niyah session payment`,
    );
    try {
      const canOpen = await Linking.canOpenURL(venmoUrl);
      await Linking.openURL(
        canOpen
          ? venmoUrl
          : `https://venmo.com/${recipient.venmoHandle.replace("@", "")}`,
      );
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
    <>
      {showConfetti && <Confetti count={60} />}
      <SessionScreenScaffold
        headerVariant="none"
        scrollable={false}
        stickyFooter={true}
        footer={<Button title="Done" onPress={handleDone} size="medium" />}
      >
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
            {didComplete
              ? isSoloSession
                ? "You stayed focused — stake returned!"
                : "You stayed focused!"
              : "Session ended"}
          </Text>
        </Animated.View>

        {/* Results: who completed and what they earned */}
        {isSolo && lastSolo ? (
          <Card style={styles.resultsCard}>
            <Text style={styles.sectionTitle}>Results</Text>
            <View style={styles.participantRow}>
              <View style={styles.participantLeft}>
                <Text style={styles.participantName}>You</Text>
                <View
                  style={[
                    styles.statusBadge,
                    didComplete ? styles.badgeCompleted : styles.badgeFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      didComplete
                        ? styles.badgeTextCompleted
                        : styles.badgeTextFailed,
                    ]}
                  >
                    {didComplete ? "Completed" : "Surrendered"}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.payoutValue,
                  didComplete ? styles.payoutGain : styles.payoutNeutral,
                ]}
              >
                {didComplete
                  ? `${formatMoney(lastSolo.actualPayout ?? lastSolo.stakeAmount)} returned`
                  : `${formatMoney(lastSolo.stakeAmount)} forfeited`}
              </Text>
            </View>
          </Card>
        ) : lastSession ? (
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
                  {p.completed
                    ? isSoloSession
                      ? `${formatMoney(p.payout ?? p.stakeAmount)} returned`
                      : `+${formatMoney(p.payout ?? p.stakeAmount)}`
                    : "Forfeited"}
                </Text>
              </View>
            ))}
          </Card>
        ) : firestoreSession ? (
          <FirestoreResultsCard
            session={firestoreSession}
            userId={user?.id}
            styles={styles}
          />
        ) : null}

        {/* Payments: who owes who and current state — skipped for solo sessions (no peer transfers) */}
        {!isSolo && (
        <View style={styles.paymentsSection}>
          <Text style={styles.sectionTitle}>Payments</Text>

          {activeTransfers.length === 0 && !firestoreSession?.payouts ? (
            <Card style={styles.noPaymentsCard}>
              <Text style={styles.noPaymentsText}>No payments needed</Text>
              <Text style={styles.noPaymentsSubtext}>
                Everyone's stake has been settled automatically.
              </Text>
            </Card>
          ) : activeTransfers.length === 0 && firestoreSession?.payouts ? (
            <Card style={styles.noPaymentsCard}>
              <Text style={styles.noPaymentsText}>Settled via Stripe</Text>
              <Text style={styles.noPaymentsSubtext}>
                {firestoreSession.payouts[user?.id ?? ""]
                  ? `${formatMoney(firestoreSession.payouts[user?.id ?? ""] ?? 0)} credited to your balance.`
                  : "Your stake was forfeited."}
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
                          disabled={isPending(transfer.id)}
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
                          disabled={isPending(transfer.id)}
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
        )}

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
      </SessionScreenScaffold>
    </>
  );
}

const CompleteScreen = withErrorBoundary(CompleteScreenInner, "complete");
export default CompleteScreen;
