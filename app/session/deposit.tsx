import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import * as Haptics from "expo-haptics";
import { Button, NumPad, AmountDisplay } from "../../src/components";
import { useWalletStore } from "../../src/store/walletStore";
import { formatMoney } from "../../src/utils/format";
import {
  createPaymentIntent,
  verifyAndCreditDeposit,
} from "../../src/config/functions";
import { DEMO_MODE } from "../../src/constants/config";

// Lazily require Stripe — crashes on dev builds without the native StripeSdk module.
// In DEMO_MODE the Stripe path is never reached so a no-op stub is fine.
type UseStripe = typeof import("@stripe/stripe-react-native").useStripe;
const _demoStripeHook: ReturnType<UseStripe> = {
  initPaymentSheet: async () => ({ error: undefined }),
  presentPaymentSheet: async () => ({ error: undefined }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;
const useStripe: UseStripe = DEMO_MODE
  ? () => _demoStripeHook
  : (
      require("@stripe/stripe-react-native") as typeof import("@stripe/stripe-react-native")
    ).useStripe;

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
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
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

  const handleQuickPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(amount);
  };

  return (
    <Pressable
      onPress={handleQuickPress}
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
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { deposit, balance } = useWalletStore();
  const [inputValue, setInputValue] = useState("");
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

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

      if (inputValue.includes(".")) {
        const [, decimals] = inputValue.split(".");
        if (decimals && decimals.length >= 2) return;
      }

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

  const handleDemoDeposit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finalAmount = selectedQuickAmount ?? amountInCents;

    Alert.alert(
      "Add Funds",
      `Add ${formatMoney(finalAmount)} to your NIYAH balance?\n\nDemo mode — no real money charged.`,
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

  const handleStripeDeposit = async () => {
    const finalAmount = selectedQuickAmount ?? amountInCents;
    if (finalAmount < 100) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { clientSecret, paymentIntentId, customerId } =
        await createPaymentIntent(finalAmount);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "NIYAH",
        paymentIntentClientSecret: clientSecret,
        customerId,
        defaultBillingDetails: {},
        // true = show ACH/bank debit in PaymentSheet (delayed, but much lower fee)
        allowsDelayedPaymentMethods: true,
        appearance: {
          colors: {
            primary: "#E07A5F",
            background: "#1A1714",
            componentBackground: "#2A2420",
            componentBorder: "#3A3430",
            componentDivider: "#3A3430",
            primaryText: "#F5EFE6",
            secondaryText: "#A89E94",
            componentText: "#F5EFE6",
            placeholderText: "#6B6056",
            icon: "#A89E94",
            error: "#E07A5F",
          },
          shapes: {
            borderRadius: 12,
          },
        },
      });

      if (initError) {
        Alert.alert("Payment Error", initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Payment Failed", presentError.message);
        }
        return;
      }

      const result = await verifyAndCreditDeposit(paymentIntentId);

      if ("processing" in result) {
        // ACH bank debit — webhook will credit balance when cleared
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Bank Transfer Initiated",
          `Your $${(finalAmount / 100).toFixed(2)} bank transfer is being processed.\n\nFunds will appear in your NIYAH balance in ${result.estimatedArrival}. You'll be able to stake once the transfer clears.`,
          [{ text: "Got it", onPress: () => router.back() }],
        );
      } else {
        deposit(finalAmount, result.newBalance);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Funds Added",
          `${formatMoney(finalAmount)} added to your NIYAH balance.`,
          [{ text: "Done", onPress: () => router.back() }],
        );
      }
    } catch (err) {
      console.error("Deposit error:", err);
      Alert.alert("Deposit Failed", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = DEMO_MODE ? handleDemoDeposit : handleStripeDeposit;

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
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Processing payment...</Text>
            </View>
          ) : (
            <Button
              title={
                isValidAmount
                  ? `Add ${formatMoney(selectedQuickAmount ?? amountInCents)}`
                  : "Enter an amount"
              }
              onPress={handleDeposit}
              disabled={!isValidAmount || isLoading}
              size="large"
            />
          )}
          {DEMO_MODE && (
            <Text style={styles.disclaimer}>Demo mode — no real money</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
      ...Font.medium,
    },
    title: {
      fontSize: Typography.titleLarge,
      ...Font.semibold,
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
      ...Font.semibold,
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
      ...Font.semibold,
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
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
    },
    loadingText: {
      color: Colors.textSecondary,
      fontSize: Typography.bodyMedium,
      ...Font.medium,
    },
    disclaimer: {
      textAlign: "center",
      color: Colors.textMuted,
      fontSize: Typography.labelSmall,
    },
  });
