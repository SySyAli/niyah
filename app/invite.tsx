import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  Spacing,
  Typography,
  Radius,
  Font,
  type ThemeColors,
} from "../src/constants/colors";
import { useColors } from "../src/hooks/useColors";
import { withErrorBoundary } from "../src/components";
import { useAuthStore } from "../src/store/authStore";

// ─── Back button ──────────────────────────────────────────────────────────────

const BackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <Pressable
      onPress={onPress}
      style={styles.backBtn}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.backBtnText}>← Back</Text>
    </Pressable>
  );
};

// ─── Share Button — Reanimated spring ─────────────────────────────────────────

const ShareButton: React.FC<{ onPress: () => void; shared: boolean }> = ({
  onPress,
  shared,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 10, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 6, stiffness: 300 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel="Share invite link"
    >
      <Animated.View
        style={[
          styles.shareBtn,
          shared && styles.shareBtnShared,
          animatedStyle,
        ]}
      >
        <Text
          style={[styles.shareBtnText, shared && styles.shareBtnTextShared]}
        >
          {shared ? "Link Shared ✓" : "Share Invite Link"}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// ─── Perk Row ─────────────────────────────────────────────────────────────────

const PerkRow: React.FC<{ emoji: string; text: string }> = ({
  emoji,
  text,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.perkRow}>
      <Text style={styles.perkEmoji}>{emoji}</Text>
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

function InviteScreenInner() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { user } = useAuthStore();
  const uid = user?.id ?? "";

  const [shared, setShared] = useState(false);

  const inviteLink = Linking.createURL("/", {
    queryParams: uid ? { ref: uid } : undefined,
  });
  const message =
    `I'm using Niyah to stay focused by putting real money on the line. ` +
    `Join me and we can keep each other accountable!\n\n${inviteLink}`;

  const handleShare = async () => {
    try {
      const result = await Share.share(
        { message },
        { dialogTitle: "Invite a friend to Niyah" },
      );

      if (result.action === Share.sharedAction) {
        setShared(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // User dismissed the share sheet — no action needed
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Invite Friends</Text>
        <View style={styles.bonusBadge}>
          <Text style={styles.bonusBadgeText}>
            +10 social credit per referral
          </Text>
        </View>
        <Text style={styles.subtitle}>
          Share your personal link. When a friend signs up and completes their
          profile, you both get a social credit boost.
        </Text>
      </View>

      {/* ── Perks ───────────────────────────────────────────────────────── */}
      <View style={styles.perksCard}>
        <PerkRow
          emoji="🌱"
          text="Your friend starts with a social credit boost"
        />
        <View style={styles.perkDivider} />
        <PerkRow
          emoji="🤝"
          text="They're automatically added to your partner list"
        />
        <View style={styles.perkDivider} />
        <PerkRow
          emoji="⭐"
          text="You earn +10 social credit for each referral"
        />
      </View>

      {/* ── Invite link preview ─────────────────────────────────────────── */}
      <View style={styles.linkCard}>
        <Text style={styles.linkLabel}>Your invite link</Text>
        <Text style={styles.linkText} numberOfLines={1}>
          {inviteLink}
        </Text>
      </View>

      {/* ── Share button ────────────────────────────────────────────────── */}
      <View style={styles.shareContainer}>
        <ShareButton onPress={handleShare} shared={shared} />
        <Text style={styles.shareHint}>
          Opens your native share sheet — send via Messages, WhatsApp, email,
          and more
        </Text>
      </View>
    </SafeAreaView>
  );
}

const InviteScreen = withErrorBoundary(InviteScreenInner, "invite");
export default InviteScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },

    // ── Back ──────────────────────────────────────────────────────────────────
    backBtn: {
      alignSelf: "flex-start",
      marginBottom: Spacing.sm,
    },
    backBtnText: {
      fontSize: Typography.bodyMedium,
      ...Font.medium,
      color: Colors.primaryLight,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    title: {
      fontSize: Typography.headlineMedium,
      ...Font.heavy,
      color: Colors.text,
      letterSpacing: -0.5,
      marginBottom: Spacing.sm,
    },
    bonusBadge: {
      alignSelf: "flex-start",
      backgroundColor: Colors.primaryMuted,
      borderRadius: Radius.full,
      paddingVertical: 4,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
    },
    bonusBadgeText: {
      fontSize: Typography.labelLarge,
      ...Font.semibold,
      color: Colors.primaryLight,
    },
    subtitle: {
      fontSize: Typography.bodySmall,
      ...Font.regular,
      color: Colors.textSecondary,
      lineHeight: 18,
    },

    // ── Perks ─────────────────────────────────────────────────────────────────
    perksCard: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    perkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    perkDivider: {
      height: 1,
      backgroundColor: Colors.borderLight,
    },
    perkEmoji: {
      fontSize: 20,
    },
    perkText: {
      flex: 1,
      fontSize: Typography.bodySmall,
      ...Font.regular,
      color: Colors.textSecondary,
      lineHeight: 18,
    },

    // ── Link preview ──────────────────────────────────────────────────────────
    linkCard: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.xl,
      backgroundColor: Colors.backgroundSecondary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    linkLabel: {
      fontSize: Typography.labelSmall,
      ...Font.medium,
      color: Colors.textMuted,
      marginBottom: 2,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    linkText: {
      fontSize: Typography.bodySmall,
      ...Font.regular,
      color: Colors.primaryLight,
      fontVariant: ["tabular-nums"],
    },

    // ── Share button ──────────────────────────────────────────────────────────
    shareContainer: {
      paddingHorizontal: Spacing.lg,
      alignItems: "center",
      gap: Spacing.sm,
    },
    shareBtn: {
      width: "100%",
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    shareBtnShared: {
      backgroundColor: Colors.primaryMuted,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
    },
    shareBtnText: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.white,
      letterSpacing: 0.2,
    },
    shareBtnTextShared: {
      color: Colors.primaryLight,
    },
    shareHint: {
      fontSize: Typography.labelSmall,
      ...Font.regular,
      color: Colors.textMuted,
      textAlign: "center",
      lineHeight: 16,
    },
  });
