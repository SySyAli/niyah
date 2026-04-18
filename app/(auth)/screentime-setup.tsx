import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Button, AuthScreenScaffold } from "../../src/components";
import {
  isScreenTimeAvailable,
  requestScreenTimeAuth,
  getScreenTimeAuthStatus,
  presentAppPicker,
  getSavedAppSelection,
} from "../../src/config/screentime";

export default function ScreenTimeSetupScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();

  const [isRequesting, setIsRequesting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(
    isScreenTimeAvailable && getScreenTimeAuthStatus() === "approved",
  );
  const [hasSelection, setHasSelection] = useState(
    isScreenTimeAvailable && !!getSavedAppSelection(),
  );

  const handleConnect = async () => {
    if (!isScreenTimeAvailable) {
      // Not available on this device — skip
      router.replace("/(tabs)");
      return;
    }

    setIsRequesting(true);
    try {
      const result = await requestScreenTimeAuth();
      if (result === "approved") {
        setIsAuthorized(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Don't auto-advance — let the user pick which apps to block.
        setIsRequesting(false);
      } else {
        // User denied — let them skip
        setIsRequesting(false);
      }
    } catch {
      setIsRequesting(false);
    }
  };

  const handlePickApps = async () => {
    if (!isScreenTimeAvailable) {
      router.replace("/(tabs)");
      return;
    }
    setIsRequesting(true);
    try {
      await presentAppPicker();
      // Re-check after picker dismisses (user may have cancelled).
      const selection = getSavedAppSelection();
      if (selection) {
        setHasSelection(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => router.replace("/(tabs)"), 600);
      }
    } catch {
      // User cancelled or picker failed — let them try again or skip.
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  const title = hasSelection
    ? "You're all set"
    : isAuthorized
      ? 'Tap "All Apps & Categories"'
      : "Connect Niyah to\nScreen Time";
  const subtitle = hasSelection
    ? "Niyah will block your selected apps during focus sessions."
    : isAuthorized
      ? "Select everything. You can exclude specific apps later — picking All gives you the most control."
      : "To block distracting apps, Niyah needs Screen Time access. Apple keeps this private to your device.";

  return (
    <AuthScreenScaffold showBack={false} title={title} subtitle={subtitle}>
      {/* Onboarding progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: hasSelection ? "100%" : isAuthorized ? "66%" : "33%" },
          ]}
        />
      </View>

      <View style={styles.content}>
        {/* Visual indicator */}
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconCircle,
              hasSelection && styles.iconCircleSuccess,
            ]}
          >
            <Text style={styles.iconText}>
              {hasSelection ? "\u2713" : isAuthorized ? "\u2691" : "\u23F1"}
            </Text>
          </View>
        </View>

        {/* Permission explanation */}
        {!isAuthorized && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>What this allows</Text>
            <View style={styles.explanationItem}>
              <Text style={styles.bulletText}>
                Block selected apps during focus sessions
              </Text>
            </View>
            <View style={styles.explanationItem}>
              <Text style={styles.bulletText}>
                Show a custom Niyah shield when you try to open a blocked app
              </Text>
            </View>
            <View style={styles.explanationItem}>
              <Text style={styles.bulletText}>
                Enforced at the OS level by Apple — uninstalling Niyah, turning
                off Wi-Fi, or restarting your phone won't unlock the block. The
                only way out is to surrender your stake.
              </Text>
            </View>
            <View style={styles.explanationItem}>
              <Text style={styles.bulletText}>
                Track focus streaks — never read personal data
              </Text>
            </View>
          </View>
        )}

        {/* When authorized but no selection: mock "All Apps & Categories" row
            so user knows exactly what to tap inside Apple's picker sheet. */}
        {isAuthorized && !hasSelection && (
          <View style={styles.mockCard}>
            <View style={styles.mockRow}>
              <View style={styles.mockRadio} />
              <View style={styles.mockIcon}>
                <Text style={styles.mockIconText}>📚</Text>
              </View>
              <Text style={styles.mockLabel}>All Apps & Categories</Text>
            </View>
            <Text style={styles.mockHint}>↑ Choose this one</Text>
          </View>
        )}

        {/* Privacy note */}
        <Text style={styles.privacyText}>
          Your sensitive data is protected by Apple{"\n"}and never leaves your
          device.
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        {!isAuthorized ? (
          <>
            <Button
              title={isRequesting ? "Connecting..." : "Connect Screen Time"}
              onPress={handleConnect}
              disabled={isRequesting}
              loading={isRequesting}
              size="large"
            />
            <Button
              title="Skip for Now"
              onPress={handleSkip}
              variant="outline"
              size="large"
            />
          </>
        ) : !hasSelection ? (
          <>
            <Button
              title={isRequesting ? "Opening picker..." : "Choose Apps"}
              onPress={handlePickApps}
              disabled={isRequesting}
              loading={isRequesting}
              size="large"
            />
            <Button
              title="Skip for Now"
              onPress={handleSkip}
              variant="outline"
              size="large"
            />
          </>
        ) : (
          <Button
            title="Continue"
            onPress={() => router.replace("/(tabs)")}
            size="large"
          />
        )}
      </View>
    </AuthScreenScaffold>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    progressBar: {
      height: 4,
      backgroundColor: Colors.backgroundTertiary,
      borderRadius: Radius.full,
      marginBottom: Spacing.lg,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
    },
    content: {
      alignItems: "center",
      gap: Spacing.xl,
    },
    mockCard: {
      width: "100%",
      gap: Spacing.sm,
    },
    mockRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: Spacing.md,
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      gap: Spacing.md,
    },
    mockRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: Colors.textMuted,
    },
    mockIcon: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    mockIconText: {
      fontSize: 20,
    },
    mockLabel: {
      flex: 1,
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      color: Colors.text,
    },
    mockHint: {
      fontSize: Typography.bodySmall,
      ...Font.semibold,
      color: Colors.primary,
      textAlign: "center",
    },
    iconContainer: {
      marginVertical: Spacing.lg,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.backgroundCard,
      borderWidth: 2,
      borderColor: Colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircleSuccess: {
      backgroundColor: Colors.gainLight,
      borderColor: Colors.gain,
    },
    iconText: {
      fontSize: 36,
    },
    explanationCard: {
      width: "100%",
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    explanationTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.xs,
    },
    explanationItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.sm,
    },
    bulletText: {
      flex: 1,
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      lineHeight: 20,
    },
    privacyText: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      textAlign: "center",
      lineHeight: Typography.labelSmall * 1.6,
    },
    buttonSection: {
      marginTop: Spacing.xl,
      gap: Spacing.md,
    },
  });
