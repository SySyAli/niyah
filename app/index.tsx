import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../src/store/authStore";
import { Colors } from "../src/constants/colors";

export default function Index() {
  const { isAuthenticated, isInitialized, profileComplete, initialize } =
    useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Initialize Firebase Auth listener
    const unsubscribe = initialize();

    // Give a brief moment for auth state to resolve
    const timer = setTimeout(() => setReady(true), 100);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Show loading while Firebase checks auth state
  if (!isInitialized || !ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Not authenticated → welcome/onboarding
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Authenticated but profile not complete → profile setup
  if (!profileComplete) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  // Fully authenticated → main app
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
