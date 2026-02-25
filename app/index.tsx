import { useEffect, useMemo, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../src/store/authStore";
import { useColors } from "../src/hooks/useColors";

export default function Index() {
  const Colors = useColors();
  const { isAuthenticated, isInitialized, profileComplete, initialize } =
    useAuthStore();
  const [ready, setReady] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: {
          flex: 1,
          backgroundColor: Colors.background,
          justifyContent: "center",
          alignItems: "center",
        },
      }),
    [Colors],
  );

  useEffect(() => {
    const unsubscribe = initialize();
    const timer = setTimeout(() => setReady(true), 100);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (!isInitialized || !ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!profileComplete) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  return <Redirect href="/(tabs)" />;
}
