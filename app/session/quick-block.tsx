import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Card, Button, SessionScreenScaffold } from "../../src/components";
import * as Haptics from "expo-haptics";
import {
  isScreenTimeAvailable,
  requestScreenTimeAuth,
  getScreenTimeAuthStatus,
  presentAppPicker,
  getSavedAppSelection,
  startBlocking,
} from "../../src/config/screentime";
import { useGroupSessionStore } from "../../src/store/groupSessionStore";
import { useAuthStore } from "../../src/store/authStore";

// ─── Duration options ─────────────────────────────────────────────────────────

interface DurationOption {
  label: string;
  durationMs: number;
}

const DURATION_OPTIONS: DurationOption[] = [
  { label: "25 min", durationMs: 25 * 60 * 1000 },
  { label: "1 hour", durationMs: 60 * 60 * 1000 },
  { label: "2 hours", durationMs: 2 * 60 * 60 * 1000 },
  { label: "4 hours", durationMs: 4 * 60 * 60 * 1000 },
];

// Calculate "until tonight" (10 PM today, or 2 hours if already past 10 PM)
function getUntilTonightMs(): number {
  const now = new Date();
  const tonight = new Date(now);
  tonight.setHours(22, 0, 0, 0);
  const diff = tonight.getTime() - now.getTime();
  return diff > 0 ? diff : 2 * 60 * 60 * 1000; // fallback 2 hours
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    setupCard: {
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    setupTitle: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.sm,
    },
    setupDescription: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      marginBottom: Spacing.md,
      lineHeight: 20,
    },
    setupRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.sm,
    },
    setupStatus: {
      fontSize: Typography.bodySmall,
      ...Font.medium,
    },
    setupDone: {
      color: Colors.gain,
    },
    setupPending: {
      color: Colors.textMuted,
    },
    sectionLabel: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.text,
      marginBottom: Spacing.md,
    },
    durationGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    durationChip: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: Colors.backgroundCard,
      borderWidth: 2,
      borderColor: "transparent",
      minWidth: "45%",
      alignItems: "center",
      flexGrow: 1,
    },
    durationChipSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    durationLabel: {
      fontSize: Typography.bodyMedium,
      ...Font.semibold,
      color: Colors.text,
    },
    durationLabelSelected: {
      color: Colors.primary,
    },
    appSelectionCard: {
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    appSelectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    appSelectionLabel: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      flex: 1,
    },
    appSelectionValue: {
      fontSize: Typography.bodySmall,
      ...Font.semibold,
      color: Colors.primary,
    },
    infoCard: {
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    infoText: {
      fontSize: Typography.bodySmall,
      color: Colors.textSecondary,
      lineHeight: 20,
      textAlign: "center",
    },
    infoBold: {
      ...Font.semibold,
      color: Colors.text,
    },
    disclaimer: {
      textAlign: "center",
      color: Colors.textMuted,
      fontSize: Typography.labelSmall,
    },
  });

export default function QuickBlockScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { startGroupSession } = useGroupSessionStore();

  const [selectedIndex, setSelectedIndex] = useState(0); // default: 25 min
  const [isLoading, setIsLoading] = useState(false);
  const [appSelection, setAppSelection] = useState(getSavedAppSelection());

  const isAuthorized =
    isScreenTimeAvailable && getScreenTimeAuthStatus() === "approved";
  const hasApps = !!appSelection && appSelection.appCount > 0;

  const allDurations: (DurationOption & { key: string })[] = useMemo(() => {
    const tonight = getUntilTonightMs();
    return [
      ...DURATION_OPTIONS.map((d, i) => ({ ...d, key: `opt-${i}` })),
      { label: "Until tonight", durationMs: tonight, key: "tonight" },
    ];
  }, []);

  const selectedDuration = allDurations[selectedIndex];

  const handleAuthorize = useCallback(async () => {
    if (!isScreenTimeAvailable) {
      Alert.alert(
        "Not Available",
        "Screen Time requires iOS 16+ on a physical device.",
      );
      return;
    }
    try {
      const result = await requestScreenTimeAuth();
      if (result === "approved") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Failed to request Screen Time authorization.");
    }
  }, []);

  const handleSelectApps = useCallback(async () => {
    if (!isScreenTimeAvailable) return;
    try {
      const selection = await presentAppPicker();
      setAppSelection(selection);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // User cancelled the picker
    }
  }, []);

  const handleStartBlocking = useCallback(async () => {
    if (!user) return;

    // Step 1: Ensure Screen Time is authorized
    if (isScreenTimeAvailable && getScreenTimeAuthStatus() !== "approved") {
      try {
        const result = await requestScreenTimeAuth();
        if (result !== "approved") {
          Alert.alert(
            "Authorization Required",
            "Niyah needs Screen Time access to block distracting apps.",
          );
          return;
        }
      } catch {
        return;
      }
    }

    // Step 2: Ensure apps are selected
    if (isScreenTimeAvailable && !getSavedAppSelection()) {
      try {
        const selection = await presentAppPicker();
        setAppSelection(selection);
      } catch {
        // User cancelled
        return;
      }
    }

    setIsLoading(true);

    try {
      // Step 3: Start blocking
      if (isScreenTimeAvailable) {
        await startBlocking();
      }

      // Step 4: Create a local session with the selected duration
      const durationMs = selectedDuration.durationMs;
      startGroupSession(
        "daily", // cadence type doesn't matter for quick block, just reuse daily
        [
          {
            userId: user.id,
            name: user.name,
            venmoHandle: user.venmoHandle,
            profileImage: user.profileImage,
            reputation: user.reputation,
          },
        ],
        durationMs,
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/session/active?mode=solo_quick");
    } catch {
      Alert.alert(
        "Failed to Start",
        "Could not start blocking. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDuration, startGroupSession, router]);

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${minutes} min`;
  };

  return (
    <SessionScreenScaffold
      headerVariant="back"
      backLabel="Cancel"
      title="Block Apps"
      subtitle="Focus without distractions"
      centerTitle={false}
      footer={
        <>
          <Button
            title={isLoading ? "Starting..." : "Start Blocking"}
            onPress={handleStartBlocking}
            disabled={isLoading}
            size="large"
          />
          <Text style={styles.disclaimer}>No money involved. Just focus.</Text>
        </>
      }
    >
      {/* Screen Time Setup (only shown if not ready) */}
      {isScreenTimeAvailable && (!isAuthorized || !hasApps) && (
        <Card style={styles.setupCard}>
          <Text style={styles.setupTitle}>Setup Required</Text>
          <Text style={styles.setupDescription}>
            Niyah needs Screen Time access to block apps on your device.
          </Text>

          {!isAuthorized && (
            <View style={styles.setupRow}>
              <Text
                style={[
                  styles.setupStatus,
                  isAuthorized ? styles.setupDone : styles.setupPending,
                ]}
              >
                Screen Time: {isAuthorized ? "Authorized" : "Not authorized"}
              </Text>
              <Button
                title="Authorize"
                onPress={handleAuthorize}
                size="small"
              />
            </View>
          )}

          {isAuthorized && !hasApps && (
            <View style={styles.setupRow}>
              <Text style={[styles.setupStatus, styles.setupPending]}>
                No apps selected
              </Text>
              <Button
                title="Select Apps"
                onPress={handleSelectApps}
                size="small"
              />
            </View>
          )}
        </Card>
      )}

      {/* App Selection (shown when ready) */}
      {hasApps && (
        <Pressable onPress={handleSelectApps}>
          <Card style={styles.appSelectionCard}>
            <View style={styles.appSelectionRow}>
              <Text style={styles.appSelectionLabel}>Apps to block</Text>
              <Text style={styles.appSelectionValue}>
                {appSelection?.label ?? "Selected apps"} ›
              </Text>
            </View>
          </Card>
        </Pressable>
      )}

      {/* Duration Selection */}
      <Text style={styles.sectionLabel}>How long?</Text>
      <View style={styles.durationGrid}>
        {allDurations.map((option, index) => (
          <Pressable
            key={option.key}
            onPress={() => {
              setSelectedIndex(index);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View
              style={[
                styles.durationChip,
                selectedIndex === index && styles.durationChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.durationLabel,
                  selectedIndex === index && styles.durationLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Selected apps will be blocked for{" "}
          <Text style={styles.infoBold}>
            {formatDuration(selectedDuration.durationMs)}
          </Text>
          . You can end the session early, but stay strong!
        </Text>
      </View>
    </SessionScreenScaffold>
  );
}
