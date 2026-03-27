import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, LinearGradient, Stop, Defs } from "react-native-svg";
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
  BLOB_DISPLAY_LABELS,
  generateBlobAvatarPreset,
  type BlobAvatarColorPreset,
  type BlobAvatarConfig,
  type BlobAvatarEyesPreset,
  type BlobAvatarShapePreset,
} from "../../constants/blobAvatar";

/** Gradient circle swatch used for color selection */
const COLOR_SWATCH_DATA: Record<
  BlobAvatarColorPreset,
  { start: string; end: string }
> = {
  sunset: { start: "#F0A090", end: "#E07A5F" },
  ocean: { start: "#64BFEE", end: "#329DD8" },
  forest: { start: "#5CB88A", end: "#40916C" },
  berry: { start: "#D38ECF", end: "#A65EA1" },
  lemon: { start: "#F5D76E", end: "#E8B830" },
  coral: { start: "#FF8A80", end: "#E05555" },
};

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
      <Text style={styles.name}>{user?.name || "?"}</Text>
      <Text style={styles.email}>{user?.email || ""}</Text>

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

      {user ? (
        <View style={styles.blobMakerCard}>
          <Text style={styles.blobMakerTitle}>Blob Maker</Text>

          {/* ── Color selector: gradient circle swatches ── */}
          <Text style={styles.blobMakerLabel}>Color</Text>
          <View style={styles.optionsRow}>
            {BLOB_AVATAR_COLORS.map((option) => {
              const selected = avatarConfig.colorPreset === option;
              const swatch = COLOR_SWATCH_DATA[option];
              return (
                <Pressable
                  key={option}
                  style={styles.swatchWrapper}
                  onPress={() => updateBlobAvatar("colorPreset", option)}
                >
                  <View
                    style={[
                      styles.swatchRing,
                      selected && {
                        borderColor: Colors.primary,
                        borderWidth: 2.5,
                      },
                    ]}
                  >
                    <Svg width={36} height={36} viewBox="0 0 36 36">
                      <Defs>
                        <LinearGradient
                          id={`swatch-${option}`}
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="1"
                        >
                          <Stop offset="0" stopColor={swatch.start} />
                          <Stop offset="1" stopColor={swatch.end} />
                        </LinearGradient>
                      </Defs>
                      <Circle
                        cx={18}
                        cy={18}
                        r={16}
                        fill={`url(#swatch-${option})`}
                      />
                    </Svg>
                  </View>
                  <Text
                    style={[
                      styles.swatchLabel,
                      selected && styles.swatchLabelSelected,
                    ]}
                  >
                    {BLOB_DISPLAY_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Shape selector: mini blob previews ── */}
          <Text style={styles.blobMakerLabel}>Shape</Text>
          <View style={styles.optionsRow}>
            {BLOB_AVATAR_SHAPES.map((option) => {
              const selected = avatarConfig.shapePreset === option;
              return (
                <Pressable
                  key={option}
                  style={styles.previewWrapper}
                  onPress={() => updateBlobAvatar("shapePreset", option)}
                >
                  <View
                    style={[
                      styles.previewBorder,
                      selected && {
                        borderColor: Colors.primary,
                        borderWidth: 2.5,
                      },
                    ]}
                  >
                    <BlobAvatar
                      size={48}
                      config={{
                        ...avatarConfig,
                        shapePreset: option,
                      }}
                    />
                  </View>
                  <Text
                    style={[
                      styles.swatchLabel,
                      selected && styles.swatchLabelSelected,
                    ]}
                  >
                    {BLOB_DISPLAY_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Eyes selector: mini blob previews ── */}
          <Text style={styles.blobMakerLabel}>Expression</Text>
          <View style={styles.optionsRow}>
            {BLOB_AVATAR_EYES.map((option) => {
              const selected = avatarConfig.eyesPreset === option;
              return (
                <Pressable
                  key={option}
                  style={styles.previewWrapper}
                  onPress={() => updateBlobAvatar("eyesPreset", option)}
                >
                  <View
                    style={[
                      styles.previewBorder,
                      selected && {
                        borderColor: Colors.primary,
                        borderWidth: 2.5,
                      },
                    ]}
                  >
                    <BlobAvatar
                      size={48}
                      config={{
                        ...avatarConfig,
                        eyesPreset: option,
                      }}
                    />
                  </View>
                  <Text
                    style={[
                      styles.swatchLabel,
                      selected && styles.swatchLabelSelected,
                    ]}
                  >
                    {BLOB_DISPLAY_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
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
    swatchWrapper: {
      alignItems: "center",
      gap: 4,
    },
    swatchRing: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    swatchLabel: {
      fontSize: Typography.labelSmall,
      color: Colors.textSecondary,
      ...Font.medium,
    },
    swatchLabelSelected: {
      color: Colors.primary,
      ...Font.semibold,
    },
    previewWrapper: {
      alignItems: "center",
      gap: 4,
    },
    previewBorder: {
      width: 56,
      height: 56,
      borderRadius: Radius.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
  });
