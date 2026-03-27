import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
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
  Card,
  NumPad,
  AmountDisplay,
  SessionScreenScaffold,
} from "../../src/components";
import { useWalletStore } from "../../src/store/walletStore";
import { useAuthStore } from "../../src/store/authStore";
import { formatMoney } from "../../src/utils/format";
import {
  requestWithdrawal,
  createPlaidLinkToken,
  linkBankAccount,
} from "../../src/config/functions";
import {
  create as plaidCreate,
  open as plaidOpen,
  type LinkSuccess,
  type LinkExit,
} from "react-native-plaid-link-sdk";
import { logger } from "../../src/utils/logger";

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
  const [isLinkingBank, setIsLinkingBank] = useState(false);
  const { updateUser } = useAuthStore();

  const stripeStatus = user?.stripeAccountStatus ?? "none";
  const hasActiveStripe = stripeStatus === "active";
  const linkedBank = user?.linkedBank as
    | { institutionName: string; mask: string }
    | undefined;
  const hasBankLinked = hasActiveStripe && !!linkedBank;

  const amountInCents = inputValue
    ? Math.round(parseFloat(inputValue) * 100)
    : 0;
  const displayAmount = inputValue ? `$${inputValue}` : "";
  const isValidAmount =
    amountInCents >= 1000 &&
    amountInCents <= balance &&
    amountInCents <= 1_000_000;
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
      // Resync wallet from Firestore in case server processed but client errored
      const uid = user?.id;
      if (uid) {
        useWalletStore
          .getState()
          .hydrate(uid)
          .catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Opens Plaid Link as a native overlay — no navigation needed.
  const handleConnectBank = useCallback(async () => {
    setIsLinkingBank(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Get link token from server
      const { linkToken } = await createPlaidLinkToken();

      // 2. Create Plaid session + open native UI
      plaidCreate({ token: linkToken });
      plaidOpen({
        onSuccess: async (success: LinkSuccess) => {
          try {
            const publicToken = success.publicToken;
            const plaidAccountId = success.metadata.accounts[0]?.id;
            if (!publicToken || !plaidAccountId) {
              Alert.alert("Error", "No bank account was selected.");
              setIsLinkingBank(false);
              return;
            }

            // 3. Exchange token + link bank server-side
            const result = await linkBankAccount(publicToken, plaidAccountId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // 4. Update local state — screen re-renders with bank connected
            updateUser({
              stripeAccountStatus: "active",
              linkedBank: {
                institutionName: result.bankName,
                mask: result.bankMask,
                bankName: result.bankName,
              },
            });

            Alert.alert(
              "Bank Connected",
              `${result.bankName} ending in ${result.bankMask} is now linked. You can now withdraw to this account.`,
            );
          } catch (err) {
            logger.error("linkBankAccount error:", err);
            const msg =
              err instanceof Error
                ? err.message
                : "Failed to link bank account.";
            Alert.alert("Link Failed", msg);
          } finally {
            setIsLinkingBank(false);
          }
        },
        onExit: (exit: LinkExit) => {
          setIsLinkingBank(false);
          if (exit.error) {
            logger.error("Plaid Link exit error:", exit.error);
            Alert.alert(
              "Connection Error",
              "Could not connect to your bank. Please try again.",
            );
          }
        },
      });
    } catch (err) {
      logger.error("createPlaidLinkToken error:", err);
      Alert.alert(
        "Setup Error",
        "Could not start bank connection. Check your internet and try again.",
      );
      setIsLinkingBank(false);
    }
  }, [updateUser]);

  const getAmountError = () => {
    if (!inputValue) return null;
    if (amountInCents < 1000) return "Minimum withdrawal is $10.00";
    if (amountInCents > 1_000_000) return "Maximum withdrawal is $10,000.00";
    if (amountInCents > balance) return "Exceeds available balance";
    return null;
  };
  const error = getAmountError();

  if (step === "method") {
    return (
      <SessionScreenScaffold
        headerVariant="centered"
        backLabel="Back"
        headerTitle="Withdraw"
        onBack={() => setStep("amount")}
        scrollable={true}
      >
        {/* Amount summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
          <Text style={styles.summaryAmount}>{formatMoney(amountInCents)}</Text>
        </View>

        {hasBankLinked ? (
          <>
            {/* Connected bank info */}
            <Card style={styles.setupCard} variant="outlined">
              <Text style={styles.setupTitle}>
                {linkedBank!.institutionName}
              </Text>
              <Text style={styles.setupDescription}>
                Account ending in {linkedBank!.mask}
              </Text>
            </Card>

            <Text style={styles.sectionLabel}>
              How would you like to receive it?
            </Text>

            {/* Standard method card */}
            <Pressable onPress={() => setSelectedMethod("standard")}>
              <View
                style={[
                  styles.methodCard,
                  selectedMethod === "standard" && styles.methodCardSelected,
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
                    <Text style={styles.methodSubtitle}>1–2 business days</Text>
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
                    <Text style={styles.methodSubtitle}>Within 30 minutes</Text>
                  </View>
                  <View style={[styles.methodBadge, styles.methodBadgeAccent]}>
                    <Text style={styles.methodBadgeTextAccent}>
                      {formatMoney(instantFee)} fee
                    </Text>
                  </View>
                </View>
                <Text style={styles.methodDescription}>
                  Instant bank transfer. 1.5% fee (min $0.50) — covered by
                  NIYAH. You receive the full {formatMoney(amountInCents)}.
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
            </View>
          </>
        ) : (
          /* No bank connected — connect inline via Plaid */
          <>
            {isLinkingBank ? (
              <View style={styles.linkingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.linkingText}>
                  Linking your bank account...
                </Text>
              </View>
            ) : (
              <Card style={styles.setupCard} variant="outlined">
                <Text style={styles.setupTitle}>Connect Your Bank</Text>
                <Text style={styles.setupDescription}>
                  Link your bank account to withdraw directly. Secure connection
                  via Plaid — your credentials are never shared with NIYAH.
                </Text>
                <Button
                  title="Connect Bank Account"
                  onPress={handleConnectBank}
                  size="large"
                  style={styles.setupButton}
                />
              </Card>
            )}
          </>
        )}
      </SessionScreenScaffold>
    );
  }

  return (
    <SessionScreenScaffold
      headerVariant="centered"
      headerTitle="Withdraw"
      scrollable={false}
      headerRight={
        <Pressable
          onPress={handleMaxAmount}
          style={styles.maxButton}
          hitSlop={10}
        >
          <Text style={styles.maxText}>Max</Text>
        </Pressable>
      }
    >
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
    </SessionScreenScaffold>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    maxButton: { alignItems: "flex-end" },
    maxText: {
      color: Colors.primary,
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
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
      marginBottom: Spacing.lg,
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
      marginBottom: Spacing.lg,
    },
    methodCard: {
      padding: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: Colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: Colors.border,
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
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
    linkingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.xl * 2,
      gap: Spacing.md,
    },
    linkingText: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      ...Font.medium,
    },
  });
