import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
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

// ─── Styles (makeStyles) ──────────────────────────────────────────────────────

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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    title: {
      fontSize: Typography.headlineMedium,
      ...Font.heavy,
      color: Colors.text,
      letterSpacing: -0.5,
    },
    inviteLink: {
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      color: Colors.primaryLight,
    },
    segmentRow: {
      flexDirection: "row",
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      backgroundColor: Colors.backgroundSecondary,
      borderRadius: Radius.full,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      alignItems: "center",
    },
    segmentActive: {
      backgroundColor: Colors.primary,
    },
    segmentLabel: {
      fontSize: Typography.labelLarge,
      ...Font.semibold,
      color: Colors.textMuted,
    },
    segmentLabelActive: {
      color: Colors.white,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    emptyState: {
      paddingTop: Spacing.xxl,
      alignItems: "center",
    },
    emptyText: {
      fontSize: Typography.bodyMedium,
      ...Font.regular,
      color: Colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
      gap: Spacing.md,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.primaryMuted,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: Typography.titleSmall,
      ...Font.bold,
      color: Colors.primaryLight,
    },
    rowInfo: {
      flex: 1,
      gap: 4,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    rowName: {
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      color: Colors.text,
    },
    tagBadge: {
      fontSize: Typography.labelSmall,
      ...Font.medium,
      color: Colors.accentGold,
      backgroundColor: "rgba(184,134,11,0.15)",
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    repRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    repDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    repScore: {
      fontSize: Typography.labelMedium,
      ...Font.regular,
      color: Colors.textSecondary,
    },
    unfollowBtn: {
      paddingVertical: 6,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: Colors.border,
      minWidth: 80,
      alignItems: "center",
    },
    unfollowBtnText: {
      fontSize: Typography.labelLarge,
      ...Font.medium,
      color: Colors.textMuted,
    },
    followBtn: {
      paddingVertical: 6,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      backgroundColor: Colors.primary,
      minWidth: 80,
      alignItems: "center",
    },
    followingBtn: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: Colors.primaryLight,
    },
    followBtnText: {
      fontSize: Typography.labelLarge,
      ...Font.semibold,
      color: Colors.white,
    },
    followingBtnText: {
      color: Colors.primaryLight,
    },
  });

// ─── Segment control ──────────────────────────────────────────────────────────

const SegmentControl: React.FC<{
  selected: "following" | "partners";
  onChange: (tab: "following" | "partners") => void;
}> = ({ selected, onChange }) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.segmentRow}>
      <Pressable
        style={[
          styles.segment,
          selected === "following" && styles.segmentActive,
        ]}
        onPress={() => onChange("following")}
      >
        <Text
          style={[
            styles.segmentLabel,
            selected === "following" && styles.segmentLabelActive,
          ]}
        >
          Following
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.segment,
          selected === "partners" && styles.segmentActive,
        ]}
        onPress={() => onChange("partners")}
      >
        <Text
          style={[
            styles.segmentLabel,
            selected === "partners" && styles.segmentLabelActive,
          ]}
        >
          Partners
        </Text>
      </Pressable>
    </View>
  );
};

// ─── Rep dot ──────────────────────────────────────────────────────────────────

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

// ─── Following row ────────────────────────────────────────────────────────────

const FollowingRow: React.FC<{
  profile: PublicProfile;
  onPress: () => void;
  onUnfollow: () => void;
  unfollowLoading: boolean;
}> = ({ profile, onPress, onUnfollow, unfollowLoading }) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarInitial}>
          {profile.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{profile.name}</Text>
        <View style={styles.repRow}>
          <View
            style={[
              styles.repDot,
              { backgroundColor: repColor(profile.reputation.level, Colors) },
            ]}
          />
          <Text style={styles.repScore}>{profile.reputation.score}</Text>
        </View>
      </View>
      <Pressable
        style={styles.unfollowBtn}
        onPress={onUnfollow}
        disabled={unfollowLoading}
      >
        {unfollowLoading ? (
          <ActivityIndicator size="small" color={Colors.textMuted} />
        ) : (
          <Text style={styles.unfollowBtnText}>Unfollow</Text>
        )}
      </Pressable>
    </Pressable>
  );
};

// ─── Partner row ──────────────────────────────────────────────────────────────

const PartnerRow: React.FC<{
  uid: string;
  name: string;
  tag?: string;
  reputationLevel: string;
  reputationScore: number;
  isFollowing: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
  followLoading: boolean;
}> = ({
  name,
  tag,
  reputationLevel,
  reputationScore,
  isFollowing,
  onPress,
  onToggleFollow,
  followLoading,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.rowName}>{name}</Text>
          {tag ? <Text style={styles.tagBadge}>{tag}</Text> : null}
        </View>
        <View style={styles.repRow}>
          <View
            style={[
              styles.repDot,
              { backgroundColor: repColor(reputationLevel, Colors) },
            ]}
          />
          <Text style={styles.repScore}>{reputationScore}</Text>
        </View>
      </View>
      <Pressable
        style={[styles.followBtn, isFollowing && styles.followingBtn]}
        onPress={onToggleFollow}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color={Colors.primaryLight} />
        ) : (
          <Text
            style={[
              styles.followBtnText,
              isFollowing && styles.followingBtnText,
            ]}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { tab: requestedTab } = useLocalSearchParams<{
    tab?: "following" | "partners";
  }>();
  const { user } = useAuthStore();
  const { partners } = usePartnerStore();
  const {
    following,
    profiles,
    isLoading,
    loadMyFollows,
    followUser,
    unfollowUser,
    loadProfile,
    isFollowing,
  } = useSocialStore();

  const [tab, setTab] = useState<"following" | "partners">(
    requestedTab === "partners" ? "partners" : "following",
  );
  const [loadingUids, setLoadingUids] = useState<Record<string, boolean>>({});

  const myUid = user?.id ?? "";

  useEffect(() => {
    if (myUid) {
      loadMyFollows(myUid);
    }
  }, [myUid]);

  useEffect(() => {
    if (requestedTab === "following" || requestedTab === "partners") {
      setTab(requestedTab);
    }
  }, [requestedTab]);

  // Load profiles for everyone we follow
  useEffect(() => {
    following.forEach((uid) => {
      if (!profiles[uid]) {
        loadProfile(uid).catch(() => {});
      }
    });
  }, [following]);

  const getFallbackProfile = (uid: string): PublicProfile | null => {
    const partner = partners.find((p) => p.oderId === uid);
    if (!partner) return null;

    return {
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
    };
  };

  const handleUnfollow = async (targetUid: string) => {
    setLoadingUids((prev) => ({ ...prev, [targetUid]: true }));
    try {
      await unfollowUser(myUid, targetUid);
    } finally {
      setLoadingUids((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  const handleToggleFollow = async (targetUid: string) => {
    setLoadingUids((prev) => ({ ...prev, [targetUid]: true }));
    try {
      if (isFollowing(targetUid)) {
        await unfollowUser(myUid, targetUid);
      } else {
        await followUser(myUid, targetUid);
        setTab("following");
        // Best-effort profile hydration; fallback data still renders if missing.
        loadProfile(targetUid).catch(() => {});
      }
    } finally {
      setLoadingUids((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Pressable onPress={() => router.push("/invite")}>
          <Text style={styles.inviteLink}>Invite →</Text>
        </Pressable>
      </View>

      {/* ── Segment control ─────────────────────────────────────────────── */}
      <SegmentControl selected={tab} onChange={setTab} />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primaryLight} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {tab === "following" ? (
            following.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Follow your partners to stay connected
                </Text>
              </View>
            ) : (
              following.map((uid) => {
                const profile = profiles[uid] ?? getFallbackProfile(uid);
                if (!profile) return null;
                return (
                  <FollowingRow
                    key={uid}
                    profile={profile}
                    onPress={() => router.push(`/user/${uid}` as any)}
                    onUnfollow={() => handleUnfollow(uid)}
                    unfollowLoading={!!loadingUids[uid]}
                  />
                );
              })
            )
          ) : partners.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No partners yet. Invite friends to do sessions together.
              </Text>
            </View>
          ) : (
            partners.map((partner) => (
              <PartnerRow
                key={partner.id}
                uid={partner.oderId}
                name={partner.name}
                tag={partner.tag}
                reputationLevel={partner.reputation.level}
                reputationScore={partner.reputation.score}
                isFollowing={isFollowing(partner.oderId)}
                onPress={() => router.push(`/user/${partner.oderId}` as any)}
                onToggleFollow={() => handleToggleFollow(partner.oderId)}
                followLoading={!!loadingUids[partner.oderId]}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
