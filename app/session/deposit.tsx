import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Button, NumPad, AmountDisplay } from "../../src/components";
import { useWalletStore } from "../../src/store/walletStore";
import { formatMoney } from "../../src/utils/format";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000]; // in cents

interface QuickAmountButtonProps {
  amount: number;
  onPress: (amount: number) => void;
  isSelected: boolean;
}

const QuickAmountButton: React.FC<QuickAmountButtonProps> = ({
  amount,
  onPress,
  isSelected,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={() => onPress(amount)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.quickAmount,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.quickAmountSelected,
        ]}
      >
        <Text
          style={[
            styles.quickAmountText,
            isSelected && styles.quickAmountTextSelected,
          ]}
        >
          {formatMoney(amount, false)}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

export default function DepositScreen() {
  const router = useRouter();
  const { deposit, balance } = useWalletStore();
  const [inputValue, setInputValue] = useState("");
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(
    null,
  );

  // Convert input string to cents
  const amountInCents = inputValue
    ? Math.round(parseFloat(inputValue) * 100)
    : 0;
  const displayAmount = inputValue ? `$${inputValue}` : "";
  const isValidAmount = amountInCents >= 100; // Minimum $1

  const handleKeyPress = useCallback(
    (key: string) => {
      setSelectedQuickAmount(null);

      if (key === ".") {
        if (inputValue.includes(".")) return;
        if (!inputValue) {
          setInputValue("0.");
          return;
        }
      }

      // Limit to 2 decimal places
      if (inputValue.includes(".")) {
        const [, decimals] = inputValue.split(".");
        if (decimals && decimals.length >= 2) return;
      }

      // Limit total length
      if (inputValue.replace(".", "").length >= 6) return;

      setInputValue((prev) => prev + key);
    },
    [inputValue],
  );

  const handleBackspace = useCallback(() => {
    setSelectedQuickAmount(null);
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const handleQuickAmount = useCallback((amount: number) => {
    setSelectedQuickAmount(amount);
    setInputValue((amount / 100).toString());
  }, []);

  const handleDeposit = () => {
    const finalAmount = selectedQuickAmount || amountInCents;

    Alert.alert(
      "Add Funds",
      `Add ${formatMoney(finalAmount)} to your NIYAH balance?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            deposit(finalAmount);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeButton}
            hitSlop={20}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Add Funds</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Balance Info */}
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>{formatMoney(balance)}</Text>
        </View>

        {/* Amount Display */}
        <AmountDisplay
          amount={displayAmount}
          label="Enter amount"
          placeholder="$0"
        />

        {/* Quick Amounts */}
        <View style={styles.quickAmountsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAmounts}
          >
            {QUICK_AMOUNTS.map((amount) => (
              <QuickAmountButton
                key={amount}
                amount={amount}
                onPress={handleQuickAmount}
                isSelected={selectedQuickAmount === amount}
              />
            ))}
          </ScrollView>
        </View>

        {/* NumPad */}
        <View style={styles.numPadContainer}>
          <NumPad
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            showDecimal={true}
          />
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <Button
            title={
              isValidAmount
                ? `Add ${formatMoney(selectedQuickAmount || amountInCents)}`
                : "Enter an amount"
            }
            onPress={handleDeposit}
            disabled={!isValidAmount}
            size="large"
          />
          <Text style={styles.disclaimer}>
            Demo mode - funds added instantly
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 60,
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: Typography.bodyLarge,
    fontWeight: "500",
  },
  title: {
    fontSize: Typography.titleLarge,
    fontWeight: "600",
    color: Colors.text,
  },
  balanceInfo: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  balanceLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontSize: Typography.titleMedium,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  quickAmountsContainer: {
    marginBottom: Spacing.lg,
  },
  quickAmounts: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  quickAmount: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAmountSelected: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  quickAmountText: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.text,
  },
  quickAmountTextSelected: {
    color: Colors.primary,
  },
  numPadContainer: {
    flex: 1,
    justifyContent: "center",
  },
  footer: {
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  disclaimer: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: Typography.labelSmall,
  },
});
