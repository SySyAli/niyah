import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  FontWeight,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import { Button } from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";

export default function CheckEmailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { sendEmailLink, isLoading } = useAuthStore();

  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start cooldown on mount
  useEffect(() => {
    startCooldown();
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setResendCooldown(60);
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

  const handleOpenMail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") {
      Linking.openURL("message://");
    } else {
      // Android: open email app chooser
      Linking.openURL("mailto:");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendEmailLink(email);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startCooldown();
    } catch (error) {
      console.error("Resend error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back button */}
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"}</Text>
        </Pressable>

        <View style={styles.body}>
          {/* Mail icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.mailIcon}>{"\u2709"}</Text>
          </View>

          {/* Header */}
          <Text style={styles.title}>Check your{"\n"}inbox</Text>
          <Text style={styles.subtitle}>We sent a sign-in link to</Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.instructions}>
            Tap the link in your email to continue.{"\n"}
            It may take a moment to arrive.
          </Text>

          {/* Open Mail button */}
          <Button title="Open Mail App" onPress={handleOpenMail} size="large" />

          {/* Resend */}
          <Pressable
            onPress={handleResend}
            disabled={resendCooldown > 0 || isLoading}
            style={styles.resendButton}
          >
            <Text
              style={[
                styles.resendText,
                resendCooldown > 0 && styles.resendDisabled,
              ]}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend link"}
            </Text>
          </Pressable>

          {/* Try different email */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.differentButton}
          >
            <Text style={styles.differentText}>Try a different email</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backButton: {
    marginBottom: Spacing.xl,
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  backText: {
    color: Colors.text,
    fontSize: 24,
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  mailIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    ...Font.heavy,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  email: {
    fontSize: Typography.bodyLarge,
    ...Font.bold,
    color: Colors.primary,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  instructions: {
    fontSize: Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
    textAlign: "center",
    lineHeight: Typography.bodySmall * 1.6,
  },
  resendButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resendText: {
    color: Colors.primary,
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
  },
  resendDisabled: {
    color: Colors.textMuted,
    ...Font.regular,
  },
  differentButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  differentText: {
    color: Colors.textSecondary,
    fontSize: Typography.bodySmall,
  },
});
