import { Stack } from "expo-router";
import { useColors } from "../../src/hooks/useColors";

export default function AuthLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "fade",
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth-entry" />
      <Stack.Screen name="check-email" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
