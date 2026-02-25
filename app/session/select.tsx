import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Card, Button } from "../../src/components";
import * as Haptics from "expo-haptics";
import { useWalletStore } from "../../src/store/walletStore";
import { CADENCES, CadenceId, DEMO_MODE } from "../../src/constants/config";
import { formatMoney } from "../../src/utils/format";

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
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
    ...Font.medium,
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
  options: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  balanceText: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: Typography.bodySmall,
  },
});

interface CadenceOptionProps {
  cadenceKey: CadenceId;
  config: (typeof CADENCES)[CadenceId];
  isSelected: boolean;
  canAfford: boolean;
  onSelect: () => void;
}

const CadenceOption: React.FC<CadenceOptionProps> = ({
  cadenceKey,
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
            {DEMO_MODE
              ? `${config.demoDuration / 1000}s demo session`
              : cadenceKey === "daily"
                ? "24 hours"
                : cadenceKey === "weekly"
                  ? "7 days"
                  : "30 days"}
          </Text>
          <View style={styles.optionPricing}>
            <View style={styles.priceColumn}>
              <Text style={styles.priceLabel}>Your Stake</Text>
              <Text style={styles.stakeAmount}>
                {formatMoney(config.stake)}
              </Text>
            </View>
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>vs</Text>
            </View>
            <View style={[styles.priceColumn, styles.priceColumnRight]}>
              <Text style={styles.priceLabel}>Partner's Stake</Text>
              <Text style={styles.stakeAmount}>
                {formatMoney(config.stake)}
              </Text>
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
  const [selectedCadence, setSelectedCadence] = useState<CadenceId>(
    (params.cadence as CadenceId) || "daily",
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={styles.backText}>Cancel</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Choose Your Session</Text>
        <Text style={styles.subtitle}>Higher stakes, higher rewards</Text>

        {/* Options */}
        <View style={styles.options}>
          {(Object.keys(CADENCES) as CadenceId[]).map((key) => (
            <CadenceOption
              key={key}
              cadenceKey={key}
              config={CADENCES[key]}
              isSelected={selectedCadence === key}
              canAfford={balance >= CADENCES[key].stake}
              onSelect={() => setSelectedCadence(key)}
            />
          ))}
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Duo Session Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Your stake</Text>
            <Text style={styles.summaryValue}>{formatMoney(config.stake)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Partner's stake</Text>
            <Text style={styles.summaryValue}>{formatMoney(config.stake)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.outcomeSection}>
            <Text style={styles.outcomeTitle}>Possible Outcomes</Text>
            <View style={styles.outcomeRow}>
              <Text style={styles.outcomeLabel}>Both complete:</Text>
              <Text style={styles.outcomeValue}>Both keep stakes</Text>
            </View>
            <View style={styles.outcomeRow}>
              <Text style={styles.outcomeLabel}>You win:</Text>
              <Text style={[styles.outcomeValue, { color: Colors.gain }]}>
                Partner pays you {formatMoney(config.stake)}
              </Text>
            </View>
            <View style={styles.outcomeRow}>
              <Text style={styles.outcomeLabel}>You lose:</Text>
              <Text style={[styles.outcomeValue, { color: Colors.loss }]}>
                You pay partner {formatMoney(config.stake)}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.balanceText}>
          Available: {formatMoney(balance)}
        </Text>
        <Button
          title={canAfford ? "Continue" : "Insufficient Balance"}
          onPress={handleContinue}
          disabled={!canAfford}
          size="large"
        />
      </View>
    </SafeAreaView>
  );
}
