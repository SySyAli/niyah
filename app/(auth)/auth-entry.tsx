import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import {
  Button,
  AuthScreenScaffold,
  LegalContentView,
} from "../../src/components";
import { useAuthStore } from "../../src/store/authStore";
import { generateNonce, sha256 } from "../../src/config/firebase";
import { logger } from "../../src/utils/logger";
import {
  getErrorMessage,
  isUserCancellationError,
} from "../../src/utils/errors";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const GoogleIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function AuthEntryScreen() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { loginWithGoogle, loginWithApple, isLoading } = useAuthStore();

  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);

  // ── Google Sign-In ──
  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await loginWithGoogle();

      // Route based on whether profile is complete
      const state = useAuthStore.getState();
      if (state.isNewUser || !state.profileComplete) {
        router.replace("/(auth)/profile-setup");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: unknown) {
      if (!isUserCancellationError(e)) {
        logger.error("Google Sign-In error:", e);
        setError(
          getErrorMessage(e, "Google Sign-In failed. Please try again."),
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Apple Sign-In ──
  const handleApple = async () => {
    setError("");
    setAppleLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 1. Generate a cryptographic nonce
      const rawNonce = await generateNonce();
      // 2. SHA-256 hash it — Apple receives the hash, Firebase gets the raw
      const hashedNonce = await sha256(rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple Sign-In failed: no identity token received");
      }

      const name = credential.fullName
        ? `${credential.fullName.givenName ?? ""} ${credential.fullName.familyName ?? ""}`.trim()
        : undefined;

      // 3. Pass raw nonce (not hashed) to Firebase via the store
      await loginWithApple(
        credential.identityToken,
        rawNonce,
        name || undefined,
        credential.email || undefined,
      );

      const state = useAuthStore.getState();
      if (state.isNewUser || !state.profileComplete) {
        router.replace("/(auth)/profile-setup");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: unknown) {
      if (!isUserCancellationError(e)) {
        logger.error("Apple Sign-In error:", e);
        setError(getErrorMessage(e, "Apple Sign-In failed. Please try again."));
      }
    } finally {
      setAppleLoading(false);
    }
  };

  // ── Email Magic Link ──
  const anyLoading = isLoading || googleLoading || appleLoading;

  return (
    <AuthScreenScaffold
      title={"Save your\nprogress"}
      subtitle={"Let's get started on your focus journey."}
      footer={
        <View style={styles.footerContainer}>
          <Text style={styles.privacyNote}>
            Your sensitive data is protected by Apple{"\n"}and never leaves your
            device
          </Text>
          <Text style={styles.footerText}>
            By continuing, you agree to our{" "}
            <Text
              style={styles.footerLink}
              onPress={() => setLegalModalVisible(true)}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={styles.footerLink}
              onPress={() => setLegalModalVisible(true)}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      }
    >
      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Phone number — primary sign-in */}
      <Pressable
        style={({ pressed }) => [
          styles.phoneButton,
          pressed && styles.socialButtonPressed,
          anyLoading && styles.socialButtonDisabled,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/(auth)/phone-entry");
        }}
        disabled={anyLoading}
      >
        <Text style={styles.phoneButtonPrefix}>+1</Text>
        <Text style={styles.phoneButtonPlaceholder}>Phone Number</Text>
      </Pressable>

      <Button
        title="Next"
        onPress={() => router.push("/(auth)/phone-entry")}
        disabled={anyLoading}
        size="large"
      />

      {/* OR divider */}
      <View style={styles.orDivider}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      {/* Apple + Google */}
      <View style={styles.socialSection}>
        {/* Apple — custom button to match Google style */}
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            pressed && styles.socialButtonPressed,
            anyLoading && styles.socialButtonDisabled,
          ]}
          onPress={handleApple}
          disabled={anyLoading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          {appleLoading ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <Text style={styles.appleIcon}>{"\uF8FF"}</Text>
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </>
          )}
        </Pressable>

        {/* Google */}
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            pressed && styles.socialButtonPressed,
            anyLoading && styles.socialButtonDisabled,
          ]}
          onPress={handleGoogle}
          disabled={anyLoading}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Read-only legal modal */}
      <Modal
        visible={legalModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={styles.legalModal}>
          <View style={styles.legalModalHeader}>
            <Pressable onPress={() => setLegalModalVisible(false)}>
              <Text style={styles.legalModalClose}>Done</Text>
            </Pressable>
          </View>
          <LegalContentView section="both" />
        </View>
      </Modal>
    </AuthScreenScaffold>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    phoneButton: {
      flexDirection: "row",
      alignItems: "center",
      height: 56,
      borderRadius: Radius.lg,
      backgroundColor: Colors.backgroundCard,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: Spacing.lg,
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    phoneButtonPrefix: {
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
      color: Colors.text,
    },
    phoneButtonPlaceholder: {
      fontSize: Typography.bodyLarge,
      color: Colors.textMuted,
    },
    socialSection: {
      gap: Spacing.md,
    },
    socialButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 56,
      borderRadius: Radius.lg,
      backgroundColor: Colors.backgroundCard,
      borderWidth: 1,
      borderColor: Colors.border,
      gap: Spacing.md,
    },
    socialButtonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    socialButtonDisabled: {
      opacity: 0.5,
    },
    socialButtonText: {
      fontSize: Typography.bodyLarge,
      ...Font.medium,
      color: Colors.text,
    },
    appleIcon: {
      fontSize: 22,
      color: Colors.text,
    },
    orDivider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: Spacing.lg,
    },
    orLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: Colors.border,
    },
    orText: {
      fontSize: Typography.bodySmall,
      color: Colors.textMuted,
      marginHorizontal: Spacing.lg,
    },
    footerContainer: {
      gap: Spacing.sm,
    },
    privacyNote: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      textAlign: "center",
      lineHeight: Typography.labelSmall * 1.6,
    },
    footerText: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      textAlign: "center",
      lineHeight: Typography.labelSmall * 1.6,
    },
    footerLink: {
      color: Colors.textSecondary,
      textDecorationLine: "underline",
    },
    legalModal: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    legalModalHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    legalModalClose: {
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
      color: Colors.primary,
    },
  });
