/**
 * Stripe Connect onboarding screen
 * Users complete identity verification (KYC) to enable real payouts.
 * Stripe Express handles the KYC flow via a browser redirect.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Typography,
  Spacing,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import * as Haptics from "expo-haptics";
import { Button, Card } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccountStatus,
} from "../../src/config/functions";

type AccountStatus = "none" | "pending" | "active" | "restricted";

export default function StripeOnboardingScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [status, setStatus] = useState<AccountStatus>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!user?.stripeAccountId) {
        setStatus("none");
        return;
      }
      const result = await getConnectAccountStatus();
      setStatus(result.status);
      if (
        result.status !== "none" &&
        result.status !== user?.stripeAccountStatus
      ) {
        updateUser({ stripeAccountStatus: result.status });
      }
    } catch (err) {
      console.error("Failed to check Stripe status:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.stripeAccountId, user?.stripeAccountStatus, updateUser]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleStartOnboarding = async () => {
    setIsStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Create Connect account if needed
      let accountId = user?.stripeAccountId;
      if (!accountId) {
        const result = await createConnectAccount();
        accountId = result.accountId;
        updateUser({
          stripeAccountId: accountId,
          stripeAccountStatus: "pending",
        });
      }

      // Get onboarding URL
      const { url } = await createAccountLink(accountId);

      // Open Stripe's KYC flow in browser
      const result = await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: "close",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });

      if (result.type === "dismiss" || result.type === "opened") {
        // Re-check status after user returns from Stripe
        await checkStatus();
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      Alert.alert(
        "Setup Error",
        "Could not start payout setup. Please try again.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking account status...</Text>
        </View>
      );
    }

    if (status === "active") {
      return (
        <View style={styles.center}>
          <Text style={styles.statusEmoji}>✓</Text>
          <Text style={styles.statusTitle}>Payouts Enabled</Text>
          <Text style={styles.statusDescription}>
            Your account is verified. Winnings will be deposited directly to
            your bank.
          </Text>
          <Button
            title="Done"
            onPress={() => router.back()}
            size="large"
            style={styles.actionButton}
          />
        </View>
      );
    }

    if (status === "restricted") {
      return (
        <View style={styles.center}>
          <Text style={styles.statusEmoji}>⚠</Text>
          <Text style={styles.statusTitle}>Action Required</Text>
          <Text style={styles.statusDescription}>
            Stripe needs additional information to enable payouts on your
            account.
          </Text>
          <Button
            title="Complete Verification"
            onPress={handleStartOnboarding}
            size="large"
            style={styles.actionButton}
            loading={isStarting}
          />
        </View>
      );
    }

    if (status === "pending") {
      return (
        <View style={styles.center}>
          <Text style={styles.statusEmoji}>⏳</Text>
          <Text style={styles.statusTitle}>Verification Pending</Text>
          <Text style={styles.statusDescription}>
            Your account is under review. This usually takes a few minutes.
          </Text>
          <Button
            title="Check Status"
            onPress={checkStatus}
            size="large"
            style={styles.actionButton}
            loading={isLoading}
          />
        </View>
      );
    }

    // status === "none" — not set up yet
    return (
      <View style={styles.center}>
        <Text style={styles.hero}>Enable Payouts</Text>
        <Text style={styles.subtitle}>
          Set up your payout account to receive winnings directly to your bank.
          Powered by Stripe — the same payment infrastructure used by Amazon and
          Shopify.
        </Text>

        <Card style={styles.infoCard} variant="outlined">
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🔒</Text>
            <Text style={styles.infoText}>
              Bank-level encryption. Stripe never stores card details.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏦</Text>
            <Text style={styles.infoText}>
              Direct bank transfers. Funds arrive within 1–2 business days.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🌍</Text>
            <Text style={styles.infoText}>
              US accounts only (for now). Connect your checking account.
            </Text>
          </View>
        </Card>

        <Button
          title="Set Up Payouts"
          onPress={handleStartOnboarding}
          size="large"
          style={styles.actionButton}
          loading={isStarting}
        />

        <Text style={styles.disclaimer}>
          You'll be taken to Stripe to verify your identity and link a bank
          account. This is a one-time setup.
        </Text>
      </View>
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
          <Text style={styles.title}>Payout Setup</Text>
          <View style={styles.closeButton} />
        </View>

        {renderContent()}
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
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.lg,
    },
    hero: {
      fontSize: Typography.displaySmall,
      ...Font.bold,
      color: Colors.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: Typography.bodyLarge,
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: Typography.bodyLarge * 1.5,
    },
    infoCard: {
      width: "100%",
      gap: Spacing.md,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.md,
    },
    infoIcon: {
      fontSize: 20,
      width: 28,
      textAlign: "center",
    },
    infoText: {
      flex: 1,
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      lineHeight: Typography.bodyMedium * 1.5,
    },
    actionButton: {
      width: "100%",
    },
    disclaimer: {
      textAlign: "center",
      color: Colors.textMuted,
      fontSize: Typography.labelSmall,
      lineHeight: Typography.labelSmall * 1.5,
    },
    loadingText: {
      color: Colors.textSecondary,
      fontSize: Typography.bodyMedium,
      marginTop: Spacing.md,
    },
    statusEmoji: {
      fontSize: 48,
    },
    statusTitle: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.text,
    },
    statusDescription: {
      fontSize: Typography.bodyLarge,
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: Typography.bodyLarge * 1.5,
    },
  });
