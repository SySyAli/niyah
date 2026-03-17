import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from "react-native";
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
import { useScreenProtection } from "../../src/hooks/useScreenProtection";
import { useThemeStore } from "../../src/store/themeStore";
import * as Haptics from "expo-haptics";
import { Card, Balance } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { useWalletStore } from "../../src/store/walletStore";
import { usePartnerStore } from "../../src/store/partnerStore";
import { useSocialStore } from "../../src/store/socialStore";
import { formatMoney } from "../../src/utils/format";
import {
  ProfileHeader,
  ReputationCard,
  ScreenTimeCard,
  PaymentHandlesCard,
  TransactionHistory,
} from "../../src/components/profile";
import { logger } from "../../src/utils/logger";

export default function ProfileScreen() {
  useScreenProtection("profile");
  const Colors = useColors();
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();
  const { user, logout, setVenmoHandle, setZelleHandle } = useAuthStore();
  const { balance, transactions, pendingWithdrawal } = useWalletStore();
  const { partners } = usePartnerStore();
  const { following, loadMyFollows } = useSocialStore();

  useEffect(() => {
    if (user?.id) {
      loadMyFollows(user.id).catch(() => {});
    }
  }, [user?.id, loadMyFollows]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            logger.error("Logout error:", error);
          }
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const completionRate =
    user && user.totalSessions > 0
      ? Math.round((user.completedSessions / user.totalSessions) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <ProfileHeader
          user={user}
          followingCount={following.length}
          partnerCount={partners.length}
        />

        <ReputationCard
          reputation={user?.reputation}
          partnerCount={partners.length}
        />

        {/* Invite Friends Card */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/invite" as never);
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

        <ScreenTimeCard />

        <PaymentHandlesCard
          venmoHandle={user?.venmoHandle}
          zelleHandle={user?.zelleHandle}
          onSaveVenmo={setVenmoHandle}
          onSaveZelle={setZelleHandle}
        />

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

        <TransactionHistory transactions={transactions} />

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card style={styles.settingsCard} animate={false}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Light Mode</Text>
              <Switch
                value={theme === "light"}
                onValueChange={toggleTheme}
                trackColor={{
                  false: Colors.backgroundTertiary,
                  true: Colors.primary,
                }}
                thumbColor={Colors.white}
              />
            </View>
          </Card>
        </View>

        {/* Account */}
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

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
    inviteCard: {
      backgroundColor: Colors.primaryMuted,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
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
      ...Font.semibold,
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
      ...Font.semibold,
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
      ...Font.bold,
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
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.md,
    },
    settingsCard: {
      padding: 0,
      overflow: "hidden",
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    settingLabel: {
      fontSize: Typography.bodyMedium,
      color: Colors.text,
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
