import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "../src/hooks/useColors";
import { useAuthStore } from "../src/store/authStore";
import { Typography, Spacing, Font } from "../src/constants/colors";
import { logger } from "../src/utils/logger";

export default function NotFoundScreen() {
  const Colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);
  const profileComplete = useAuthStore((s) => s.profileComplete);

  useEffect(() => {
    logger.warn("Unmatched route — redirecting", params);
    const t = setTimeout(() => {
      if (user) {
        router.replace(profileComplete ? "/(tabs)" : "/(auth)/profile-setup");
      } else {
        router.replace("/(auth)/auth-entry");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [user, profileComplete, router, params]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Text style={[styles.text, { color: Colors.text }]}>Redirecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: Typography.bodyLarge, ...Font.medium },
});
