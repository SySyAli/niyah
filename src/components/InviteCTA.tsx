import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../constants/colors";
import { useColors } from "../hooks/useColors";

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    inviteCard: {
      backgroundColor: Colors.primaryMuted,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    inviteCardContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    inviteCardTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
    },
    inviteCardSubtitle: {
      fontSize: Typography.labelSmall,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    inviteBadge: {
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
      paddingVertical: 4,
      paddingHorizontal: Spacing.md,
    },
    inviteBadgeText: {
      fontSize: Typography.labelLarge,
      ...Font.bold,
      color: Colors.white,
    },
  });

interface InviteCTAProps {
  style?: object;
}

export const InviteCTA: React.FC<InviteCTAProps> = ({ style }) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/invite" as never);
      }}
      style={[styles.inviteCard, style]}
    >
      <View style={styles.inviteCardContent}>
        <View>
          <Text style={styles.inviteCardTitle}>Invite Friends</Text>
          <Text style={styles.inviteCardSubtitle}>
            Earn +10 social credit per referral
          </Text>
        </View>
        <View style={styles.inviteBadge}>
          <Text style={styles.inviteBadgeText}>+10</Text>
        </View>
      </View>
    </Pressable>
  );
};
