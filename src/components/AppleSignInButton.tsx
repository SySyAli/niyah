import React, { useState } from "react";
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuthStore } from "../store/authStore";
import { generateNonce, sha256 } from "../config/firebase";
import { Colors, Radius } from "../constants/colors";

interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  /** Render as compact circular icon button (for onboarding) */
  compact?: boolean;
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError,
  compact = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const loginWithApple = useAuthStore((state) => state.loginWithApple);

  const handlePress = async () => {
    setIsLoading(true);
    try {
      // Generate cryptographic nonce for Firebase verification
      const rawNonce = await generateNonce();
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

      await loginWithApple(
        credential.identityToken,
        rawNonce,
        name || undefined,
        credential.email || undefined,
      );
      onSuccess?.();
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") {
        // User cancelled — do nothing
      } else {
        console.error("Apple Sign-In failed:", error);
        Alert.alert(
          "Sign In Failed",
          error.message || "Unable to sign in with Apple. Please try again.",
        );
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Apple Sign-In is only available on iOS
  if (Platform.OS !== "ios") {
    return null;
  }

  if (isLoading) {
    return (
      <View style={compact ? styles.compactLoading : styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.text} />
      </View>
    );
  }

  if (compact) {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={28}
        style={styles.compactButton}
        onPress={handlePress}
      />
    );
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={Radius.md}
      style={styles.fullButton}
      onPress={handlePress}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  compactLoading: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
  },
  compactButton: {
    width: 56,
    height: 56,
  },
  fullButton: {
    width: "100%",
    height: 48,
  },
});

export default AppleSignInButton;
