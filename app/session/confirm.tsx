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
  Font,
} from "../../src/constants/colors";
import { Card, Button } from "../../src/components";
import * as Haptics from "expo-haptics";
import { usePartnerStore } from "../../src/store/partnerStore";
import {
  CADENCES,
  CadenceId,
  DEMO_MODE,
  REPUTATION_LEVELS,
} from "../../src/constants/config";
import { formatMoney } from "../../src/utils/format";

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
  const { currentPartner, startDuoSession } = usePartnerStore();

  const cadence = (params.cadence as CadenceId) || "daily";
  const config = CADENCES[cadence];

  const handleConfirm = () => {
    if (currentPartner) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startDuoSession(cadence);
      router.replace("/session/active");
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // No partner selected - go to partner selection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push("/session/partner" as any);
    }
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

  const getReputationLabel = (level: string) => {
    const levelInfo =
      REPUTATION_LEVELS[level as keyof typeof REPUTATION_LEVELS];
    return levelInfo?.label || level;
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
          <Text style={styles.subtitle}>Review your duo session details</Text>
        </View>

        {/* Partner Card */}
        {currentPartner ? (
          <Card style={styles.partnerCard}>
            <Text style={styles.partnerLabel}>Your Accountability Partner</Text>
            <View style={styles.partnerInfo}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerInitial}>
                  {currentPartner.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.partnerDetails}>
                <Text style={styles.partnerName}>{currentPartner.name}</Text>
                <View style={styles.reputationBadge}>
                  <Text style={styles.reputationText}>
                    {getReputationLabel(currentPartner.reputation.level)} (
                    {currentPartner.reputation.score}/100)
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              style={styles.changePartnerButton}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push("/session/partner" as any)}
            >
              <Text style={styles.changePartnerText}>Change Partner</Text>
            </Pressable>
          </Card>
        ) : (
          <Card style={styles.noPartnerCard}>
            <Text style={styles.noPartnerText}>No partner selected</Text>
            <Button
              title="Select Partner"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push("/session/partner" as any)}
              variant="secondary"
            />
          </Card>
        )}

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
            <Text style={styles.detailLabel}>Partner's Stake</Text>
            <Text style={styles.stakeValue}>{formatMoney(config.stake)}</Text>
          </View>
        </Card>

        {/* How It Works */}
        <Card style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>How Duo Sessions Work</Text>
          <View style={styles.outcomeRow}>
            <View style={styles.outcomeDot} />
            <Text style={styles.outcomeText}>
              <Text style={styles.outcomeHighlight}>Both complete:</Text> You
              both keep your stakes
            </Text>
          </View>
          <View style={styles.outcomeRow}>
            <View
              style={[styles.outcomeDot, { backgroundColor: Colors.gain }]}
            />
            <Text style={styles.outcomeText}>
              <Text style={styles.outcomeHighlight}>You win:</Text> Partner pays
              you {formatMoney(config.stake)} via Venmo
            </Text>
          </View>
          <View style={styles.outcomeRow}>
            <View
              style={[styles.outcomeDot, { backgroundColor: Colors.loss }]}
            />
            <Text style={styles.outcomeText}>
              <Text style={styles.outcomeHighlight}>You lose:</Text> You pay
              partner {formatMoney(config.stake)} via Venmo
            </Text>
          </View>
          <View style={styles.outcomeRow}>
            <View
              style={[styles.outcomeDot, { backgroundColor: Colors.textMuted }]}
            />
            <Text style={styles.outcomeText}>
              <Text style={styles.outcomeHighlight}>Both fail:</Text> Both
              stakes forfeited
            </Text>
          </View>
        </Card>

        {/* Warning */}
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Important</Text>
          <Text style={styles.warningText}>
            Once you start, distracting apps will be blocked. If you surrender
            early, you'll owe your partner {formatMoney(config.stake)}. Your
            reputation score will be affected by payment reliability.
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
          title={
            currentPartner ? "Start Duo Session" : "Select a Partner First"
          }
          onPress={handleConfirm}
          size="large"
          disabled={!currentPartner}
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
    ...Font.medium,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
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
  // Partner card styles
  partnerCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  partnerLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  partnerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  partnerInitial: {
    fontSize: Typography.titleMedium,
    ...Font.bold,
    color: Colors.text,
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: Typography.titleSmall,
    ...Font.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  reputationBadge: {
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },
  reputationText: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
  },
  changePartnerButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  changePartnerText: {
    fontSize: Typography.labelMedium,
    color: Colors.primary,
    ...Font.medium,
  },
  noPartnerCard: {
    marginBottom: Spacing.md,
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  noPartnerText: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  // Details card
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
    ...Font.medium,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  stakeValue: {
    fontSize: Typography.titleMedium,
    ...Font.bold,
    color: Colors.text,
  },
  // How it works card
  howItWorksCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.backgroundCard,
  },
  howItWorksTitle: {
    fontSize: Typography.titleSmall,
    ...Font.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  outcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  outcomeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
  },
  outcomeText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  outcomeHighlight: {
    ...Font.semibold,
    color: Colors.text,
  },
  // Warning card
  warningCard: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: Spacing.md,
  },
  warningTitle: {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
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
    ...Font.medium,
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
