import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Spacing,
  Typography,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { useAuthStore } from "../../src/store/authStore";
import { usePartnerStore } from "../../src/store/partnerStore";
import { useSocialStore } from "../../src/store/socialStore";
import { PublicProfile } from "../../src/types";

// ─── Rep badge ────────────────────────────────────────────────────────────────

const repColor = (level: string, Colors: ThemeColors): string => {
  switch (level) {
    case "oak":
      return Colors.accentGold;
    case "tree":
      return Colors.primaryLight;
    case "sapling":
      return Colors.success;
    case "sprout":
      return Colors.warning;
    default:
      return Colors.textMuted;
  }
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PublicProfileScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { partners, selectPartner } = usePartnerStore();
  const {
    profiles,
    following,
    isLoading,
    loadMyFollows,
    loadProfile,
    followUser,
    unfollowUser,
    isFollowing,
  } = useSocialStore();

  const myUid = user?.id ?? "";
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const partner = partners.find((p) => p.oderId === uid);
  const hasFallbackProfile = Boolean(partner);
  const fallbackProfile: PublicProfile | undefined = partner
    ? {
        uid,
        name: partner.name,
        reputation: {
          score: partner.reputation.score,
          level: partner.reputation.level,
          referralCount: 0,
        },
        currentStreak: 0,
        totalSessions: partner.totalSessionsTogether,
        completedSessions: partner.totalSessionsTogether,
      }
    : undefined;
  const profile: PublicProfile | undefined = profiles[uid] ?? fallbackProfile;
  const isPartner = partners.some((p) => p.oderId === uid);
  const following_ = isFollowing(uid);

  useEffect(() => {
    if (!myUid || !uid) return;

    const init = async () => {
      setProfileLoading(true);
      setProfileError(false);
      try {
        await Promise.all([loadMyFollows(myUid), loadProfile(uid)]);
      } catch {
        if (!hasFallbackProfile) {
          setProfileError(true);
        }
      } finally {
        setProfileLoading(false);
      }
    };

    init();
  }, [myUid, uid, hasFallbackProfile]);

  const handleToggleFollow = async () => {
    setFollowLoading(true);
    try {
      if (following_) {
        await unfollowUser(myUid, uid);
      } else {
        await followUser(myUid, uid);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primaryLight} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (profileError || (!profileLoading && !profile)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const successRate =
    profile.totalSessions > 0
      ? Math.round((profile.completedSessions / profile.totalSessions) * 100)
      : 0;

  const progressWidth = Math.min(profile.reputation.score, 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Back ────────────────────────────────────────────────────────── */}
      <View style={styles.backRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* ── Avatar ────────────────────────────────────────────────────── */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {profile.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* ── Name + rep badge ──────────────────────────────────────────── */}
        <Text style={styles.name}>{profile.name}</Text>
        <View
          style={[
            styles.repBadge,
            { borderColor: repColor(profile.reputation.level, Colors) },
          ]}
        >
          <View
            style={[
              styles.repDot,
              { backgroundColor: repColor(profile.reputation.level, Colors) },
            ]}
          />
          <Text
            style={[
              styles.repBadgeText,
              { color: repColor(profile.reputation.level, Colors) },
            ]}
          >
            {profile.reputation.level.charAt(0).toUpperCase() +
              profile.reputation.level.slice(1)}{" "}
            · {profile.reputation.score}
          </Text>
        </View>

        {/* ── Progress bar ──────────────────────────────────────────────── */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
        </View>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{successRate}%</Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
        </View>

        {/* ── Follow / Unfollow button ───────────────────────────────────── */}
        <Pressable
          style={[styles.followBtn, following_ && styles.followingBtn]}
          onPress={handleToggleFollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator
              color={following_ ? Colors.primaryLight : Colors.white}
            />
          ) : (
            <Text
              style={[
                styles.followBtnText,
                following_ && styles.followingBtnText,
              ]}
            >
              {following_ ? "Following" : "Follow"}
            </Text>
          )}
        </Pressable>

        {/* ── Start Session (partners only) ─────────────────────────────── */}
        {isPartner && (
          <Pressable
            style={styles.sessionBtn}
            onPress={() => {
              selectPartner(uid);
              router.push("/session/select");
            }}
          >
            <Text style={styles.sessionBtnText}>Start Session Together</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    backRow: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    backText: {
      fontSize: Typography.bodyMedium,
      ...Font.medium,
      color: Colors.primaryLight,
    },
    content: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
    },
    avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.primaryMuted,
      borderWidth: 2,
      borderColor: Colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.md,
    },
    avatarInitial: {
      fontSize: Typography.headlineLarge,
      ...Font.bold,
      color: Colors.primaryLight,
    },
    name: {
      fontSize: Typography.headlineSmall,
      ...Font.heavy,
      color: Colors.text,
      letterSpacing: -0.3,
      marginBottom: Spacing.sm,
    },
    repBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 5,
      marginBottom: Spacing.md,
    },
    repDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    repBadgeText: {
      fontSize: Typography.labelLarge,
      ...Font.semibold,
    },
    progressTrack: {
      width: "100%",
      height: 6,
      backgroundColor: Colors.backgroundSecondary,
      borderRadius: Radius.full,
      marginBottom: Spacing.xl,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: Colors.primaryLight,
      borderRadius: Radius.full,
    },
    statsRow: {
      flexDirection: "row",
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      width: "100%",
      marginBottom: Spacing.xl,
      paddingVertical: Spacing.md,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.text,
    },
    statLabel: {
      fontSize: Typography.labelSmall,
      ...Font.regular,
      color: Colors.textMuted,
      textAlign: "center",
    },
    statDivider: {
      width: 1,
      backgroundColor: Colors.border,
    },
    followBtn: {
      width: "100%",
      paddingVertical: Spacing.md,
      borderRadius: Radius.full,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.md,
      minHeight: 50,
    },
    followingBtn: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: Colors.primaryLight,
    },
    followBtnText: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.white,
    },
    followingBtnText: {
      color: Colors.primaryLight,
    },
    sessionBtn: {
      width: "100%",
      paddingVertical: Spacing.md,
      borderRadius: Radius.full,
      backgroundColor: Colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: Colors.border,
    },
    sessionBtnText: {
      fontSize: Typography.titleSmall,
      ...Font.medium,
      color: Colors.textSecondary,
    },
    errorText: {
      fontSize: Typography.bodyMedium,
      ...Font.regular,
      color: Colors.textMuted,
    },
  });
