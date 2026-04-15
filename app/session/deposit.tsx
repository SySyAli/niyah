import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { getAuth } from "@react-native-firebase/auth";
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
import { useRouter } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { useScreenProtection } from "../../src/hooks/useScreenProtection";
import * as Haptics from "expo-haptics";
import {
  Button,
  NumPad,
  AmountDisplay,
  SessionScreenScaffold,
  withErrorBoundary,
} from "../../src/components";
import { useWalletStore } from "../../src/store/walletStore";
import { formatMoney } from "../../src/utils/format";
import {
  createPaymentIntent,
  verifyAndCreditDeposit,
} from "../../src/config/functions";
import { DEMO_MODE } from "../../src/constants/config";
import { logger } from "../../src/utils/logger";
import {
  getErrorMessage,
  getFunctionErrorMessage,
  isUserCancellationError,
} from "../../src/utils/errors";

// Lazily require Stripe — crashes on dev builds without the native StripeSdk module.
// In DEMO_MODE the Stripe path is never reached so a no-op stub is fine.
type UseStripe = typeof import("@stripe/stripe-react-native").useStripe;
type StripeHook = ReturnType<UseStripe>;

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const STRIPE_UNAVAILABLE_MESSAGE =
  "Payments are unavailable in this build right now. Please reinstall the latest app build and try again.";

const _demoStripeHook: StripeHook = {
  initPaymentSheet: async () => ({ error: undefined }),
  presentPaymentSheet: async () => ({ error: undefined }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const _unavailableStripeHook: StripeHook = {
  initPaymentSheet: async () => ({
    error: { code: "Failed", message: STRIPE_UNAVAILABLE_MESSAGE },
  }),
  presentPaymentSheet: async () => ({
    error: { code: "Failed", message: STRIPE_UNAVAILABLE_MESSAGE },
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

let stripeHook: UseStripe | null = null;

if (!DEMO_MODE && STRIPE_PK) {
  try {
    stripeHook = (
      require("@stripe/stripe-react-native") as typeof import("@stripe/stripe-react-native")
    ).useStripe;
  } catch (error) {
    logger.warn("Stripe SDK unavailable in deposit screen:", error);
  }
}

const useStripe: UseStripe = DEMO_MODE
  ? () => _demoStripeHook
  : (stripeHook ?? (() => _unavailableStripeHook));

const isStripePaymentsAvailable = DEMO_MODE || (!!STRIPE_PK && !!stripeHook);

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000]; // in cents

interface QuickAmountButtonProps {
  amount: number;
  onPress: (amount: number) => void;
  isSelected: boolean;
}

const getDepositErrorMessage = (error: unknown): string => {
  const message = getFunctionErrorMessage(
    error,
    "Something went wrong. Please try again.",
  );

  if (/unauthorized/i.test(message)) {
    return "Your session expired. Please sign in again before adding funds.";
  }

  if (/too many requests/i.test(message)) {
    return "You're trying a little too quickly. Please wait a moment and try again.";
  }

  if (/function endpoint is not publicly accessible/i.test(message)) {
    return "Payments aren't enabled on this backend yet. Redeploy the Cloud Functions with public HTTP access, then try again.";
  }

  if (/network request failed/i.test(message)) {
    return "We couldn't reach the payment service. Check your connection and try again.";
  }

  if (
    /failed to create payment intent|failed to verify deposit|payment setup is incomplete/i.test(
      message,
    )
  ) {
    return "We couldn't start your deposit right now. Please try again.";
  }

  return message;
};

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

function DepositScreenInner() {
  useScreenProtection("deposit");
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  // Defensive: useStripe() can return null/undefined on the very first call
  // before the StripeSdk native bridge finishes warming up. Destructuring
  // directly would crash the screen on first cold mount.
  const stripeApi = useStripe() as StripeHook | null | undefined;
  const initPaymentSheet =
    stripeApi?.initPaymentSheet ?? _unavailableStripeHook.initPaymentSheet;
  const presentPaymentSheet =
    stripeApi?.presentPaymentSheet ??
    _unavailableStripeHook.presentPaymentSheet;
  const { deposit, balance } = useWalletStore();
  const [inputValue, setInputValue] = useState("");
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  // Store paymentIntentId for retry if verify fails after payment succeeds
  const [pendingVerifyId, setPendingVerifyId] = useState<string | null>(null);
  const [pendingVerifyAmount, setPendingVerifyAmount] = useState<number>(0);

  // Guard against setState after unmount + double router.back() crashes when
  // Stripe sheet dismisses mid-navigation ("every other time" black screen).
  const isMountedRef = useRef(true);
  const hasNavigatedBackRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    hasNavigatedBackRef.current = false;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeBack = useCallback(() => {
    if (hasNavigatedBackRef.current) return;
    hasNavigatedBackRef.current = true;
    try {
      router.back();
    } catch (err) {
      logger.warn("router.back failed:", err);
    }
  }, [router]);

  const paymentsUnavailable = !DEMO_MODE && !isStripePaymentsAvailable;

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
      `Add ${formatMoney(finalAmount)} to your Niyah balance?\n\nDemo mode — no real money charged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            deposit(finalAmount);
            safeBack();
          },
        },
      ],
    );
  };

  const handleStripeDeposit = async () => {
    const finalAmount = selectedQuickAmount ?? amountInCents;
    if (finalAmount < 100 || isLoading) return;

    if (!isStripePaymentsAvailable) {
      Alert.alert("Payments Unavailable", STRIPE_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!getAuth().currentUser) {
      Alert.alert(
        "Please Sign In Again",
        "Your session expired. Sign in again before adding funds.",
      );
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { clientSecret, paymentIntentId } =
        await createPaymentIntent(finalAmount);

      if (!clientSecret || !paymentIntentId) {
        throw new Error("Payment setup is incomplete. Please try again.");
      }

      // Save for potential retry if verify fails after payment succeeds
      setPendingVerifyId(paymentIntentId);
      setPendingVerifyAmount(finalAmount);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Niyah",
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {},
        returnURL: "niyah://stripe-redirect",
        applePay: { merchantCountryCode: "US" },
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
        Alert.alert(
          "Payment Error",
          getErrorMessage(initError, "We couldn't open payments right now."),
        );
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (!isUserCancellationError(presentError)) {
          Alert.alert(
            "Payment Failed",
            getErrorMessage(
              presentError,
              "We couldn't complete your payment. Please try again.",
            ),
          );
        }
        return;
      }

      const result = await verifyAndCreditDeposit(paymentIntentId);
      setPendingVerifyId(null);

      if ("processing" in result) {
        // ACH bank debit — webhook will credit balance when cleared
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Bank Transfer Initiated",
          `Your $${(finalAmount / 100).toFixed(2)} bank transfer is being processed.\n\nFunds will appear in your Niyah balance in ${result.estimatedArrival}. You'll be able to stake once the transfer clears.`,
          [{ text: "Got it", onPress: safeBack }],
        );
      } else {
        deposit(finalAmount, result.newBalance);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Funds Added",
          `${formatMoney(finalAmount)} added to your Niyah balance.`,
          [{ text: "Done", onPress: safeBack }],
        );
      }
    } catch (err) {
      logger.error("Deposit error:", err);
      // If payment sheet succeeded but verify failed, save for retry
      if (pendingVerifyId) {
        Alert.alert(
          "Verification Failed",
          "Your payment went through but we couldn't verify it. Tap Retry to try again — you won't be charged twice.",
          [
            { text: "Retry", onPress: () => handleRetryVerify() },
            { text: "Cancel", style: "cancel" },
          ],
        );
      } else {
        Alert.alert("Deposit Failed", getDepositErrorMessage(err));
      }
      // Resync wallet from Firestore in case server credited but client missed it
      const uid = getAuth().currentUser?.uid;
      if (uid) {
        useWalletStore
          .getState()
          .hydrate(uid)
          .catch(() => {});
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleRetryVerify = async () => {
    if (!pendingVerifyId) return;
    setIsLoading(true);
    try {
      const result = await verifyAndCreditDeposit(pendingVerifyId);
      setPendingVerifyId(null);

      if ("processing" in result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Bank Transfer Initiated",
          `Your bank transfer is being processed. Funds will appear soon.`,
          [{ text: "Got it", onPress: safeBack }],
        );
      } else {
        deposit(pendingVerifyAmount, result.newBalance);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Funds Added",
          `${formatMoney(pendingVerifyAmount)} added to your Niyah balance.`,
          [{ text: "Done", onPress: safeBack }],
        );
      }
    } catch (err) {
      logger.error("Retry verify error:", err);
      Alert.alert(
        "Still Failed",
        "We couldn't verify your payment. Your balance will update automatically once the payment clears. Contact support if it doesn't appear within a few minutes.",
      );
      const uid = getAuth().currentUser?.uid;
      if (uid) {
        useWalletStore
          .getState()
          .hydrate(uid)
          .catch(() => {});
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const handleDeposit = DEMO_MODE ? handleDemoDeposit : handleStripeDeposit;

  return (
    <SessionScreenScaffold
      headerVariant="centered"
      headerTitle="Add Funds"
      scrollable={false}
    >
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
              paymentsUnavailable
                ? "Payments unavailable"
                : isValidAmount
                  ? `Add ${formatMoney(selectedQuickAmount ?? amountInCents)}`
                  : "Enter an amount"
            }
            onPress={handleDeposit}
            disabled={!isValidAmount || isLoading || paymentsUnavailable}
            size="large"
          />
        )}
        {(DEMO_MODE || paymentsUnavailable) && (
          <Text style={styles.disclaimer}>
            {DEMO_MODE
              ? "Demo mode - no real money"
              : "Payments unavailable in this build"}
          </Text>
        )}
      </View>
    </SessionScreenScaffold>
  );
}

const DepositScreen = withErrorBoundary(DepositScreenInner, "deposit");
export default DepositScreen;

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
