import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Font,
} from "../../src/constants/colors";
import * as Haptics from "expo-haptics";
import { Card, Balance, Button, MoneyPlant } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { useWalletStore } from "../../src/store/walletStore";
import { usePartnerStore } from "../../src/store/partnerStore";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { formatMoney, formatRelativeTime } from "../../src/utils/format";

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  variant = "primary",
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.actionButton,
          variant === "secondary" && styles.actionButtonSecondary,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text
          style={[
            styles.actionButtonText,
            variant === "secondary" && styles.actionButtonTextSecondary,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const balance = useWalletStore((state) => state.balance);
  const { partners } = usePartnerStore();
  const { activeGroupSession, groupSessionHistory } = useGroupSessionStore();

  const completionRate =
    user && user.totalSessions > 0
      ? Math.round((user.completedSessions / user.totalSessions) * 100)
      : 0;

  const totalEarnings = user?.totalEarnings || 0;

  // Calculate money plant stats
  const totalLeaves = groupSessionHistory.filter(
    (s) => s.participants.find((p) => p.userId === user?.id)?.completed,
  ).length;
  const growthStage = Math.min(5, Math.floor(totalLeaves / 3) + 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.name}>{user?.name || "there"}</Text>
          </View>
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard} variant="elevated">
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Balance amount={balance} size="display" />
          <View style={styles.balanceChange}>
            <Text
              style={[
                styles.changeText,
                totalEarnings >= 0
                  ? styles.changePositive
                  : styles.changeNegative,
              ]}
            >
              {totalEarnings >= 0 ? "+" : ""}
              {formatMoney(totalEarnings)} all time
            </Text>
          </View>
          <View style={styles.balanceActions}>
            <ActionButton
              label="Add Funds"
              onPress={() => router.push("/session/deposit")}
            />
            <ActionButton
              label="Withdraw"
              onPress={() => router.push("/session/withdraw")}
              variant="secondary"
            />
          </View>
        </Card>

        {/* Active Session Banner */}
        {activeGroupSession && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/session/active");
            }}
          >
            <Card style={styles.activeSessionCard}>
              <View style={styles.activeSessionIndicator} />
              <View style={styles.activeSessionContent}>
                <Text style={styles.activeSessionLabel}>
                  DUO SESSION IN PROGRESS
                </Text>
                <Text style={styles.activeSessionText}>
                  {activeGroupSession.cadence.charAt(0).toUpperCase() +
                    activeGroupSession.cadence.slice(1)}{" "}
                  Focus with{" "}
                  {activeGroupSession.participants.find(
                    (p) => p.userId !== user?.id,
                  )?.name ?? "Partner"}
                </Text>
                <Text style={styles.activeSessionPayout}>
                  Stake: {formatMoney(activeGroupSession.stakePerParticipant)}
                </Text>
              </View>
              <Text style={styles.activeSessionArrow}>View</Text>
            </Card>
          </Pressable>
        )}

        {/* Quick Start CTA */}
        {!activeGroupSession && (
          <Card style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to focus?</Text>
            <Text style={styles.ctaSubtitle}>
              Start a duo session with your accountability partner
            </Text>
            <Button
              title="Start Duo Session"
              onPress={() => router.push("/session/select")}
              size="large"
            />
          </Card>
        )}

        {/* Invite Friends Card */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/invite");
          }}
          style={styles.inviteCard}
        >
          <View style={styles.inviteCardContent}>
            <View>
              <Text style={styles.inviteCardTitle}>Invite Friends</Text>
              <Text style={styles.inviteCardSubtitle}>
                Earn +10 social credit per referral
              </Text>
            </View>
            <View style={styles.inviteBadge}>
              <Text style={styles.inviteBadgeText}>+10</Text>
            </View>
          </View>
        </Pressable>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard
              value={user?.currentStreak || 0}
              label="Current Streak"
              color={user?.currentStreak ? Colors.primary : undefined}
            />
            <StatCard
              value={formatMoney(totalEarnings, false)}
              label="Total Earned"
              color={totalEarnings > 0 ? Colors.gain : undefined}
            />
            <StatCard value={`${completionRate}%`} label="Success Rate" />
            <StatCard value={user?.longestStreak || 0} label="Best Streak" />
          </View>
        </View>

        {/* Money Plant Section */}
        <View style={styles.plantSection}>
          <Text style={styles.sectionTitle}>Your Money Plant</Text>
          <Card style={styles.plantCard}>
            <MoneyPlant
              partners={partners}
              totalLeaves={totalLeaves}
              growthStage={growthStage}
              totalEarned={totalEarnings}
            />
          </Card>
        </View>

        {/* Recent Activity */}
        {groupSessionHistory.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Duo Sessions</Text>
            {groupSessionHistory.slice(0, 3).map((session) => {
              const me = session.participants.find(
                (p) => p.userId === user?.id,
              );
              const sessionPartner = session.participants.find(
                (p) => p.userId !== user?.id,
              );
              const inbound = session.transfers.find(
                (t) => t.toUserId === user?.id && t.status !== "none",
              );
              const didComplete = me?.completed ?? false;
              return (
                <Card key={session.id} style={styles.activityCard}>
                  <View style={styles.activityRow}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        {session.cadence.charAt(0).toUpperCase() +
                          session.cadence.slice(1)}{" "}
                        with {sessionPartner?.name ?? "Partner"}
                      </Text>
                      <Text style={styles.activityDate}>
                        {session.completedAt
                          ? formatRelativeTime(session.completedAt)
                          : "In progress"}
                      </Text>
                    </View>
                    <View style={styles.activityResult}>
                      {didComplete ? (
                        <>
                          <Text style={styles.activityEarned}>
                            {inbound
                              ? `Won ${formatMoney(inbound.amount)}`
                              : "Stake kept"}
                          </Text>
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusSuccess}>Completed</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.activityLost}>
                            -{formatMoney(session.stakePerParticipant)}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              styles.statusBadgeFailed,
                            ]}
                          >
                            <Text style={styles.statusFailed}>Surrendered</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: Typography.headlineMedium,
    ...Font.bold,
    color: Colors.text,
    marginTop: 2,
  },
  balanceCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  balanceChange: {
    marginTop: Spacing.sm,
  },
  changeText: {
    fontSize: Typography.bodySmall,
    ...Font.medium,
  },
  changePositive: {
    color: Colors.gain,
  },
  changeNegative: {
    color: Colors.loss,
  },
  balanceActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
  },
  actionButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    color: Colors.background,
    ...Font.semibold,
    fontSize: Typography.bodySmall,
  },
  actionButtonTextSecondary: {
    color: Colors.text,
  },
  activeSessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  activeSessionIndicator: {
    width: 4,
    height: "100%",
    backgroundColor: Colors.primary,
    position: "absolute",
    left: 0,
  },
  activeSessionContent: {
    flex: 1,
    paddingLeft: Spacing.sm,
  },
  activeSessionLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.primary,
    ...Font.bold,
    letterSpacing: 1,
  },
  activeSessionText: {
    fontSize: Typography.bodyLarge,
    ...Font.semibold,
    color: Colors.text,
    marginTop: 2,
  },
  activeSessionPayout: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activeSessionArrow: {
    fontSize: Typography.bodySmall,
    ...Font.semibold,
    color: Colors.primary,
  },
  ctaCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  ctaTitle: {
    fontSize: Typography.titleLarge,
    ...Font.bold,
    color: Colors.text,
  },
  ctaSubtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  plantSection: {
    marginBottom: Spacing.lg,
  },
  plantCard: {
    padding: Spacing.md,
  },
  inviteCard: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  inviteCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inviteCardTitle: {
    fontSize: Typography.titleSmall,
    ...Font.semibold,
    color: Colors.text,
  },
  inviteCardSubtitle: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inviteBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
  },
  inviteBadgeText: {
    fontSize: Typography.labelLarge,
    ...Font.bold,
    color: Colors.white,
  },
  statsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.titleSmall,
    ...Font.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: Typography.headlineSmall,
    ...Font.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  recentSection: {
    marginBottom: Spacing.lg,
  },
  activityCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
    color: Colors.text,
  },
  activityDate: {
    fontSize: Typography.labelSmall,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  activityResult: {
    alignItems: "flex-end",
  },
  activityEarned: {
    fontSize: Typography.bodyMedium,
    ...Font.bold,
    color: Colors.gain,
  },
  activityLost: {
    fontSize: Typography.bodyMedium,
    ...Font.bold,
    color: Colors.loss,
  },
  statusBadge: {
    backgroundColor: Colors.gainLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginTop: 4,
  },
  statusBadgeFailed: {
    backgroundColor: Colors.lossLight,
  },
  statusSuccess: {
    fontSize: Typography.labelSmall,
    color: Colors.gain,
    ...Font.medium,
  },
  statusFailed: {
    fontSize: Typography.labelSmall,
    color: Colors.loss,
    ...Font.medium,
  },
});
