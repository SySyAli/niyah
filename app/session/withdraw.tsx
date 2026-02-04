import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Button, Card, NumPad, AmountDisplay } from "../../src/components";
import { useWalletStore } from "../../src/store/walletStore";
import { formatMoney } from "../../src/utils/format";

export default function WithdrawScreen() {
  const router = useRouter();
  const { withdraw, balance } = useWalletStore();
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState<"amount" | "details">("amount");
  const [venmoHandle, setVenmoHandle] = useState("");

  // Convert input string to cents
  const amountInCents = inputValue
    ? Math.round(parseFloat(inputValue) * 100)
    : 0;
  const displayAmount = inputValue ? `$${inputValue}` : "";
  const isValidAmount = amountInCents >= 1000 && amountInCents <= balance; // Min $10
  const canWithdraw = isValidAmount && venmoHandle.length > 1;

  const handleKeyPress = useCallback(
    (key: string) => {
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

      // Don't exceed balance
      const newValue = inputValue + key;
      const newAmountCents = Math.round(parseFloat(newValue) * 100);
      if (newAmountCents > balance) {
        return;
      }

      setInputValue(newValue);
    },
    [inputValue, balance],
  );

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const handleMaxAmount = () => {
    setInputValue((balance / 100).toFixed(2));
  };

  const handleContinue = () => {
    if (!isValidAmount) return;
    setStep("details");
  };

  const handleWithdraw = () => {
    if (!canWithdraw) return;

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw ${formatMoney(amountInCents)} to ${venmoHandle}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            withdraw(amountInCents);
            router.back();
          },
        },
      ],
    );
  };

  const getAmountError = () => {
    if (!inputValue) return null;
    if (amountInCents < 1000) return "Minimum withdrawal is $10.00";
    if (amountInCents > balance) return "Exceeds available balance";
    return null;
  };

  const error = getAmountError();

  if (step === "details") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => setStep("amount")}
              style={styles.closeButton}
              hitSlop={20}
            >
              <Text style={styles.closeText}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Withdrawal Details</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.detailsContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
              <Text style={styles.summaryAmount}>
                {formatMoney(amountInCents)}
              </Text>
            </View>

            {/* Venmo Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Venmo Username</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  style={styles.textInput}
                  value={venmoHandle}
                  onChangeText={setVenmoHandle}
                  placeholder="username"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Info Card */}
            <Card style={styles.infoCard} variant="outlined">
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Processing time</Text>
                <Text style={styles.infoValue}>Instant (demo)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fee</Text>
                <Text style={styles.infoValueGreen}>Free</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <Text style={styles.infoLabel}>You will receive</Text>
                <Text style={styles.infoValueBold}>
                  {formatMoney(amountInCents)}
                </Text>
              </View>
            </Card>
          </ScrollView>

          {/* CTA */}
          <View style={styles.footer}>
            <Button
              title={
                canWithdraw
                  ? `Withdraw ${formatMoney(amountInCents)}`
                  : "Enter Venmo username"
              }
              onPress={handleWithdraw}
              disabled={!canWithdraw}
              size="large"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Withdraw</Text>
          <Pressable
            onPress={handleMaxAmount}
            style={styles.maxButton}
            hitSlop={10}
          >
            <Text style={styles.maxText}>Max</Text>
          </Pressable>
        </View>

        {/* Balance Info */}
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatMoney(balance)}</Text>
        </View>

        {/* Amount Display */}
        <AmountDisplay
          amount={displayAmount}
          label="Enter amount"
          placeholder="$0"
        />

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    flex: 1,
  },
  detailsContent: {
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
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
  maxButton: {
    width: 60,
    alignItems: "flex-end",
  },
  maxText: {
    color: Colors.primary,
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
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
    color: Colors.gain,
  },
  errorText: {
    textAlign: "center",
    color: Colors.danger,
    fontSize: Typography.bodySmall,
    marginTop: -Spacing.md,
    marginBottom: Spacing.sm,
  },
  numPadContainer: {
    flex: 1,
    justifyContent: "center",
  },
  footer: {
    paddingVertical: Spacing.lg,
  },
  // Details step styles
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
    fontWeight: "700",
    color: Colors.text,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: Typography.labelLarge,
    fontWeight: "500",
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  inputPrefix: {
    fontSize: Typography.titleMedium,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.titleMedium,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  infoCard: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingTop: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.bodyMedium,
    color: Colors.text,
  },
  infoValueGreen: {
    fontSize: Typography.bodyMedium,
    color: Colors.gain,
    fontWeight: "500",
  },
  infoValueBold: {
    fontSize: Typography.titleMedium,
    color: Colors.text,
    fontWeight: "600",
  },
});
