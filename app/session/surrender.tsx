import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Card, Button } from "../../src/components";
import { useSessionStore } from "../../src/store/sessionStore";
import { formatMoney } from "../../src/utils/format";

export default function SurrenderScreen() {
  const router = useRouter();
  const { currentSession, surrenderSession } = useSessionStore();
  const [confirmText, setConfirmText] = useState("");

  const canSurrender = confirmText.toLowerCase() === "quit";

  const handleSurrender = () => {
    if (canSurrender) {
      surrenderSession();
      router.replace("/(tabs)");
    }
  };

  if (!currentSession) {
    router.replace("/(tabs)");
    return null;
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
          <Text style={styles.warningLabel}>You will lose</Text>
          <Text style={styles.lossAmount}>
            {formatMoney(currentSession.stakeAmount)}
          </Text>
          <Text style={styles.warningNote}>
            Your stake will be forfeited and your streak will reset
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
            title="Surrender and Lose Stake"
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
