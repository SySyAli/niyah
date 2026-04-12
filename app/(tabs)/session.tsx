import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type RelativePathString } from "expo-router";
import { Typography, Spacing, Radius, Font } from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import * as Haptics from "expo-haptics";
import { Card, Button } from "../../src/components";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { useAuthStore } from "../../src/store/authStore";
import { formatMoney } from "../../src/utils/format";

export default function SessionTabScreen() {
  const Colors = useColors();
  const router = useRouter();
  const {
    activeGroupSession,
    pendingInvites,
    activeGroupSessions,
    subscribeToSession,
  } = useGroupSessionStore();
  const userId = useAuthStore((state) => state.user?.id);
  const activePartner = activeGroupSession?.participants.find(
    (p) => p.userId !== userId,
  );

  const styles = useMemo(
    () =>
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
        content: {
          flex: 1,
          padding: Spacing.lg,
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
          marginBottom: Spacing.lg,
        },
        challengeCard: {
          backgroundColor: Colors.primaryDark,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          marginBottom: Spacing.lg,
        },
        challengeTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: Spacing.xs,
        },
        challengeTitle: {
          fontSize: Typography.titleMedium,
          ...Font.bold,
          color: Colors.white,
        },
        challengeArrow: {
          fontSize: 20,
          color: "rgba(255,255,255,0.6)",
        },
        challengeSubtitle: {
          fontSize: Typography.bodySmall,
          color: "rgba(255,255,255,0.65)",
          marginBottom: Spacing.md,
        },
        challengeTags: {
          flexDirection: "row",
          gap: Spacing.sm,
          flexWrap: "wrap",
        },
        challengeTag: {
          paddingVertical: 4,
          paddingHorizontal: Spacing.sm,
          borderRadius: Radius.full,
          backgroundColor: "rgba(255,255,255,0.12)",
        },
        challengeTagText: {
          fontSize: Typography.labelSmall,
          ...Font.medium,
          color: "rgba(255,255,255,0.8)",
        },
        sectionLabel: {
          fontSize: Typography.labelMedium,
          ...Font.semibold,
          color: Colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: Spacing.md,
        },
        activeHeader: {
          marginBottom: Spacing.xl,
        },
        activeCard: {
          alignItems: "center",
          paddingVertical: Spacing.xxl,
          marginBottom: Spacing.xl,
        },
        pulseIndicator: {
          width: 48,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: Spacing.lg,
        },
        pulseOuter: {
          position: "absolute",
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: Colors.primaryMuted,
        },
        pulseInner: {
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: Colors.primary,
        },
        activeTitle: {
          fontSize: Typography.titleLarge,
          ...Font.bold,
          color: Colors.text,
        },
        activeSubtitle: {
          fontSize: Typography.bodyMedium,
          color: Colors.textSecondary,
          marginTop: Spacing.xs,
        },
        activeFooter: {
          marginTop: "auto",
        },
        howItWorks: {
          backgroundColor: Colors.backgroundCard,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
        },
        howTitle: {
          fontSize: Typography.titleSmall,
          ...Font.semibold,
          color: Colors.text,
          marginBottom: Spacing.md,
        },
        stepList: {
          gap: Spacing.sm,
        },
        stepRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        stepNumber: {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: Colors.backgroundTertiary,
          alignItems: "center",
          justifyContent: "center",
          marginRight: Spacing.sm,
        },
        stepNumberText: {
          fontSize: Typography.labelSmall,
          ...Font.semibold,
          color: Colors.textSecondary,
        },
        stepText: {
          flex: 1,
          fontSize: Typography.bodySmall,
          color: Colors.textSecondary,
          lineHeight: 20,
        },
        inviteBanner: {
          marginBottom: Spacing.md,
        },
        inviteBannerContent: {
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.md,
        },
        inviteBadge: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "#E07A5F",
          alignItems: "center",
          justifyContent: "center",
        },
        inviteBadgeText: {
          fontSize: 14,
          fontWeight: "700",
        },
        inviteBannerTitle: {
          fontSize: 16,
          fontWeight: "600",
        },
        inviteBannerSubtitle: {
          fontSize: 13,
          marginTop: 2,
        },
      }),
    [Colors],
  );

  if (activeGroupSession) {
    const isSolo = activeGroupSession.participants.length <= 1;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.activeHeader}>
            <Text style={styles.title}>
              {isSolo ? "Solo Session Active" : "Duo Session Active"}
            </Text>
            <Text style={styles.subtitle}>
              {isSolo
                ? "Your focus session is in progress"
                : `Focus session with ${activePartner?.name ?? "Partner"}`}
            </Text>
          </View>

          <Card style={styles.activeCard} variant="elevated">
            <View style={styles.pulseIndicator}>
              <View style={styles.pulseOuter} />
              <View style={styles.pulseInner} />
            </View>
            <Text style={styles.activeTitle}>
              {activeGroupSession.cadence.charAt(0).toUpperCase() +
                activeGroupSession.cadence.slice(1)}{" "}
              Session
            </Text>
            <Text style={styles.activeSubtitle}>
              Stake: {formatMoney(activeGroupSession.stakePerParticipant)}
            </Text>
          </Card>

          <View style={styles.activeFooter}>
            <Button
              title="View Active Session"
              onPress={() => router.push("/session/active")}
              size="large"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Start a Session</Text>
        <Text style={styles.subtitle}>Choose your commitment level</Text>

        {pendingInvites && pendingInvites.length > 0 && (
          <Pressable
            onPress={() =>
              router.push("/session/invites" as RelativePathString)
            }
            style={styles.inviteBanner}
          >
            <Card variant="interactive">
              <View style={styles.inviteBannerContent}>
                <View style={styles.inviteBadge}>
                  <Text
                    style={[
                      styles.inviteBadgeText,
                      { color: Colors.background },
                    ]}
                  >
                    {pendingInvites.length}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.inviteBannerTitle, { color: Colors.text }]}
                  >
                    Pending Invites
                  </Text>
                  <Text
                    style={[
                      styles.inviteBannerSubtitle,
                      { color: Colors.textSecondary },
                    ]}
                  >
                    {pendingInvites.length === 1
                      ? `${pendingInvites[0].fromUserName} invited you`
                      : `${pendingInvites.length} group sessions waiting`}
                  </Text>
                </View>
                <Text style={{ color: Colors.textTertiary, fontSize: 18 }}>
                  ›
                </Text>
              </View>
            </Card>
          </Pressable>
        )}

        {activeGroupSessions &&
          activeGroupSessions.length > 0 &&
          activeGroupSessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => {
                if (session.status === "active") {
                  // Subscribe to the session so active.tsx can render on recovery
                  subscribeToSession(session.id);
                  router.push("/session/active");
                } else {
                  router.push(
                    `/session/waiting-room?sessionId=${session.id}` as RelativePathString,
                  );
                }
              }}
              style={{ marginBottom: Spacing.sm }}
            >
              <Card variant="interactive">
                <View style={styles.inviteBannerContent}>
                  <Text
                    style={[styles.inviteBannerTitle, { color: Colors.text }]}
                  >
                    {session.status === "active"
                      ? "Session Active"
                      : `Group Session ${session.status === "ready" ? "Ready" : "Pending"}`}
                  </Text>
                  <Text style={{ color: Colors.primary }}>View →</Text>
                </View>
              </Card>
            </Pressable>
          ))}

        {/* Challenge a Friend */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/session/propose");
          }}
        >
          <View style={styles.challengeCard}>
            <View style={styles.challengeTitleRow}>
              <Text style={styles.challengeTitle}>Group Challenge</Text>
              <Text style={styles.challengeArrow}>→</Text>
            </View>
            <Text style={styles.challengeSubtitle}>
              Invite any number of friends, set a stake, pick a time
            </Text>
            <View style={styles.challengeTags}>
              {["Custom stake", "2+ players", "Flexible schedule"].map(
                (tag) => (
                  <View key={tag} style={styles.challengeTag}>
                    <Text style={styles.challengeTagText}>{tag}</Text>
                  </View>
                ),
              )}
            </View>
          </View>
        </Pressable>

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={styles.stepList}>
            {[
              "Choose your session duration and stake",
              "Your stake is locked until completion",
              "Focus and avoid distracting apps",
              "Complete to earn your payout",
              "Quit early and lose your stake",
            ].map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
