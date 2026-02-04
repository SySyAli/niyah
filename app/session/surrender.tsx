import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Card, Button } from "../../src/components";
import { usePartnerStore } from "../../src/store/partnerStore";
import { formatMoney } from "../../src/utils/format";

export default function SurrenderScreen() {
  const router = useRouter();
  const {
    activeDuoSession,
    completeDuoSession,
    getVenmoPayLink,
    markSettlementPaid,
  } = usePartnerStore();
  const [confirmText, setConfirmText] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const canSurrender = confirmText.toLowerCase() === "quit";

  const handleSurrender = () => {
    if (canSurrender && activeDuoSession) {
      // Complete session with user failed, partner completed (assumed)
      completeDuoSession(false, true);
      setShowPayment(true);
    }
  };

  const handlePayVenmo = async () => {
    if (activeDuoSession?.partnerVenmo) {
      const venmoUrl = getVenmoPayLink(
        activeDuoSession.stakeAmount,
        activeDuoSession.partnerVenmo,
        `NIYAH session - lost to ${activeDuoSession.partnerName}`,
      );

      try {
        const canOpen = await Linking.canOpenURL(venmoUrl);
        if (canOpen) {
          await Linking.openURL(venmoUrl);
        } else {
          // Fallback to web
          await Linking.openURL(
            `https://venmo.com/${activeDuoSession.partnerVenmo.replace("@", "")}`,
          );
        }
      } catch (error) {
        Alert.alert(
          "Error",
          "Could not open Venmo. Please pay your partner manually.",
        );
      }
    }
  };

  const handleMarkPaid = () => {
    // Mark as paid and go home
    // Note: In real app, we'd get the session ID from completed session
    router.replace("/(tabs)");
  };

  const handleSkipPayment = () => {
    Alert.alert(
      "Skip Payment?",
      "Skipping payment will hurt your reputation score. Other users may not want to partner with you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip Anyway",
          style: "destructive",
          onPress: () => router.replace("/(tabs)"),
        },
      ],
    );
  };

  if (!activeDuoSession && !showPayment) {
    router.replace("/(tabs)");
    return null;
  }

  // Payment screen after surrender
  if (showPayment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Pay Your Partner</Text>
            <Text style={styles.subtitle}>
              You surrendered - time to settle up
            </Text>
          </View>

          <Card style={styles.paymentCard}>
            <Text style={styles.paymentLabel}>You owe</Text>
            <Text style={styles.paymentAmount}>
              {formatMoney(activeDuoSession?.stakeAmount || 0)}
            </Text>
            <Text style={styles.paymentTo}>
              to {activeDuoSession?.partnerName}
            </Text>
            {activeDuoSession?.partnerVenmo && (
              <Text style={styles.venmoHandle}>
                {activeDuoSession.partnerVenmo}
              </Text>
            )}
          </Card>

          <Card style={styles.reputationWarning}>
            <Text style={styles.reputationTitle}>About Your Reputation</Text>
            <Text style={styles.reputationText}>
              Paying promptly builds trust. Users with low reputation scores get
              excluded from groups. Your current score affects who wants to
              partner with you.
            </Text>
          </Card>

          <View style={styles.footer}>
            <Button
              title="Pay via Venmo"
              onPress={handlePayVenmo}
              size="large"
              variant="primary"
            />
            <Button
              title="I Already Paid"
              onPress={handleMarkPaid}
              size="large"
              variant="secondary"
            />
            <Pressable onPress={handleSkipPayment} style={styles.skipButton}>
              <Text style={styles.skipText}>
                Skip Payment (hurts reputation)
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={styles.backText}>Go Back</Text>
          </Pressable>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Surrender Session?</Text>
          <Text style={styles.subtitle}>This action cannot be undone</Text>
        </View>

        {/* Loss Warning */}
        <Card style={styles.warningCard}>
          <Text style={styles.warningLabel}>You will owe your partner</Text>
          <Text style={styles.lossAmount}>
            {formatMoney(activeDuoSession?.stakeAmount || 0)}
          </Text>
          <View style={styles.partnerInfo}>
            <Text style={styles.warningNote}>
              Pay {activeDuoSession?.partnerName} via Venmo
            </Text>
            {activeDuoSession?.partnerVenmo && (
              <Text style={styles.partnerVenmo}>
                {activeDuoSession.partnerVenmo}
              </Text>
            )}
          </View>
        </Card>

        {/* Reputation Impact */}
        <Card style={styles.reputationCard}>
          <Text style={styles.reputationTitle}>Reputation Impact</Text>
          <Text style={styles.reputationText}>
            Surrendering is okay - but not paying hurts your reputation. Pay
            your partner to maintain trust.
          </Text>
        </Card>

        {/* Alternative Suggestions */}
        <Card style={styles.alternativeCard}>
          <Text style={styles.alternativeTitle}>Before you go...</Text>
          <Text style={styles.alternativeText}>
            You have made it this far. Try one of these instead:
          </Text>
          <View style={styles.suggestions}>
            {[
              "Take a 5-minute walk",
              "Get a glass of water",
              "Do some stretches",
              "Take 10 deep breaths",
            ].map((suggestion, index) => (
              <View key={index} style={styles.suggestionRow}>
                <View style={styles.suggestionBullet} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Confirm Section */}
        <View style={styles.confirmSection}>
          <Text style={styles.confirmLabel}>
            Type QUIT to confirm surrender
          </Text>
          <TextInput
            style={[
              styles.confirmInput,
              canSurrender && styles.confirmInputValid,
            ]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type QUIT"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Surrender and Pay Partner"
            onPress={handleSurrender}
            disabled={!canSurrender}
            variant="danger"
            size="large"
          />
          <Button
            title="Keep Going"
            onPress={() => router.back()}
            variant="primary"
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
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  backText: {
    color: Colors.primary,
    fontSize: Typography.bodyLarge,
    fontWeight: "500",
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
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
  },
  // Warning card
  warningCard: {
    alignItems: "center",
    backgroundColor: Colors.lossLight,
    borderWidth: 1,
    borderColor: Colors.loss,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  warningLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  lossAmount: {
    fontSize: Typography.displaySmall,
    fontWeight: "700",
    color: Colors.loss,
    marginBottom: Spacing.sm,
  },
  warningNote: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
    textAlign: "center",
  },
  partnerInfo: {
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  partnerVenmo: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  // Payment card (after surrender)
  paymentCard: {
    alignItems: "center",
    backgroundColor: Colors.lossLight,
    borderWidth: 1,
    borderColor: Colors.loss,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  paymentLabel: {
    fontSize: Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  paymentAmount: {
    fontSize: Typography.displayMedium,
    fontWeight: "700",
    color: Colors.loss,
    marginBottom: Spacing.xs,
  },
  paymentTo: {
    fontSize: Typography.bodyMedium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  venmoHandle: {
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Reputation cards
  reputationCard: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: Spacing.md,
  },
  reputationWarning: {
    backgroundColor: Colors.backgroundCard,
    marginBottom: Spacing.lg,
  },
  reputationTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  reputationText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  // Skip payment
  skipButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  skipText: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
  },
  // Alternative suggestions
  alternativeCard: {
    marginBottom: Spacing.lg,
  },
  alternativeTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  alternativeText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  suggestions: {
    gap: Spacing.xs,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  suggestionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
  },
  suggestionText: {
    fontSize: Typography.bodySmall,
    color: Colors.text,
  },
  confirmSection: {
    marginBottom: Spacing.lg,
  },
  confirmLabel: {
    fontSize: Typography.labelMedium,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  confirmInput: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.titleMedium,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
    textAlign: "center",
    letterSpacing: 4,
    fontWeight: "600",
  },
  confirmInputValid: {
    borderColor: Colors.loss,
    backgroundColor: Colors.lossLight,
  },
  footer: {
    marginTop: "auto",
    gap: Spacing.sm,
  },
});
