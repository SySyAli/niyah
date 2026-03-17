import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
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

interface PaymentHandlesCardProps {
  venmoHandle?: string;
  zelleHandle?: string;
  onSaveVenmo: (handle: string) => void;
  onSaveZelle: (handle: string) => void;
}

export function PaymentHandlesCard({
  venmoHandle,
  zelleHandle,
  onSaveVenmo,
  onSaveZelle,
}: PaymentHandlesCardProps) {
  const Colors = useColors();
  const styles = React.useMemo(() => makeStyles(Colors), [Colors]);

  const [showEditor, setShowEditor] = useState(false);
  const [venmoInput, setVenmoInput] = useState(venmoHandle || "");
  const [zelleInput, setZelleInput] = useState(zelleHandle || "");

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const trimmedVenmo = venmoInput.trim();
    const formattedVenmo = trimmedVenmo
      ? trimmedVenmo.startsWith("@")
        ? trimmedVenmo
        : `@${trimmedVenmo}`
      : "";
    onSaveVenmo(formattedVenmo);
    onSaveZelle(zelleInput.trim());
    setShowEditor(false);
  };

  const handleCancel = () => {
    setVenmoInput(venmoHandle || "");
    setZelleInput(zelleHandle || "");
    setShowEditor(false);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Handles</Text>
        {!showEditor && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEditor(true);
            }}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        )}
      </View>

      {showEditor ? (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Venmo Handle</Text>
            <TextInput
              style={styles.input}
              placeholder="@your-handle"
              placeholderTextColor={Colors.textMuted}
              value={venmoInput}
              onChangeText={setVenmoInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Zelle</Text>
            <TextInput
              style={styles.input}
              placeholder="email or phone"
              placeholderTextColor={Colors.textMuted}
              value={zelleInput}
              onChangeText={setZelleInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.handleRow}>
            <Text style={styles.handleLabel}>Venmo</Text>
            <Text style={venmoHandle ? styles.handleValue : styles.placeholder}>
              {venmoHandle || "Tap Edit to add"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.handleRow}>
            <Text style={styles.handleLabel}>Zelle</Text>
            <Text style={zelleHandle ? styles.handleValue : styles.placeholder}>
              {zelleHandle || "Tap Edit to add"}
            </Text>
          </View>

          <Text style={styles.note}>
            Partners can pay you with either option
          </Text>
        </>
      )}
    </Card>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginBottom: Spacing.md,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.sm,
    },
    title: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.text,
    },
    editText: {
      fontSize: Typography.labelSmall,
      color: Colors.textSecondary,
    },
    handleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: Spacing.sm,
      gap: Spacing.md,
    },
    handleLabel: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      ...Font.medium,
    },
    handleValue: {
      fontSize: Typography.bodyMedium,
      color: Colors.primary,
      ...Font.semibold,
    },
    placeholder: {
      fontSize: Typography.bodyMedium,
      color: Colors.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
    },
    note: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      marginTop: Spacing.sm,
    },
    inputGroup: {
      marginBottom: Spacing.md,
    },
    inputLabel: {
      fontSize: Typography.labelMedium,
      ...Font.medium,
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    input: {
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.md,
      padding: Spacing.md,
      fontSize: Typography.bodyMedium,
      color: Colors.text,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    cancelButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.backgroundCard,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    cancelText: {
      fontSize: Typography.labelMedium,
      ...Font.medium,
      color: Colors.textSecondary,
    },
    saveButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.primary,
    },
    saveText: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.text,
    },
  });
