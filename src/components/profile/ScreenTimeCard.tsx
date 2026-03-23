import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../constants/colors";
import { useColors } from "../../hooks/useColors";
import { Card } from "../Card";
import {
  isScreenTimeAvailable,
  requestScreenTimeAuth,
  getScreenTimeAuthStatus,
  presentAppPicker,
  getSavedAppSelection,
} from "../../config/screentime";
import type { AuthorizationStatus } from "../../../modules/niyah-screentime";

export function ScreenTimeCard() {
  const Colors = useColors();
  const styles = React.useMemo(() => makeStyles(Colors), [Colors]);

  const [screenTimeAuth, setScreenTimeAuth] =
    useState<AuthorizationStatus>("notDetermined");
  const [appSelectionCount, setAppSelectionCount] = useState(0);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isSelectingApps, setIsSelectingApps] = useState(false);

  const refreshStatus = useCallback(() => {
    if (!isScreenTimeAvailable) return;
    try {
      setScreenTimeAuth(getScreenTimeAuthStatus());
      const selection = getSavedAppSelection();
      setAppSelectionCount(selection?.appCount ?? 0);
    } catch {
      // not available on simulator
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  if (!isScreenTimeAvailable) return null;

  return (
    <Card style={styles.screenTimeCard}>
      <Text style={styles.screenTimeTitle}>Screen Time</Text>
      <Text style={styles.screenTimeDescription}>
        {screenTimeAuth === "approved"
          ? appSelectionCount > 0
            ? `${appSelectionCount} app${appSelectionCount !== 1 ? "s" : ""} will be blocked during sessions`
            : "Select which apps to block during sessions"
          : "Allow NIYAH to block distracting apps during sessions"}
      </Text>

      {screenTimeAuth !== "approved" ? (
        <Pressable
          style={[
            styles.screenTimeButton,
            isEnabling && styles.screenTimeButtonLoading,
          ]}
          onPress={async () => {
            if (isEnabling) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsEnabling(true);
            try {
              const status = await requestScreenTimeAuth();
              setScreenTimeAuth(status);
              if (status === "denied") {
                Alert.alert(
                  "Permission Denied",
                  "You can enable Screen Time access in Settings > NIYAH > Screen Time.",
                );
              }
            } catch {
              Alert.alert(
                "Error",
                "Could not request Screen Time permission. Make sure you're on a physical device with iOS 16+.",
              );
            } finally {
              setIsEnabling(false);
            }
          }}
          disabled={isEnabling}
        >
          {isEnabling ? (
            <ActivityIndicator
              size="small"
              color="#F2EDE4"
              style={styles.screenTimeButtonSpinner}
            />
          ) : null}
          <Text style={styles.screenTimeButtonText}>
            {isEnabling ? "Enabling…" : "Enable Screen Time"}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.screenTimeActions}>
          <Pressable
            style={[
              styles.screenTimeButton,
              isSelectingApps && styles.screenTimeButtonLoading,
            ]}
            onPress={async () => {
              if (isSelectingApps) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsSelectingApps(true);
              try {
                const selection = await presentAppPicker();
                setAppSelectionCount(selection.appCount);
              } catch {
                // User cancelled the picker
              } finally {
                setIsSelectingApps(false);
              }
            }}
            disabled={isSelectingApps}
          >
            {isSelectingApps ? (
              <ActivityIndicator
                size="small"
                color="#F2EDE4"
                style={styles.screenTimeButtonSpinner}
              />
            ) : null}
            <Text style={styles.screenTimeButtonText}>
              {isSelectingApps
                ? "Opening…"
                : appSelectionCount > 0
                  ? "Change Apps"
                  : "Select Apps"}
            </Text>
          </Pressable>

          {appSelectionCount > 0 && (
            <View style={styles.screenTimeStatusBadge}>
              <View style={styles.screenTimeStatusDot} />
              <Text style={styles.screenTimeStatusText}>Ready</Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    screenTimeCard: {
      marginBottom: Spacing.md,
      backgroundColor: Colors.backgroundCard,
    },
    screenTimeTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.xs,
    },
    screenTimeDescription: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      marginBottom: Spacing.md,
      lineHeight: 20,
    },
    screenTimeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
      alignSelf: "flex-start",
      minHeight: 36,
      gap: Spacing.xs,
    },
    screenTimeButtonLoading: {
      opacity: 0.7,
    },
    screenTimeButtonSpinner: {
      // ActivityIndicator sits inline next to text via flexDirection: row
    },
    screenTimeButtonText: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.text,
    },
    screenTimeActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
    },
    screenTimeStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.gainLight,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
    },
    screenTimeStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.gain,
      marginRight: Spacing.xs,
    },
    screenTimeStatusText: {
      fontSize: Typography.labelSmall,
      ...Font.semibold,
      color: Colors.gain,
    },
  });
