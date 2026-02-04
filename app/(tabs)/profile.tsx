import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Card, Balance } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { useWalletStore } from "../../src/store/walletStore";
import { formatMoney, formatRelativeTime } from "../../src/utils/format";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { balance, transactions, pendingWithdrawal } = useWalletStore();

  const handleLogout = () => {
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
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Balance amount={balance} size="medium" />
            </View>
            <Pressable
              onPress={() => router.push("/session/withdraw")}
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
    fontWeight: "600",
    color: Colors.text,
  },
  name: {
    fontSize: Typography.titleLarge,
    fontWeight: "700",
    color: Colors.text,
  },
  email: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
    fontWeight: "600",
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
    fontWeight: "600",
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
    fontWeight: "700",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
