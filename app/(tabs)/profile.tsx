import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  FontWeight,
} from "../../src/constants/colors";
import * as Haptics from "expo-haptics";
import { Card, Balance } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { useWalletStore } from "../../src/store/walletStore";
import { usePartnerStore } from "../../src/store/partnerStore";
import { formatMoney, formatRelativeTime } from "../../src/utils/format";
import { REPUTATION_LEVELS } from "../../src/constants/config";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setVenmoHandle } = useAuthStore();
  const { balance, transactions, pendingWithdrawal } = useWalletStore();
  const { partners } = usePartnerStore();
  const [showVenmoInput, setShowVenmoInput] = useState(false);
  const [venmoInput, setVenmoInput] = useState(user?.venmoHandle || "");

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  const completionRate =
    user && user.totalSessions > 0
      ? Math.round((user.completedSessions / user.totalSessions) * 100)
      : 0;

  const reputation = user?.reputation;
  const reputationLevel = reputation?.level || "sapling";
  const reputationInfo =
    REPUTATION_LEVELS[reputationLevel as keyof typeof REPUTATION_LEVELS];

  const getReputationColor = (score: number) => {
    if (score >= 80) return Colors.gain;
    if (score >= 60) return Colors.primary;
    if (score >= 40) return Colors.warning;
    return Colors.loss;
  };

  const handleSaveVenmo = () => {
    if (venmoInput) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const handle = venmoInput.startsWith("@") ? venmoInput : `@${venmoInput}`;
      setVenmoHandle(handle);
      setShowVenmoInput(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {/* Reputation Badge */}
          <View style={styles.reputationBadge}>
            <View
              style={[
                styles.reputationDot,
                {
                  backgroundColor: getReputationColor(reputation?.score || 50),
                },
              ]}
            />
            <Text style={styles.reputationText}>
              {reputationInfo?.label || "Sapling"} - {reputation?.score || 50}
              /100
            </Text>
          </View>
        </View>

        {/* Reputation Card */}
        <Card style={styles.reputationCard}>
          <View style={styles.reputationHeader}>
            <Text style={styles.reputationTitle}>Social Credit</Text>
            <Text style={styles.reputationDescription}>
              {reputationInfo?.description || "Building trust"}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${reputation?.score || 50}%`,
                    backgroundColor: getReputationColor(
                      reputation?.score || 50,
                    ),
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Seed</Text>
              <Text style={styles.progressLabel}>Oak</Text>
            </View>
          </View>

          {/* Payment stats */}
          <View style={styles.paymentStats}>
            <View style={styles.paymentStat}>
              <Text style={[styles.paymentValue, { color: Colors.gain }]}>
                {reputation?.paymentsCompleted || 0}
              </Text>
              <Text style={styles.paymentLabel}>Paid</Text>
            </View>
            <View style={styles.paymentStat}>
              <Text style={[styles.paymentValue, { color: Colors.loss }]}>
                {reputation?.paymentsMissed || 0}
              </Text>
              <Text style={styles.paymentLabel}>Missed</Text>
            </View>
            <View style={styles.paymentStat}>
              <Text style={styles.paymentValue}>{partners.length}</Text>
              <Text style={styles.paymentLabel}>Partners</Text>
            </View>
          </View>
        </Card>

        {/* Venmo Handle */}
        <Card style={styles.venmoCard}>
          <Text style={styles.venmoTitle}>Venmo Handle</Text>
          {showVenmoInput ? (
            <View style={styles.venmoInputRow}>
              <TextInput
                style={styles.venmoInput}
                placeholder="@your-handle"
                placeholderTextColor={Colors.textMuted}
                value={venmoInput}
                onChangeText={setVenmoInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.venmoSaveButton}
                onPress={handleSaveVenmo}
              >
                <Text style={styles.venmoSaveText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.venmoDisplay}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowVenmoInput(true);
              }}
            >
              <Text
                style={
                  user?.venmoHandle
                    ? styles.venmoHandleText
                    : styles.venmoPlaceholder
                }
              >
                {user?.venmoHandle || "Tap to add"}
              </Text>
              <Text style={styles.venmoEditText}>Edit</Text>
            </Pressable>
          )}
          <Text style={styles.venmoNote}>
            Partners use this to pay you when they lose
          </Text>
        </Card>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Balance amount={balance} size="medium" />
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/session/withdraw");
              }}
              style={styles.withdrawButton}
            >
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </Pressable>
          </View>
          {pendingWithdrawal > 0 && (
            <View style={styles.pendingRow}>
              <Text style={styles.pendingLabel}>Pending</Text>
              <Text style={styles.pendingAmount}>
                {formatMoney(pendingWithdrawal)}
              </Text>
            </View>
          )}
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{user?.totalSessions || 0}</Text>
            <Text style={styles.miniStatLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{completionRate}%</Text>
            <Text style={styles.miniStatLabel}>Success</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{user?.longestStreak || 0}</Text>
            <Text style={styles.miniStatLabel}>Best Streak</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </Card>
          ) : (
            transactions.slice(0, 5).map((tx) => (
              <View key={tx.id} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>{tx.description}</Text>
                  <Text style={styles.transactionDate}>
                    {formatRelativeTime(tx.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    tx.amount >= 0
                      ? styles.amountPositive
                      : styles.amountNegative,
                  ]}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {formatMoney(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card style={styles.settingsCard} animate={false}>
            <Pressable onPress={handleLogout} style={styles.settingRow}>
              <Text style={styles.settingLabelDestructive}>Sign Out</Text>
            </Pressable>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NIYAH v1.0.0</Text>
          <Text style={styles.footerSubtext}>Demo Mode</Text>
        </View>
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
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.displaySmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  name: {
    fontSize: Typography.titleLarge,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  email: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Reputation badge in header
  reputationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  reputationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  reputationText: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  // Reputation card
  reputationCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  reputationHeader: {
    marginBottom: Spacing.md,
  },
  reputationTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  reputationDescription: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  progressLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  paymentStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentStat: {
    alignItems: "center",
  },
  paymentValue: {
    fontSize: Typography.titleMedium,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  paymentLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Venmo card
  venmoCard: {
    marginBottom: Spacing.md,
  },
  venmoTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  venmoInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  venmoInput: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.bodyMedium,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  venmoSaveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    justifyContent: "center",
  },
  venmoSaveText: {
    fontSize: Typography.labelMedium,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  venmoDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  venmoHandleText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  venmoPlaceholder: {
    fontSize: Typography.bodyMedium,
    color: Colors.textMuted,
  },
  venmoEditText: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
  },
  venmoNote: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  balanceCard: {
    marginBottom: Spacing.md,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  withdrawButton: {
    backgroundColor: Colors.backgroundTertiary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  withdrawButtonText: {
    fontSize: Typography.bodySmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  pendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pendingLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.warning,
  },
  pendingAmount: {
    fontSize: Typography.bodySmall,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  miniStatCard: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  miniStatValue: {
    fontSize: Typography.titleLarge,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  miniStatLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.bodySmall,
    color: Colors.textMuted,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: Typography.bodyMedium,
    color: Colors.text,
  },
  transactionDate: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: Typography.bodyMedium,
    fontWeight: FontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  amountPositive: {
    color: Colors.gain,
  },
  amountNegative: {
    color: Colors.loss,
  },
  settingsCard: {
    padding: 0,
    overflow: "hidden",
  },
  settingRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingLabelDestructive: {
    fontSize: Typography.bodyMedium,
    color: Colors.danger,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
  },
  footerSubtext: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
