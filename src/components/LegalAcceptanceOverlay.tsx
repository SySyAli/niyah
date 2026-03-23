import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../constants/colors";
import { useColors } from "../hooks/useColors";
import { Button } from "./Button";
import { LegalContentView } from "./LegalContentView";

interface LegalAcceptanceOverlayProps {
  visible: boolean;
  onAccept: () => void;
  loading?: boolean;
}

export const LegalAcceptanceOverlay: React.FC<LegalAcceptanceOverlayProps> = ({
  visible,
  onAccept,
  loading = false,
}) => {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [checked, setChecked] = useState(false);

  const handleCheckbox = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => !prev);
  };

  const handleConfirm = () => {
    if (!checked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {
        // Non-dismissible — no-op
      }}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Terms & Privacy</Text>
          <Text style={styles.subtitle}>
            Please review and accept to continue
          </Text>
        </View>

        {/* Scrollable legal content */}
        <LegalContentView section="both" />

        {/* Acceptance controls */}
        <View style={styles.footer}>
          <Pressable
            style={styles.checkboxRow}
            onPress={handleCheckbox}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          >
            <View
              style={[styles.checkbox, checked && styles.checkboxChecked]}
            >
              {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </Pressable>

          <Button
            title="Continue"
            onPress={handleConfirm}
            disabled={!checked || loading}
            loading={loading}
            size="large"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      alignItems: "center",
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    title: {
      fontSize: Typography.headlineMedium,
      ...Font.bold,
      color: Colors.text,
    },
    subtitle: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      marginTop: Spacing.xs,
    },
    footer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      gap: Spacing.md,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: Radius.sm,
      borderWidth: 2,
      borderColor: Colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    checkmark: {
      color: Colors.white,
      fontSize: 16,
      ...Font.bold,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: Typography.bodySmall,
      color: Colors.text,
      lineHeight: Typography.bodySmall * 1.5,
    },
  });
