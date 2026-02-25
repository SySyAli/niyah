import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { useThemeStore } from "../../src/store/themeStore";
import * as Haptics from "expo-haptics";
import { Card, Balance } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { useWalletStore } from "../../src/store/walletStore";
import { usePartnerStore } from "../../src/store/partnerStore";
import { useSocialStore } from "../../src/store/socialStore";
import { formatMoney, formatRelativeTime } from "../../src/utils/format";
import { REPUTATION_LEVELS } from "../../src/constants/config";
import {
  isScreenTimeAvailable,
  requestScreenTimeAuth,
  getScreenTimeAuthStatus,
  presentAppPicker,
  getSavedAppSelection,
} from "../../src/config/screentime";
import type { AuthorizationStatus } from "../../modules/niyah-screentime";

export default function ProfileScreen() {
  const Colors = useColors();
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();
  const { user, logout, setVenmoHandle, setZelleHandle } = useAuthStore();
  const { balance, transactions, pendingWithdrawal } = useWalletStore();
  const { partners } = usePartnerStore();
  const { following, loadMyFollows } = useSocialStore();
  const [showPaymentEditor, setShowPaymentEditor] = useState(false);
  const [venmoInput, setVenmoInput] = useState(user?.venmoHandle || "");
  const [zelleInput, setZelleInput] = useState(user?.zelleHandle || "");

  // Screen Time state
  const [screenTimeAuth, setScreenTimeAuth] =
    useState<AuthorizationStatus>("notDetermined");
  const [appSelectionCount, setAppSelectionCount] = useState(0);

  const refreshScreenTimeStatus = useCallback(() => {
    if (!isScreenTimeAvailable) return;
    try {
      setScreenTimeAuth(getScreenTimeAuthStatus());
      const selection = getSavedAppSelection();
      setAppSelectionCount(selection?.appCount ?? 0);
    } catch {
      // Native module not loaded (simulator, etc.)
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadMyFollows(user.id).catch(() => {});
    }
    refreshScreenTimeStatus();
  }, [user?.id, loadMyFollows, refreshScreenTimeStatus]);

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
            console.error("Logout error:", error);
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

  const handleSavePaymentHandles = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const trimmedVenmo = venmoInput.trim();
    const venmoHandle = trimmedVenmo
      ? trimmedVenmo.startsWith("@")
        ? trimmedVenmo
        : `@${trimmedVenmo}`
      : "";
    setVenmoHandle(venmoHandle);
    setZelleHandle(zelleInput.trim());
    setShowPaymentEditor(false);
  };

  const handleCancelPaymentEdit = () => {
    setVenmoInput(user?.venmoHandle || "");
    setZelleInput(user?.zelleHandle || "");
    setShowPaymentEditor(false);
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

          <View style={styles.headerStatsRow}>
            <Pressable
              style={styles.headerStatItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/(tabs)/friends",
                  params: { tab: "following" },
                });
              }}
            >
              <Text style={styles.headerStatValue}>{following.length}</Text>
              <Text style={styles.headerStatLabel}>Following</Text>
            </Pressable>
            <View style={styles.headerStatDivider} />
            <Pressable
              style={styles.headerStatItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/(tabs)/friends",
                  params: { tab: "partners" },
                });
              }}
            >
              <Text style={styles.headerStatValue}>{partners.length}</Text>
              <Text style={styles.headerStatLabel}>Partners</Text>
            </Pressable>
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
            <View style={styles.paymentStat}>
              <Text
                style={[styles.paymentValue, { color: Colors.primaryLight }]}
              >
                {reputation?.referralCount || 0}
              </Text>
              <Text style={styles.paymentLabel}>Referred</Text>
            </View>
          </View>
        </Card>

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

        {/* Screen Time Setup */}
        {isScreenTimeAvailable && (
          <Card style={styles.screenTimeCard}>
            <Text style={styles.screenTimeTitle}>Screen Time</Text>
            <Text style={styles.screenTimeDescription}>
              {screenTimeAuth === "approved"
                ? appSelectionCount > 0
                  ? `${appSelectionCount} app${appSelectionCount !== 1 ? "s" : ""} will be blocked during sessions`
                  : "Select which apps to block during sessions"
                : "Allow NIYAH to block distracting apps during sessions"}
            </Text>

            {screenTimeAuth !== "approved" ? (
              <Pressable
                style={styles.screenTimeButton}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  try {
                    const status = await requestScreenTimeAuth();
                    setScreenTimeAuth(status);
                    if (status === "denied") {
                      Alert.alert(
                        "Permission Denied",
                        "You can enable Screen Time access in Settings > NIYAH > Screen Time.",
                      );
                    }
                  } catch (error) {
                    Alert.alert(
                      "Error",
                      "Could not request Screen Time permission. Make sure you're on a physical device with iOS 16+.",
                    );
                  }
                }}
              >
                <Text style={styles.screenTimeButtonText}>
                  Enable Screen Time
                </Text>
              </Pressable>
            ) : (
              <View style={styles.screenTimeActions}>
                <Pressable
                  style={styles.screenTimeButton}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    try {
                      const selection = await presentAppPicker();
                      setAppSelectionCount(selection.appCount);
                    } catch (error) {
                      // User cancelled the picker — that's fine
                    }
                  }}
                >
                  <Text style={styles.screenTimeButtonText}>
                    {appSelectionCount > 0 ? "Change Apps" : "Select Apps"}
                  </Text>
                </Pressable>

                {appSelectionCount > 0 && (
                  <View style={styles.screenTimeStatusBadge}>
                    <View style={styles.screenTimeStatusDot} />
                    <Text style={styles.screenTimeStatusText}>Ready</Text>
                  </View>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Payment Handles */}
        <Card style={styles.paymentHandlesCard}>
          <View style={styles.paymentHandlesHeader}>
            <Text style={styles.venmoTitle}>Payment Handles</Text>
            {!showPaymentEditor && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPaymentEditor(true);
                }}
              >
                <Text style={styles.venmoEditText}>Edit</Text>
              </Pressable>
            )}
          </View>

          {showPaymentEditor ? (
            <>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Venmo Handle</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="@your-handle"
                  placeholderTextColor={Colors.textMuted}
                  value={venmoInput}
                  onChangeText={setVenmoInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Zelle</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="email or phone"
                  placeholderTextColor={Colors.textMuted}
                  value={zelleInput}
                  onChangeText={setZelleInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelButton}
                  onPress={handleCancelPaymentEdit}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalSaveButton}
                  onPress={handleSavePaymentHandles}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.paymentHandleRow}>
                <Text style={styles.paymentHandleLabel}>Venmo</Text>
                <Text
                  style={
                    user?.venmoHandle
                      ? styles.venmoHandleText
                      : styles.venmoPlaceholder
                  }
                >
                  {user?.venmoHandle || "Tap Edit to add"}
                </Text>
              </View>

              <View style={styles.paymentHandleDivider} />

              <View style={styles.paymentHandleRow}>
                <Text style={styles.paymentHandleLabel}>Zelle</Text>
                <Text
                  style={
                    user?.zelleHandle
                      ? styles.venmoHandleText
                      : styles.venmoPlaceholder
                  }
                >
                  {user?.zelleHandle || "Tap Edit to add"}
                </Text>
              </View>

              <Text style={styles.venmoNote}>
                Partners can pay you with either option
              </Text>
            </>
          )}
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
      ...Font.semibold,
      color: Colors.text,
    },
    name: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.text,
    },
    email: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      marginTop: Spacing.xs,
    },
    headerStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: Spacing.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    headerStatItem: {
      alignItems: "center",
      minWidth: 88,
    },
    headerStatValue: {
      fontSize: Typography.titleMedium,
      ...Font.bold,
      color: Colors.text,
    },
    headerStatLabel: {
      fontSize: Typography.labelSmall,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    headerStatDivider: {
      width: 1,
      height: 28,
      backgroundColor: Colors.border,
      marginHorizontal: Spacing.md,
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
      ...Font.medium,
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
      ...Font.semibold,
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
      ...Font.bold,
      color: Colors.text,
    },
    paymentLabel: {
      fontSize: Typography.labelSmall,
      color: Colors.textSecondary,
      marginTop: Spacing.xs,
    },
    // Invite card
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
    // Screen Time
    screenTimeCard: {
      marginBottom: Spacing.md,
      backgroundColor: Colors.backgroundCard,
    },
    screenTimeTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.xs,
    },
    screenTimeDescription: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      marginBottom: Spacing.md,
      lineHeight: 20,
    },
    screenTimeButton: {
      backgroundColor: Colors.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
      alignSelf: "flex-start",
    },
    screenTimeButtonText: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.text,
    },
    screenTimeActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
    },
    screenTimeStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.gainLight,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
    },
    screenTimeStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.gain,
      marginRight: Spacing.xs,
    },
    screenTimeStatusText: {
      fontSize: Typography.labelSmall,
      ...Font.semibold,
      color: Colors.gain,
    },
    // Payment methods
    paymentHandlesCard: {
      marginBottom: Spacing.md,
    },
    paymentHandlesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.sm,
    },
    paymentHandleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: Spacing.sm,
      gap: Spacing.md,
    },
    paymentHandleLabel: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      ...Font.medium,
    },
    paymentHandleDivider: {
      height: 1,
      backgroundColor: Colors.border,
    },
    venmoTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
    },
    venmoHandleText: {
      fontSize: Typography.bodyMedium,
      color: Colors.primary,
      ...Font.semibold,
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
    modalInputGroup: {
      marginBottom: Spacing.md,
    },
    modalInputLabel: {
      fontSize: Typography.labelMedium,
      ...Font.medium,
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    modalInput: {
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.md,
      padding: Spacing.md,
      fontSize: Typography.bodyMedium,
      color: Colors.text,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    modalCancelButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.backgroundCard,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    modalCancelText: {
      fontSize: Typography.labelMedium,
      ...Font.medium,
      color: Colors.textSecondary,
    },
    modalSaveButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.primary,
    },
    modalSaveText: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.text,
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
      ...Font.semibold,
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
