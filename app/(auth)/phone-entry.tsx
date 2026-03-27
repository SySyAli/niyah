import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
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
import { useAuthStore } from "../../src/store/authStore";
import { logger } from "../../src/utils/logger";

export default function PhoneEntryScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { sendPhoneCode, isLoading } = useAuthStore();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const digits = phone.replace(/\D/g, "").slice(0, 10);
  const isValid = digits.length === 10;

  // Format phone as user types: (xxx) xxx-xxxx
  const formatDisplay = (raw: string): string => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  const handleNext = async () => {
    if (!isValid) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setError("");
    const e164 = `+1${digits}`;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendPhoneCode(e164);
      router.push({
        pathname: "/(auth)/verify-phone",
        params: { phone: e164 },
      });
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      logger.error("Phone verification error:", e);
      if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (err?.code === "auth/invalid-phone-number") {
        setError("Invalid phone number. Please check and try again.");
      } else {
        setError(err?.message || "Failed to send verification code.");
      }
    }
  };

  return (
    <AuthScreenScaffold
      title={"Enter your\nphone number"}
      subtitle="We'll send you a verification code"
    >
      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Phone input */}
      <View style={styles.phoneSection}>
        <View style={styles.phoneRow}>
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>+1</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="(555) 123-4567"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            value={formatDisplay(phone)}
            onChangeText={(text) => {
              setPhone(text.replace(/\D/g, ""));
              setError("");
            }}
            maxLength={14}
            autoFocus
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!isLoading}
          />
        </View>

        <Button
          title="Next"
          onPress={handleNext}
          disabled={!isValid || isLoading}
          loading={isLoading}
          size="large"
        />
      </View>
    </AuthScreenScaffold>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    errorContainer: {
      backgroundColor: "rgba(220, 38, 38, 0.1)",
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: "rgba(220, 38, 38, 0.2)",
    },
    errorText: {
      color: Colors.danger,
      fontSize: Typography.bodySmall,
      textAlign: "center",
    },
    phoneSection: {
      gap: Spacing.lg,
    },
    phoneRow: {
      flexDirection: "row",
      gap: Spacing.sm,
    },
    prefixBox: {
      height: 56,
      paddingHorizontal: Spacing.lg,
      backgroundColor: Colors.backgroundSecondary,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    prefixText: {
      fontSize: 20,
      ...Font.semibold,
      color: Colors.text,
    },
    phoneInput: {
      flex: 1,
      height: 56,
      backgroundColor: Colors.backgroundCard,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg,
      fontSize: 20,
      ...Font.medium,
      color: Colors.text,
      borderWidth: 1,
      borderColor: Colors.border,
    },
  });
