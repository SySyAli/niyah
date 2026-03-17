import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Typography,
  Spacing,
  Font,
  type ThemeColors,
} from "../../constants/colors";
import { useColors } from "../../hooks/useColors";
import { Card } from "../Card";
import { REPUTATION_LEVELS } from "../../constants/config";
import type { UserReputation } from "../../types";

interface ReputationCardProps {
  reputation: UserReputation | undefined;
  partnerCount: number;
}

export function ReputationCard({
  reputation,
  partnerCount,
}: ReputationCardProps) {
  const Colors = useColors();
  const styles = React.useMemo(() => makeStyles(Colors), [Colors]);

  const reputationLevel = reputation?.level || "sapling";
  const reputationInfo =
    REPUTATION_LEVELS[reputationLevel as keyof typeof REPUTATION_LEVELS];

  const getReputationColor = (score: number) => {
    if (score >= 80) return Colors.gain;
    if (score >= 60) return Colors.primary;
    if (score >= 40) return Colors.warning;
    return Colors.loss;
  };

  return (
    <Card style={styles.reputationCard}>
      <View style={styles.reputationHeader}>
        <Text style={styles.reputationTitle}>Social Credit</Text>
        <Text style={styles.reputationDescription}>
          {reputationInfo?.description || "Building trust"}
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${reputation?.score || 50}%`,
                backgroundColor: getReputationColor(reputation?.score || 50),
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>Seed</Text>
          <Text style={styles.progressLabel}>Oak</Text>
        </View>
      </View>

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
          <Text style={styles.paymentValue}>{partnerCount}</Text>
          <Text style={styles.paymentLabel}>Partners</Text>
        </View>
        <View style={styles.paymentStat}>
          <Text style={[styles.paymentValue, { color: Colors.primaryLight }]}>
            {reputation?.referralCount || 0}
          </Text>
          <Text style={styles.paymentLabel}>Referred</Text>
        </View>
      </View>
    </Card>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
  });
