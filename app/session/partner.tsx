import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  FontWeight,
} from "../../src/constants/colors";
import { Card, Button } from "../../src/components";
import { usePartnerStore } from "../../src/store/partnerStore";
import { REPUTATION_LEVELS } from "../../src/constants/config";
import { Partner } from "../../src/types";

export default function PartnerSelectionScreen() {
  const router = useRouter();
  const { partners, currentPartner, selectPartner, sendInvite } =
    usePartnerStore();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  const handleSelectPartner = (oderId: string) => {
    selectPartner(oderId);
    router.back();
  };

  const handleSendInvite = () => {
    if (inviteEmail && inviteName) {
      sendInvite(inviteEmail, inviteName);
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
    }
  };

  const getReputationLabel = (level: string) => {
    const levelInfo =
      REPUTATION_LEVELS[level as keyof typeof REPUTATION_LEVELS];
    return levelInfo?.label || level;
  };

  const getReputationColor = (score: number) => {
    if (score >= 80) return Colors.gain;
    if (score >= 60) return Colors.primary;
    if (score >= 40) return Colors.warning;
    return Colors.loss;
  };

  const renderPartnerCard = (partner: Partner) => {
    const isSelected = currentPartner?.oderId === partner.oderId;

    return (
      <Pressable
        key={partner.id}
        onPress={() => handleSelectPartner(partner.oderId)}
      >
        <Card
          style={[styles.partnerCard, isSelected && styles.partnerCardSelected]}
        >
          <View style={styles.partnerRow}>
            <View style={styles.partnerAvatar}>
              <Text style={styles.partnerInitial}>
                {partner.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <View style={styles.partnerMeta}>
                <View
                  style={[
                    styles.reputationDot,
                    {
                      backgroundColor: getReputationColor(
                        partner.reputation.score,
                      ),
                    },
                  ]}
                />
                <Text style={styles.reputationText}>
                  {getReputationLabel(partner.reputation.level)} (
                  {partner.reputation.score})
                </Text>
              </View>
              <Text style={styles.sessionsText}>
                {partner.totalSessionsTogether} sessions together
              </Text>
            </View>
            {isSelected && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>Selected</Text>
              </View>
            )}
          </View>
          {partner.venmoHandle && (
            <View style={styles.venmoRow}>
              <Text style={styles.venmoLabel}>Venmo:</Text>
              <Text style={styles.venmoHandle}>{partner.venmoHandle}</Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
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
          <Text style={styles.title}>Choose Your Partner</Text>
          <Text style={styles.subtitle}>
            Select an accountability partner for this session
          </Text>
        </View>

        {/* Partner List */}
        {partners.length > 0 ? (
          <View style={styles.partnerList}>
            {partners.map(renderPartnerCard)}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Partners Yet</Text>
            <Text style={styles.emptyText}>
              Invite a friend to be your accountability partner. You'll both
              stake money and keep each other focused.
            </Text>
          </Card>
        )}

        {/* Invite Section */}
        {showInvite ? (
          <Card style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>Invite a Partner</Text>
            <TextInput
              style={styles.input}
              placeholder="Friend's name"
              placeholderTextColor={Colors.textMuted}
              value={inviteName}
              onChangeText={setInviteName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Friend's email"
              placeholderTextColor={Colors.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.inviteButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowInvite(false)}
              />
              <Button
                title="Send Invite"
                onPress={handleSendInvite}
                disabled={!inviteEmail || !inviteName}
              />
            </View>
          </Card>
        ) : (
          <Pressable
            style={styles.addButton}
            onPress={() => setShowInvite(true)}
          >
            <Text style={styles.addButtonText}>+ Invite New Partner</Text>
          </Pressable>
        )}

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Reputation Scores</Text>
          <Text style={styles.infoText}>
            Reputation reflects payment reliability. Partners who always pay
            when they lose have high scores. Flaky payers get low scores and may
            be excluded from groups.
          </Text>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.gain }]}
            />
            <Text style={styles.legendText}>80+ Oak - Highly trusted</Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.primary }]}
            />
            <Text style={styles.legendText}>60+ Tree - Reliable</Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.warning }]}
            />
            <Text style={styles.legendText}>40+ Sapling - Building trust</Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.loss }]}
            />
            <Text style={styles.legendText}>Below 40 - Needs improvement</Text>
          </View>
        </Card>
      </ScrollView>
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
    fontWeight: FontWeight.medium,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.headlineMedium,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  partnerList: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  partnerCard: {
    marginBottom: 0,
  },
  partnerCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  partnerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  partnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  partnerInitial: {
    fontSize: Typography.titleLarge,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  partnerMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reputationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  reputationText: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
  },
  sessionsText: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
  },
  checkmark: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  checkmarkText: {
    fontSize: Typography.labelSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  venmoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  venmoLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    marginRight: Spacing.xs,
  },
  venmoHandle: {
    fontSize: Typography.labelSmall,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.titleMedium,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  addButtonText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  inviteCard: {
    marginBottom: Spacing.lg,
  },
  inviteTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.bodyMedium,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  inviteButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.backgroundCard,
  },
  infoTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  legendText: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
  },
});
