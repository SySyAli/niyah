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
    ? "All Set!"
    : isAuthorized
      ? "Pick Apps to Block"
      : "Connect Niyah to\nScreen Time, Securely.";
  const subtitle = hasSelection
    ? "Niyah will block your selected apps during focus sessions."
    : isAuthorized
      ? "Choose the apps and categories you want to block during focus sessions. You can change these later in your profile."
      : "To block distracting apps on this iPhone, Niyah will need your permission.";

  return (
    <AuthScreenScaffold showBack={false} title={title} subtitle={subtitle}>
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
                Show a custom Niyah screen when you try to open a blocked app
              </Text>
            </View>
            <View style={styles.explanationItem}>
              <Text style={styles.bulletText}>
                Track focus streaks (no personal data is collected)
              </Text>
            </View>
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
    content: {
      alignItems: "center",
      gap: Spacing.xl,
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
