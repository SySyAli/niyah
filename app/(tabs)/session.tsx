import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
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
import { Card, Button } from "../../src/components";
import { useSessionStore } from "../../src/store/sessionStore";
import { useWalletStore } from "../../src/store/walletStore";
import { CADENCES } from "../../src/constants/config";
import { formatMoney } from "../../src/utils/format";

interface CadenceCardProps {
  cadenceKey: string;
  config: (typeof CADENCES)[keyof typeof CADENCES];
  canAfford: boolean;
  onPress: () => void;
}

const CadenceCard: React.FC<CadenceCardProps> = ({
  cadenceKey,
  config,
  canAfford,
  onPress,
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

  const roi = ((config.basePayout / config.stake - 1) * 100).toFixed(0);

  return (
    <Pressable
      onPress={canAfford ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Card
          style={[styles.cadenceCard, !canAfford && styles.cadenceCardDisabled]}
          animate={false}
        >
          <View style={styles.cadenceHeader}>
            <Text style={styles.cadenceName}>{config.name}</Text>
            <View style={styles.roiBadge}>
              <Text style={styles.roiText}>{roi}% return</Text>
            </View>
          </View>

          <View style={styles.cadenceDetails}>
            <View style={styles.cadenceColumn}>
              <Text style={styles.columnLabel}>You stake</Text>
              <Text style={styles.stakeValue}>{formatMoney(config.stake)}</Text>
            </View>
            <View style={styles.arrowContainer}>
              <View style={styles.arrowLine} />
              <View style={styles.arrowHead} />
            </View>
            <View style={[styles.cadenceColumn, styles.cadenceColumnRight]}>
              <Text style={styles.columnLabel}>You earn</Text>
              <Text style={styles.earnValue}>
                {formatMoney(config.basePayout)}
              </Text>
            </View>
          </View>

          <View style={styles.cadenceMeta}>
            <Text style={styles.metaText}>
              {config.demoDuration / 1000}s session (demo)
            </Text>
          </View>

          {!canAfford && (
            <View style={styles.insufficientBanner}>
              <Text style={styles.insufficientText}>
                Insufficient balance - need {formatMoney(config.stake)}
              </Text>
            </View>
          )}
        </Card>
      </Animated.View>
    </Pressable>
  );
};

export default function SessionTabScreen() {
  const router = useRouter();
  const currentSession = useSessionStore((state) => state.currentSession);
  const balance = useWalletStore((state) => state.balance);

  if (currentSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.activeHeader}>
            <Text style={styles.title}>Session Active</Text>
            <Text style={styles.subtitle}>
              You have an active focus session
            </Text>
          </View>

          <Card style={styles.activeCard} variant="elevated">
            <View style={styles.pulseIndicator}>
              <View style={styles.pulseOuter} />
              <View style={styles.pulseInner} />
            </View>
            <Text style={styles.activeTitle}>
              {currentSession.cadence.charAt(0).toUpperCase() +
                currentSession.cadence.slice(1)}{" "}
              Session
            </Text>
            <Text style={styles.activeSubtitle}>
              Potential payout: {formatMoney(currentSession.potentialPayout)}
            </Text>
          </Card>

          <View style={styles.activeFooter}>
            <Button
              title="View Active Session"
              onPress={() => router.push("/session/active")}
              size="large"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Start a Session</Text>
        <Text style={styles.subtitle}>Choose your commitment level</Text>

        <View style={styles.cadenceList}>
          {Object.entries(CADENCES).map(([key, config]) => (
            <CadenceCard
              key={key}
              cadenceKey={key}
              config={config}
              canAfford={balance >= config.stake}
              onPress={() => router.push(`/session/select?cadence=${key}`)}
            />
          ))}
        </View>

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How it works</Text>
          <View style={styles.stepList}>
            {[
              "Choose your session duration and stake",
              "Your stake is locked until completion",
              "Focus and avoid distracting apps",
              "Complete to earn your payout",
              "Quit early and lose your stake",
            ].map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.xxl,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
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
  cadenceList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  cadenceCard: {
    padding: Spacing.lg,
  },
  cadenceCardDisabled: {
    opacity: 0.6,
  },
  cadenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  cadenceName: {
    fontSize: Typography.titleLarge,
    fontWeight: "700",
    color: Colors.text,
  },
  roiBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  roiText: {
    color: Colors.primary,
    fontSize: Typography.labelSmall,
    fontWeight: "600",
  },
  cadenceDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cadenceColumn: {
    flex: 1,
  },
  cadenceColumnRight: {
    alignItems: "flex-end",
  },
  columnLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stakeValue: {
    fontSize: Typography.headlineSmall,
    fontWeight: "700",
    color: Colors.text,
  },
  earnValue: {
    fontSize: Typography.headlineSmall,
    fontWeight: "700",
    color: Colors.gain,
  },
  arrowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  arrowLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: Colors.border,
  },
  cadenceMeta: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  metaText: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
  },
  insufficientBanner: {
    backgroundColor: Colors.lossLight,
    marginTop: Spacing.sm,
    marginHorizontal: -Spacing.lg,
    marginBottom: -Spacing.lg,
    padding: Spacing.sm,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  insufficientText: {
    color: Colors.loss,
    fontSize: Typography.labelSmall,
    textAlign: "center",
    fontWeight: "500",
  },
  // Active session styles
  activeHeader: {
    marginBottom: Spacing.xl,
  },
  activeCard: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  pulseIndicator: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  pulseOuter: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryMuted,
  },
  pulseInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  activeTitle: {
    fontSize: Typography.titleLarge,
    fontWeight: "700",
    color: Colors.text,
  },
  activeSubtitle: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  activeFooter: {
    marginTop: "auto",
  },
  // How it works
  howItWorks: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  howTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  stepList: {
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  stepNumberText: {
    fontSize: Typography.labelSmall,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  stepText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
