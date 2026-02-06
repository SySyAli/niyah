import React, { useState } from "react";
import { Alert, View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../store/authStore";
import { signInWithGoogle, statusCodes } from "../config/firebase";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";

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
      const accessToken = await signInWithGoogle();
      await loginWithGoogle(accessToken);
      onSuccess?.();
    } catch (error: any) {
      // Don't show alerts for user-initiated cancellations
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled, do nothing
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Google Play Services Required",
          "Please install or update Google Play Services to sign in with Google.",
        );
      } else {
        console.error("Google Sign-In failed:", error);
        Alert.alert(
          "Sign In Failed",
          error.message || "Unable to sign in with Google. Please try again.",
        );
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4285F4" />
      </View>
    );
  }

  return (
    <GoogleSigninButton
      size={GoogleSigninButton.Size.Wide}
      color={GoogleSigninButton.Color.Dark}
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
});

export default GoogleSignInButton;
