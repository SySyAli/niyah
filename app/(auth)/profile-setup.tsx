import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  FontWeight,
  Font,
} from "../../src/constants/colors";
import { Button } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { usePartnerStore } from "../../src/store/partnerStore";
import { PENDING_REFERRAL_KEY } from "../../src/constants/config";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { firebaseUser, completeProfile, isLoading } = useAuthStore();
  const { applyReferralBonus } = usePartnerStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  // Pre-fill from Firebase user data (Google/Apple may provide a name)
  useEffect(() => {
    if (firebaseUser?.displayName) {
      const parts = firebaseUser.displayName.split(" ");
      if (parts.length >= 2) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      } else if (parts.length === 1) {
        setFirstName(parts[0]);
      }
    }
  }, [firebaseUser]);

  const email = firebaseUser?.email || "";
  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0;

  // Format phone number as user types: (xxx) xxx-xxxx
  const formatPhoneDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
  };

  const handleContinue = async () => {
    if (!canContinue) {
      setError("Please enter your first and last name");
      return;
    }

    setError("");
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone || undefined,
      });

      // Apply referral bonus if this user was invited via a deep link
      const referrerUid = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
      if (referrerUid) {
        await applyReferralBonus(referrerUid);
        await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to main app (or Stripe connect in PR 3)
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error("Profile setup error:", e);
      setError(err?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete your{"\n"}profile</Text>
            <Text style={styles.subtitle}>
              Just a few details to get you started
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={Colors.textMuted}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  setError("");
                }}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="given-name"
                textContentType="givenName"
                autoFocus
              />
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={Colors.textMuted}
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  setError("");
                }}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="family-name"
                textContentType="familyName"
              />
            </View>

            {/* Email (locked) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.lockedInputContainer}>
                <TextInput
                  style={[styles.input, styles.lockedInput]}
                  value={email}
                  editable={false}
                  selectTextOnFocus={false}
                />
                <Text style={styles.lockIcon}>{"\uD83D\uDD12"}</Text>
              </View>
            </View>

            {/* Phone (optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Phone Number</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+1</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={formatPhoneDisplay(phone)}
                  onChangeText={handlePhoneChange}
                  maxLength={14}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                />
              </View>
            </View>
          </View>

          {/* Continue button */}
          <View style={styles.buttonContainer}>
            <Button
              title="Continue"
              onPress={handleContinue}
              disabled={!canContinue || isLoading}
              loading={isLoading}
              size="large"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 36,
    ...Font.heavy,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
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
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: Typography.labelLarge,
    ...Font.medium,
    color: Colors.text,
  },
  optional: {
    fontSize: Typography.labelSmall,
    color: Colors.textMuted,
  },
  input: {
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
  lockedInputContainer: {
    position: "relative",
  },
  lockedInput: {
    color: Colors.textMuted,
    backgroundColor: Colors.backgroundSecondary,
  },
  lockIcon: {
    position: "absolute",
    right: Spacing.lg,
    top: 0,
    bottom: 0,
    textAlignVertical: "center",
    lineHeight: 56,
    fontSize: 16,
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
  },
  buttonContainer: {
    marginTop: Spacing.xxl,
  },
});
