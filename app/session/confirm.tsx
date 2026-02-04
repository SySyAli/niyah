import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Card, Button } from "../../src/components";
import { useSessionStore } from "../../src/store/sessionStore";
import { useAuthStore } from "../../src/store/authStore";
import { CADENCES, CadenceId, DEMO_MODE } from "../../src/constants/config";
import { formatMoney, getStreakMultiplier } from "../../src/utils/format";

const BLOCKED_APPS = [
  "Instagram",
  "TikTok",
  "Twitter/X",
  "YouTube",
  "Reddit",
  "Facebook",
];

export default function ConfirmSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const startSession = useSessionStore((state) => state.startSession);
  const user = useAuthStore((state) => state.user);

  const cadence = (params.cadence as CadenceId) || "daily";
  const config = CADENCES[cadence];
  const streakMultiplier = getStreakMultiplier(
    user?.currentStreak || 0,
    cadence,
  );
  const actualPayout = Math.round(config.basePayout * streakMultiplier);

  const handleConfirm = () => {
    startSession(cadence);
    router.replace("/session/active");
  };

  const getDurationText = () => {
    if (DEMO_MODE) return `${config.demoDuration / 1000} seconds (demo)`;
    switch (cadence) {
      case "daily":
        return "24 hours";
      case "weekly":
        return "7 days";
      case "monthly":
        return "30 days";
      default:
        return "";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Ready to Focus?</Text>
          <Text style={styles.subtitle}>Review your session details</Text>
        </View>

        {/* Session Details */}
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Session Type</Text>
            <Text style={styles.detailValue}>{config.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{getDurationText()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Your Stake</Text>
            <Text style={styles.stakeValue}>{formatMoney(config.stake)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Your Payout</Text>
            <Text style={styles.payoutValue}>{formatMoney(actualPayout)}</Text>
          </View>
          {streakMultiplier > 1 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>
                {user?.currentStreak}-day streak bonus:{" "}
                {streakMultiplier.toFixed(2)}x
              </Text>
            </View>
          )}
        </Card>

        {/* Warning */}
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Important</Text>
          <Text style={styles.warningText}>
            Once you start, distracting apps will be blocked. If you surrender
            early, you will lose your entire {formatMoney(config.stake)} stake.
          </Text>
        </Card>

        {/* Blocked Apps */}
        <View style={styles.blockedSection}>
          <Text style={styles.blockedTitle}>Apps that will be blocked</Text>
          <View style={styles.appList}>
            {BLOCKED_APPS.map((app) => (
              <View key={app} style={styles.appBadge}>
                <Text style={styles.appName}>{app}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.blockedNote}>
            Demo mode: Apps are not actually blocked
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Start Focus Session"
          onPress={handleConfirm}
          size="large"
        />
        <Text style={styles.disclaimer}>
          Your {formatMoney(config.stake)} stake will be deducted immediately
        </Text>
      </View>
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
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.md,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.bodyLarge,
    fontWeight: "500",
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.headlineMedium,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  detailsCard: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.bodySmall,
    fontWeight: "500",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  stakeValue: {
    fontSize: Typography.titleMedium,
    fontWeight: "700",
    color: Colors.text,
  },
  payoutValue: {
    fontSize: Typography.titleMedium,
    fontWeight: "700",
    color: Colors.gain,
  },
  bonusBadge: {
    backgroundColor: Colors.primaryMuted,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  bonusText: {
    fontSize: Typography.labelSmall,
    fontWeight: "600",
    color: Colors.primary,
  },
  warningCard: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: Spacing.md,
  },
  warningTitle: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.warning,
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontSize: Typography.bodySmall,
    color: Colors.text,
    lineHeight: 20,
  },
  blockedSection: {
    marginBottom: Spacing.lg,
  },
  blockedTitle: {
    fontSize: Typography.labelMedium,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  appList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  appBadge: {
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appName: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
  },
  blockedNote: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  disclaimer: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: Typography.labelSmall,
  },
});
