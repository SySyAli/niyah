import React, { useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Card, Button, SessionScreenScaffold } from "../../src/components";
import * as Haptics from "expo-haptics";
import { useWalletStore } from "../../src/store/walletStore";
import {
  CADENCES,
  SHORT_CADENCES,
  LONG_CADENCES,
  USE_SHORT_TIMERS,
} from "../../src/constants/config";
import type { CadenceType } from "../../src/types";
import { formatMoney, formatDuration } from "../../src/utils/format";

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.textSecondary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    options: {
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    optionCard: {
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 2,
      borderColor: "transparent",
    },
    optionSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    optionDisabled: {
      opacity: 0.5,
    },
    optionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.xs,
    },
    optionName: {
      fontSize: Typography.titleMedium,
      ...Font.bold,
      color: Colors.text,
    },
    checkmark: {
      backgroundColor: Colors.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.xs,
    },
    checkmarkText: {
      fontSize: Typography.labelSmall,
      ...Font.semibold,
      color: Colors.background,
    },
    optionDuration: {
      fontSize: Typography.labelSmall,
      color: Colors.textTertiary,
      marginBottom: Spacing.md,
    },
    optionPricing: {
      flexDirection: "row",
      alignItems: "center",
    },
    priceColumn: {
      flex: 1,
    },
    priceColumnRight: {
      alignItems: "flex-end",
    },
    priceLabel: {
      fontSize: Typography.labelSmall,
      color: Colors.textTertiary,
      marginBottom: Spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    stakeAmount: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.text,
    },
    earnAmount: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.gain,
    },
    vsContainer: {
      paddingHorizontal: Spacing.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    vsText: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.textMuted,
    },
    insufficientText: {
      color: Colors.loss,
      fontSize: Typography.labelSmall,
      marginTop: Spacing.sm,
      textAlign: "center",
    },
    summaryCard: {
      padding: Spacing.lg,
    },
    summaryTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.md,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Spacing.sm,
    },
    summaryLabel: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
    },
    summaryValue: {
      fontSize: Typography.bodySmall,
      ...Font.medium,
      color: Colors.text,
    },
    bonusValue: {
      color: Colors.primary,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
      marginVertical: Spacing.md,
    },
    outcomeSection: {
      marginTop: Spacing.sm,
    },
    outcomeTitle: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.sm,
    },
    outcomeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Spacing.xs,
    },
    outcomeLabel: {
      fontSize: Typography.labelSmall,
      color: Colors.textSecondary,
    },
    outcomeValue: {
      fontSize: Typography.labelSmall,
      ...Font.medium,
      color: Colors.text,
    },
    balanceText: {
      textAlign: "center",
      color: Colors.textSecondary,
      fontSize: Typography.bodySmall,
    },
  });

interface CadenceOptionProps {
  config: (typeof CADENCES)[CadenceType];
  isSelected: boolean;
  canAfford: boolean;
  onSelect: () => void;
}

const CadenceOption: React.FC<CadenceOptionProps> = ({
  config,
  isSelected,
  canAfford,
  onSelect,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  return (
    <Pressable
      onPress={canAfford ? handleSelect : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View
          style={[
            styles.optionCard,
            isSelected && styles.optionSelected,
            !canAfford && styles.optionDisabled,
          ]}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionName}>{config.name}</Text>
            {isSelected && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>Selected</Text>
              </View>
            )}
          </View>
          <Text style={styles.optionDuration}>
            {USE_SHORT_TIMERS
              ? `${config.demoDuration / 1000}s demo session`
              : formatDuration(config.duration)}
          </Text>
          <View style={styles.optionPricing}>
            <View style={styles.priceColumn}>
              <Text style={styles.priceLabel}>Stake</Text>
              <Text style={styles.stakeAmount}>
                {formatMoney(config.stake)}
              </Text>
            </View>
            <View style={[styles.priceColumn, styles.priceColumnRight]}>
              <Text style={styles.priceLabel}>On Complete</Text>
              <Text style={[styles.earnAmount]}>Keep it</Text>
            </View>
          </View>
          {!canAfford && (
            <Text style={styles.insufficientText}>Insufficient balance</Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

export default function SelectCadenceScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const balance = useWalletStore((state) => state.balance);
  const [selectedCadence, setSelectedCadence] = useState<CadenceType>(
    (params.cadence as CadenceType) || "focus",
  );

  const config = CADENCES[selectedCadence];
  const canAfford = balance >= config.stake;

  const handleContinue = () => {
    if (canAfford) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/session/confirm?cadence=${selectedCadence}`);
    }
  };

  return (
    <SessionScreenScaffold
      headerVariant="back"
      backLabel="Cancel"
      title="Choose Your Session"
      subtitle="Higher stakes, higher rewards"
      centerTitle={false}
      footer={
        <>
          <Text style={styles.balanceText}>
            Available: {formatMoney(balance)}
          </Text>
          <Button
            title={canAfford ? "Continue" : "Insufficient Balance"}
            onPress={handleContinue}
            disabled={!canAfford}
            size="large"
          />
        </>
      }
    >
      {/* Quick Sessions */}
      <Text style={styles.sectionTitle}>Quick Sessions</Text>
      <View style={styles.options}>
        {(SHORT_CADENCES as CadenceType[]).map((key) => (
          <CadenceOption
            key={key}
            config={CADENCES[key]}
            isSelected={selectedCadence === key}
            canAfford={balance >= CADENCES[key].stake}
            onSelect={() => setSelectedCadence(key)}
          />
        ))}
      </View>

      {/* Endurance Sessions */}
      <Text style={styles.sectionTitle}>Endurance Sessions</Text>
      <View style={styles.options}>
        {(LONG_CADENCES as CadenceType[]).map((key) => (
          <CadenceOption
            key={key}
            config={CADENCES[key]}
            isSelected={selectedCadence === key}
            canAfford={balance >= CADENCES[key].stake}
            onSelect={() => setSelectedCadence(key)}
          />
        ))}
      </View>

      {/* Summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Session Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Stake</Text>
          <Text style={styles.summaryValue}>{formatMoney(config.stake)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.outcomeSection}>
          <Text style={styles.outcomeTitle}>Outcomes</Text>
          <View style={styles.outcomeRow}>
            <Text style={styles.outcomeLabel}>Complete:</Text>
            <Text style={[styles.outcomeValue, { color: Colors.gain }]}>
              Keep your {formatMoney(config.stake)} stake
            </Text>
          </View>
          <View style={styles.outcomeRow}>
            <Text style={styles.outcomeLabel}>Surrender:</Text>
            <Text style={[styles.outcomeValue, { color: Colors.loss }]}>
              Lose your {formatMoney(config.stake)} stake
            </Text>
          </View>
        </View>
      </Card>
    </SessionScreenScaffold>
  );
}
