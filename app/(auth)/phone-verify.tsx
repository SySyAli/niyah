import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Button } from "../../src/components";
import { OTPInput } from "../../src/components/OTPInput";
import { useAuthStore } from "../../src/store/authStore";

type Step = "phone" | "otp";

export default function PhoneVerifyScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const phoneInputRef = useRef<TextInput>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Direction for animated transitions
  const [transitionDirection, setTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");

  // Fade progress for the content area
  const contentOpacity = useSharedValue(1);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Format phone number as user types: (xxx) xxx-xxxx
  const formatPhoneDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const rawDigits = phoneNumber.replace(/\D/g, "");
  const isPhoneValid = rawDigits.length === 10;

  // Start the resend cooldown timer
  const startCooldown = useCallback(() => {
    setResendCooldown(30);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const handleSendCode = async () => {
    if (!isPhoneValid) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    // Mock sending OTP
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSending(false);
    setTransitionDirection("forward");

    // Animate transition
    contentOpacity.value = withTiming(0, { duration: 150 }, () => {
      contentOpacity.value = withTiming(1, { duration: 250 });
    });

    setTimeout(() => {
      setStep("otp");
      startCooldown();
    }, 150);
  };

  const handleVerify = async () => {
    if (otpValue.length !== 6) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVerifying(true);
    setOtpError(false);

    try {
      // For demo: accept any 6-digit code
      await useAuthStore.getState().verifyPhone(rawDigits);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch {
      setOtpError(true);
      setOtpValue("");
      setIsVerifying(false);
      Alert.alert("Verification Failed", "Invalid code. Please try again.");
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOtpValue("");
    setOtpError(false);
    startCooldown();

    // Mock resend
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const handleBackToPhone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTransitionDirection("backward");

    contentOpacity.value = withTiming(0, { duration: 150 }, () => {
      contentOpacity.value = withTiming(1, { duration: 250 });
    });

    setTimeout(() => {
      setStep("phone");
      setOtpValue("");
      setOtpError(false);
    }, 150);
  };

  const handleOtpChange = (val: string) => {
    setOtpError(false);
    setOtpValue(val);
  };

  const handlePhoneChange = (text: string) => {
    // Extract only digits, max 10
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(digits);
  };

  const enteringAnim =
    transitionDirection === "forward"
      ? SlideInRight.duration(300)
      : SlideInLeft.duration(300);
  const exitingAnim =
    transitionDirection === "forward"
      ? SlideOutLeft.duration(200)
      : SlideOutRight.duration(200);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back button */}
          <TouchableOpacity
            onPress={step === "phone" ? () => router.back() : handleBackToPhone}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              {step === "phone" ? "Back" : "\u2190  Back"}
            </Text>
          </TouchableOpacity>

          <Animated.View style={contentStyle}>
            {step === "phone" ? (
              /* ─── Step 1: Phone Number ─── */
              <Animated.View
                key="phone-step"
                entering={enteringAnim}
                exiting={exitingAnim}
              >
                <View style={styles.header}>
                  <Text style={styles.title}>Verify your phone</Text>
                  <Text style={styles.subtitle}>
                    We'll send you a verification code
                  </Text>
                </View>

                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone number</Text>
                    <View style={styles.phoneRow}>
                      <View style={styles.prefixBox}>
                        <Text style={styles.prefixText}>+1</Text>
                      </View>
                      <TextInput
                        ref={phoneInputRef}
                        style={styles.phoneInput}
                        placeholder="(555) 123-4567"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="phone-pad"
                        value={formatPhoneDisplay(phoneNumber)}
                        onChangeText={handlePhoneChange}
                        maxLength={14} // formatted: (xxx) xxx-xxxx
                        autoFocus
                      />
                    </View>
                  </View>

                  <View style={styles.buttonContainer}>
                    <Button
                      title="Send Code"
                      onPress={handleSendCode}
                      disabled={!isPhoneValid}
                      loading={isSending}
                      size="large"
                    />
                  </View>
                </View>
              </Animated.View>
            ) : (
              /* ─── Step 2: OTP Verification ─── */
              <Animated.View
                key="otp-step"
                entering={enteringAnim}
                exiting={exitingAnim}
              >
                <View style={styles.header}>
                  <Text style={styles.title}>Enter verification code</Text>
                  <Text style={styles.subtitle}>
                    Sent to +1 {formatPhoneDisplay(phoneNumber)}
                  </Text>
                </View>

                <View style={styles.otpSection}>
                  <OTPInput
                    value={otpValue}
                    onChange={handleOtpChange}
                    length={6}
                    error={otpError}
                  />

                  <View style={styles.buttonContainer}>
                    <Button
                      title="Verify"
                      onPress={handleVerify}
                      disabled={otpValue.length !== 6}
                      loading={isVerifying}
                      size="large"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={resendCooldown > 0}
                    style={styles.resendButton}
                  >
                    <Text
                      style={[
                        styles.resendText,
                        resendCooldown > 0 && styles.resendDisabled,
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend code"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  backText: {
    color: Colors.primary,
    fontSize: Typography.titleSmall,
    fontWeight: "500",
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.headlineLarge,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.labelLarge,
    fontWeight: "500",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  prefixBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  prefixText: {
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.bodyLarge,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
  otpSection: {
    gap: Spacing.xl,
    alignItems: "center",
  },
  resendButton: {
    paddingVertical: Spacing.sm,
  },
  resendText: {
    color: Colors.primary,
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
  },
  resendDisabled: {
    color: Colors.textMuted,
    fontWeight: "400",
  },
});
