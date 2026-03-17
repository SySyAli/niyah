import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../constants/colors";
import { useColors } from "../../hooks/useColors";
import { REPUTATION_LEVELS } from "../../constants/config";
import type { User } from "../../types";

interface ProfileHeaderProps {
  user: User | null;
  followingCount: number;
  partnerCount: number;
}

export function ProfileHeader({
  user,
  followingCount,
  partnerCount,
}: ProfileHeaderProps) {
  const Colors = useColors();
  const router = useRouter();
  const styles = React.useMemo(() => makeStyles(Colors), [Colors]);

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

  return (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.name?.charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>

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
          <Text style={styles.headerStatValue}>{followingCount}</Text>
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
          <Text style={styles.headerStatValue}>{partnerCount}</Text>
          <Text style={styles.headerStatLabel}>Partners</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
  });
