import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
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
import { useScreenProtection } from "../../src/hooks/useScreenProtection";
import * as Haptics from "expo-haptics";
import { Button, Card, NumPad, AmountDisplay } from "../../src/components";
import { useWalletStore } from "../../src/store/walletStore";
import { useAuthStore } from "../../src/store/authStore";
import { formatMoney } from "../../src/utils/format";
import { requestWithdrawal } from "../../src/config/functions";

type WithdrawMethod = "standard" | "instant";

// Stripe instant payout fee: 1.5%, minimum $0.50 (in cents)
function calcInstantFee(amountCents: number): number {
  return Math.max(50, Math.round(amountCents * 0.015));
}

export default function WithdrawScreen() {
  useScreenProtection("withdraw");
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { withdraw, balance } = useWalletStore();
  const { user } = useAuthStore();
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState<"amount" | "method">("amount");
  const [selectedMethod, setSelectedMethod] =
    useState<WithdrawMethod>("standard");
  const [isLoading, setIsLoading] = useState(false);

  const stripeStatus = user?.stripeAccountStatus ?? "none";
  const hasActiveStripe = stripeStatus === "active";

  const amountInCents = inputValue
    ? Math.round(parseFloat(inputValue) * 100)
    : 0;
  const displayAmount = inputValue ? `$${inputValue}` : "";
  const isValidAmount = amountInCents >= 1000 && amountInCents <= balance;
  const instantFee = calcInstantFee(amountInCents);

  const handleKeyPress = useCallback(
    (key: string) => {
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
      const newValue = inputValue + key;
      if (Math.round(parseFloat(newValue) * 100) > balance) return;
      setInputValue(newValue);
    },
    [inputValue, balance],
  );

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const handleMaxAmount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputValue((balance / 100).toFixed(2));
  };

  const handleContinue = () => {
    if (!isValidAmount) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("method");
  };

  const handleStripeWithdraw = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await requestWithdrawal(amountInCents, selectedMethod);
      withdraw(amountInCents);
      const methodLabel =
        selectedMethod === "instant"
          ? "within 30 minutes"
          : "in 1–2 business days";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Withdrawal Sent",
        `${formatMoney(amountInCents)} is on its way to your bank — arrives ${methodLabel}.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
      void result; // transferId/payoutId logged server-side
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      Alert.alert("Withdrawal Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  // Opens a Venmo REQUEST to @niyah-focus AFTER server-side validation.
  // Balance is deducted server-side via requestWithdrawal to prevent unlimited
  // withdrawal requests without balance impact.
  const handleVenmoWithdraw = async () => {
    setIsLoading(true);
    try {
      // Validate and deduct balance server-side first
      await requestWithdrawal(amountInCents, "standard");
      withdraw(amountInCents);

      // Only open Venmo after server confirms balance deduction
      const venmoUrl = `venmo://paycharge?txn=request&recipients=niyah-focus&amount=${encodeURIComponent((amountInCents / 100).toFixed(2))}&note=${encodeURIComponent("NIYAH withdrawal")}`;
      Linking.openURL(venmoUrl).catch(() =>
        Linking.openURL("https://venmo.com/niyah-focus"),
      );
      Alert.alert(
        "Withdrawal Requested",
        `We'll send you ${formatMoney(amountInCents)} via Venmo within 24 hours.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      Alert.alert("Withdrawal Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  const getAmountError = () => {
    if (!inputValue) return null;
    if (amountInCents < 1000) return "Minimum withdrawal is $10.00";
    if (amountInCents > balance) return "Exceeds available balance";
    return null;
  };
  const error = getAmountError();

  if (step === "method") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => setStep("amount")}
              style={styles.closeButton}
              hitSlop={20}
            >
              <Text style={styles.closeText}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Withdraw</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.detailsContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
              <Text style={styles.summaryAmount}>
                {formatMoney(amountInCents)}
              </Text>
            </View>

            {hasActiveStripe ? (
              <>
                <Text style={styles.sectionLabel}>
                  How would you like to receive it?
                </Text>

                {/* Standard method card */}
                <Pressable onPress={() => setSelectedMethod("standard")}>
                  <View
                    style={[
                      styles.methodCard,
                      selectedMethod === "standard" &&
                        styles.methodCardSelected,
                    ]}
                  >
                    <View style={styles.methodCardHeader}>
                      <View style={styles.methodInfo}>
                        <Text
                          style={[
                            styles.methodTitle,
                            selectedMethod === "standard" &&
                              styles.methodTitleSelected,
                          ]}
                        >
                          Standard
                        </Text>
                        <Text style={styles.methodSubtitle}>
                          1–2 business days
                        </Text>
                      </View>
                      <View style={styles.methodBadge}>
                        <Text style={styles.methodBadgeText}>Free</Text>
                      </View>
                    </View>
                    <Text style={styles.methodDescription}>
                      Transferred to your linked bank account via ACH. No fees.
                    </Text>
                  </View>
                </Pressable>

                {/* Instant method card */}
                <Pressable onPress={() => setSelectedMethod("instant")}>
                  <View
                    style={[
                      styles.methodCard,
                      selectedMethod === "instant" && styles.methodCardSelected,
                    ]}
                  >
                    <View style={styles.methodCardHeader}>
                      <View style={styles.methodInfo}>
                        <Text
                          style={[
                            styles.methodTitle,
                            selectedMethod === "instant" &&
                              styles.methodTitleSelected,
                          ]}
                        >
                          Instant
                        </Text>
                        <Text style={styles.methodSubtitle}>
                          Within 30 minutes
                        </Text>
                      </View>
                      <View
                        style={[styles.methodBadge, styles.methodBadgeAccent]}
                      >
                        <Text style={styles.methodBadgeTextAccent}>
                          {formatMoney(instantFee)} fee
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.methodDescription}>
                      Instant bank deposit. Stripe charges 1.5% (min $0.50) —
                      covered by NIYAH. You receive the full{" "}
                      {formatMoney(amountInCents)}.
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.footer}>
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.loadingText}>
                        Processing withdrawal...
                      </Text>
                    </View>
                  ) : (
                    <Button
                      title={`Withdraw ${formatMoney(amountInCents)} to Bank`}
                      onPress={handleStripeWithdraw}
                      size="large"
                    />
                  )}

                  <Pressable
                    onPress={handleVenmoWithdraw}
                    style={styles.venmoLink}
                  >
                    <Text style={styles.venmoLinkText}>
                      Send via Venmo instead
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              /* No active Stripe Connect account */
              <>
                <Card style={styles.setupCard} variant="outlined">
                  <Text style={styles.setupTitle}>
                    {stripeStatus === "pending"
                      ? "Verification In Progress"
                      : "Bank Payouts Not Set Up"}
                  </Text>
                  <Text style={styles.setupDescription}>
                    {stripeStatus === "pending"
                      ? "Your Stripe account is being verified. This usually takes a few minutes."
                      : "Connect your bank account to withdraw directly. Secure, free, and instant setup."}
                  </Text>
                  <Button
                    title={
                      stripeStatus === "pending"
                        ? "Check Status"
                        : "Set Up Bank Payouts"
                    }
                    onPress={() => router.push("/session/stripe-onboarding")}
                    size="large"
                    style={styles.setupButton}
                  />
                </Card>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Text style={styles.venmoSectionLabel}>Request via Venmo</Text>
                <Text style={styles.venmoSectionDescription}>
                  Opens Venmo to request {formatMoney(amountInCents)} from
                  @niyah-focus. We'll approve and send it within 24 hours.
                </Text>
                <Button
                  title="Open Venmo"
                  onPress={handleVenmoWithdraw}
                  size="large"
                  variant="secondary"
                />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeButton}
            hitSlop={20}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Withdraw</Text>
          <Pressable
            onPress={handleMaxAmount}
            style={styles.maxButton}
            hitSlop={10}
          >
            <Text style={styles.maxText}>Max</Text>
          </Pressable>
        </View>

        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatMoney(balance)}</Text>
        </View>

        <AmountDisplay
          amount={displayAmount}
          label="Enter amount"
          placeholder="$0"
        />
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.numPadContainer}>
          <NumPad
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            showDecimal={true}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title={isValidAmount ? "Continue" : "Enter amount (min $10)"}
            onPress={handleContinue}
            disabled={!isValidAmount}
            size="large"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flex: 1, paddingHorizontal: Spacing.lg },
    scrollContent: { flex: 1 },
    detailsContent: {
      paddingTop: Spacing.lg,
      gap: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: Spacing.md,
    },
    closeButton: { width: 60 },
    closeText: {
      color: Colors.textSecondary,
      fontSize: Typography.bodyLarge,
      ...Font.medium,
    },
    maxButton: { width: 60, alignItems: "flex-end" },
    maxText: {
      color: Colors.primary,
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
    },
    title: {
      fontSize: Typography.titleLarge,
      ...Font.semibold,
      color: Colors.text,
    },
    balanceInfo: { alignItems: "center", paddingVertical: Spacing.md },
    balanceLabel: {
      fontSize: Typography.labelMedium,
      color: Colors.textTertiary,
      marginBottom: Spacing.xs,
    },
    balanceAmount: {
      fontSize: Typography.titleMedium,
      ...Font.semibold,
      color: Colors.gain,
    },
    errorText: {
      textAlign: "center",
      color: Colors.danger,
      fontSize: Typography.bodySmall,
      marginTop: -Spacing.md,
      marginBottom: Spacing.sm,
    },
    numPadContainer: { flex: 1, justifyContent: "center" },
    footer: { paddingVertical: Spacing.lg, gap: Spacing.md },
    summaryCard: {
      alignItems: "center",
      paddingVertical: Spacing.xl,
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
    },
    summaryLabel: {
      fontSize: Typography.labelMedium,
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    summaryAmount: {
      fontSize: Typography.displaySmall,
      ...Font.bold,
      color: Colors.text,
    },
    sectionLabel: {
      fontSize: Typography.labelLarge,
      ...Font.semibold,
      color: Colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    methodCard: {
      padding: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: Colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: Colors.border,
      gap: Spacing.sm,
    },
    methodCardSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    methodCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    methodInfo: { gap: 2 },
    methodTitle: {
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
      color: Colors.text,
    },
    methodTitleSelected: { color: Colors.primary },
    methodSubtitle: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
    },
    methodBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs / 2,
      borderRadius: Radius.full,
      backgroundColor: Colors.gainLight,
    },
    methodBadgeText: {
      fontSize: Typography.labelSmall,
      ...Font.semibold,
      color: Colors.gain,
    },
    methodBadgeAccent: { backgroundColor: Colors.primaryMuted },
    methodBadgeTextAccent: {
      fontSize: Typography.labelSmall,
      ...Font.semibold,
      color: Colors.primary,
    },
    methodDescription: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      lineHeight: Typography.bodySmall * 1.5,
    },
    loadingRow: {
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
    venmoLink: { alignItems: "center", paddingVertical: Spacing.sm },
    venmoLinkText: {
      color: Colors.textSecondary,
      fontSize: Typography.bodyMedium,
      ...Font.medium,
    },
    setupCard: { gap: Spacing.md },
    setupTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
    },
    setupDescription: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      lineHeight: Typography.bodyMedium * 1.5,
    },
    setupButton: { marginTop: Spacing.sm },
    dividerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { color: Colors.textMuted, fontSize: Typography.labelMedium },
    venmoSectionLabel: {
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
      color: Colors.text,
    },
    venmoSectionDescription: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      lineHeight: Typography.bodyMedium * 1.5,
    },
  });
