import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { BlobAvatar } from "../BlobAvatar";
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
import {
  BLOB_AVATAR_COLORS,
  BLOB_AVATAR_EYES,
  BLOB_AVATAR_SHAPES,
  generateBlobAvatarPreset,
  type BlobAvatarColorPreset,
  type BlobAvatarConfig,
  type BlobAvatarEyesPreset,
  type BlobAvatarShapePreset,
} from "../../constants/blobAvatar";

interface ProfileHeaderProps {
  user: User | null;
  followingCount: number;
  partnerCount: number;
  onBlobAvatarChange?: (blobAvatar: BlobAvatarConfig) => void;
}

export function ProfileHeader({
  user,
  followingCount,
  partnerCount,
  onBlobAvatarChange,
}: ProfileHeaderProps) {
  const Colors = useColors();
  const router = useRouter();
  const styles = React.useMemo(() => makeStyles(Colors), [Colors]);
  const avatarConfig = React.useMemo(
    () => user?.blobAvatar || generateBlobAvatarPreset(user?.id || "guest"),
    [user?.blobAvatar, user?.id],
  );

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

  const getPresetLabel = (
    value: BlobAvatarColorPreset | BlobAvatarShapePreset | BlobAvatarEyesPreset,
  ) => {
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const updateBlobAvatar = (
    key: keyof BlobAvatarConfig,
    value: BlobAvatarConfig[keyof BlobAvatarConfig],
  ) => {
    if (!user || !onBlobAvatarChange) return;
    Haptics.selectionAsync();
    onBlobAvatarChange({
      ...avatarConfig,
      [key]: value,
    } as BlobAvatarConfig);
  };

  return (
    <View style={styles.header}>
      <BlobAvatar size={92} config={avatarConfig} />
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

      <View style={styles.blobMakerCard}>
        <Text style={styles.blobMakerTitle}>Blob Maker</Text>

        <Text style={styles.blobMakerLabel}>Color</Text>
        <View style={styles.optionsRow}>
          {BLOB_AVATAR_COLORS.map((option) => {
            const selected = avatarConfig.colorPreset === option;
            return (
              <Pressable
                key={option}
                style={[
                  styles.optionPill,
                  selected && styles.optionPillSelected,
                  selected && { borderColor: Colors.primary },
                ]}
                onPress={() => updateBlobAvatar("colorPreset", option)}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    selected && styles.optionPillTextSelected,
                  ]}
                >
                  {getPresetLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.blobMakerLabel}>Shape</Text>
        <View style={styles.optionsRow}>
          {BLOB_AVATAR_SHAPES.map((option) => {
            const selected = avatarConfig.shapePreset === option;
            return (
              <Pressable
                key={option}
                style={[
                  styles.optionPill,
                  selected && styles.optionPillSelected,
                  selected && { borderColor: Colors.primary },
                ]}
                onPress={() => updateBlobAvatar("shapePreset", option)}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    selected && styles.optionPillTextSelected,
                  ]}
                >
                  {getPresetLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.blobMakerLabel}>Eyes</Text>
        <View style={styles.optionsRow}>
          {BLOB_AVATAR_EYES.map((option) => {
            const selected = avatarConfig.eyesPreset === option;
            return (
              <Pressable
                key={option}
                style={[
                  styles.optionPill,
                  selected && styles.optionPillSelected,
                  selected && { borderColor: Colors.primary },
                ]}
                onPress={() => updateBlobAvatar("eyesPreset", option)}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    selected && styles.optionPillTextSelected,
                  ]}
                >
                  {getPresetLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
    name: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.text,
      marginTop: Spacing.sm,
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
    blobMakerCard: {
      marginTop: Spacing.lg,
      width: "100%",
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    blobMakerTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.md,
    },
    blobMakerLabel: {
      fontSize: Typography.labelMedium,
      color: Colors.textSecondary,
      marginBottom: Spacing.sm,
      marginTop: Spacing.xs,
    },
    optionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    optionPill: {
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.backgroundSecondary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
    },
    optionPillSelected: {
      backgroundColor: Colors.primaryMuted,
    },
    optionPillText: {
      fontSize: Typography.bodySmall,
      ...Font.medium,
      color: Colors.textSecondary,
    },
    optionPillTextSelected: {
      color: Colors.text,
      ...Font.semibold,
    },
  });
