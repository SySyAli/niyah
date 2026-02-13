import { Stack } from "expo-router";
import { Colors } from "../../src/constants/colors";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
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
