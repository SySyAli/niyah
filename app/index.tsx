import { useEffect, useMemo, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../src/store/authStore";
import { useColors } from "../src/hooks/useColors";
import { LegalAcceptanceOverlay } from "../src/components";
import { logger } from "../src/utils/logger";

export default function Index() {
  const Colors = useColors();
  const {
    isAuthenticated,
    isInitialized,
    profileComplete,
    hasAcceptedCurrentLegal,
    acceptLegal,
    initialize,
  } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [legalLoading, setLegalLoading] = useState(false);

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
  }, [initialize]);

  const handleAcceptLegal = async () => {
    setLegalLoading(true);
    try {
      await acceptLegal();
    } catch (error) {
      logger.error("Legal acceptance error:", error);
    } finally {
      setLegalLoading(false);
    }
  };

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

  // Legal gate: authenticated users who haven't accepted current legal version
  // see a non-dismissible overlay before proceeding to tabs.
  if (!hasAcceptedCurrentLegal) {
    return (
      <View style={styles.loading}>
        <LegalAcceptanceOverlay
          visible={true}
          onAccept={handleAcceptLegal}
          loading={legalLoading}
        />
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}
