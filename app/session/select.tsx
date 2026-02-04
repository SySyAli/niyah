import React, { useState, useRef } from "react";
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
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Card, Button } from "../../src/components";
import { useWalletStore } from "../../src/store/walletStore";
import { useAuthStore } from "../../src/store/authStore";
import { CADENCES, CadenceId, DEMO_MODE } from "../../src/constants/config";
import { formatMoney, getStreakMultiplier } from "../../src/utils/format";

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

  return (
    <Pressable
      onPress={canAfford ? onSelect : undefined}
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
              <Text style={styles.priceLabel}>Stake</Text>
              <Text style={styles.stakeAmount}>
                {formatMoney(config.stake)}
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <View style={styles.arrowLine} />
            </View>
            <View style={[styles.priceColumn, styles.priceColumnRight]}>
              <Text style={styles.priceLabel}>Earn</Text>
              <Text style={styles.earnAmount}>
                {formatMoney(config.basePayout)}
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
  const router = useRouter();
  const params = useLocalSearchParams();
  const balance = useWalletStore((state) => state.balance);
  const user = useAuthStore((state) => state.user);

  const [selectedCadence, setSelectedCadence] = useState<CadenceId>(
    (params.cadence as CadenceId) || "daily",
  );

  const config = CADENCES[selectedCadence];
  const canAfford = balance >= config.stake;
  const streakMultiplier = getStreakMultiplier(
    user?.currentStreak || 0,
    selectedCadence,
  );
  const actualPayout = Math.round(config.basePayout * streakMultiplier);

  const handleContinue = () => {
    if (canAfford) {
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
          <Text style={styles.summaryTitle}>Session Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Your stake</Text>
            <Text style={styles.summaryValue}>{formatMoney(config.stake)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base payout</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(config.basePayout)}
            </Text>
          </View>
          {streakMultiplier > 1 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Streak bonus ({user?.currentStreak}d)
              </Text>
              <Text style={[styles.summaryValue, styles.bonusValue]}>
                x{streakMultiplier.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>You will earn</Text>
            <Text style={styles.totalValue}>{formatMoney(actualPayout)}</Text>
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
    fontWeight: "500",
  },
  title: {
    fontSize: Typography.headlineMedium,
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "600",
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
    fontWeight: "700",
    color: Colors.text,
  },
  earnAmount: {
    fontSize: Typography.titleLarge,
    fontWeight: "700",
    color: Colors.gain,
  },
  arrowContainer: {
    paddingHorizontal: Spacing.lg,
  },
  arrowLine: {
    width: 50,
    height: 2,
    backgroundColor: Colors.border,
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
    fontWeight: "600",
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
    fontWeight: "500",
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
  totalLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.text,
  },
  totalValue: {
    fontSize: Typography.titleMedium,
    fontWeight: "700",
    color: Colors.gain,
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
