import React, { useEffect, useState } from "react";
import { Alert, View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useGoogleAuth } from "../config/firebase";
import {
  GoogleSignin,
  statusCodes,
  GoogleSigninButton,
} from "@react-native-google-signin/google-signin";
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
  const { response, promptAsync, isReady } = useGoogleAuth();

  // Handle the auth response
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleLogin(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      setIsLoading(false);
      Alert.alert(
        "Sign In Failed",
        response.error?.message || "Unable to sign in with Google.",
      );
      onError?.(new Error(response.error?.message || "Google sign in failed"));
    } else if (response?.type === "dismiss") {
      setIsLoading(false);
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken: string) => {
    try {
      await loginWithGoogle(accessToken);
      onSuccess?.();
    } catch (error: any) {
      console.error("Google Sign-In failed:", error);
      Alert.alert(
        "Sign In Failed",
        error.message || "Unable to sign in with Google. Please try again.",
      );
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    if (!isReady) {
      Alert.alert("Please wait", "Google Sign-In is initializing...");
      return;
    }

    setIsLoading(true);
    try {
      await promptAsync();
    } catch (error: any) {
      setIsLoading(false);
      console.error("Prompt error:", error);
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
      disabled={!isReady}
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
