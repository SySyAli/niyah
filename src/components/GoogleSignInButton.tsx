import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Colors, Spacing, Typography, Radius } from "../constants/colors";
import { useAuthStore } from "../store/authStore";

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handlePress = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (error: any) {
      console.error("Google Sign-In failed:", error);

      // Handle specific error codes
      if (error.code === "SIGN_IN_CANCELLED") {
        // User cancelled, don't show error
        setIsLoading(false);
        return;
      }

      Alert.alert(
        "Sign In Failed",
        error.message || "Unable to sign in with Google. Please try again.",
      );
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.text} />
      ) : (
        <>
          <View style={styles.iconContainer}>
            <GoogleIcon />
          </View>
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// Simple Google "G" icon using shapes
const GoogleIcon = () => (
  <View style={googleIconStyles.container}>
    <Text style={googleIconStyles.letter}>G</Text>
  </View>
);

const googleIconStyles = StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  letter: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4285F4",
  },
});

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  text: {
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    color: Colors.text,
  },
});

export default GoogleSignInButton;
