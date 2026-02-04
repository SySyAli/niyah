import { Stack } from "expo-router";
import { Colors } from "../../src/constants/colors";

export default function SessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="select" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="active" options={{ gestureEnabled: false }} />
      <Stack.Screen name="surrender" options={{ presentation: "modal" }} />
      <Stack.Screen name="complete" options={{ gestureEnabled: false }} />
      <Stack.Screen name="deposit" options={{ presentation: "modal" }} />
      <Stack.Screen name="withdraw" options={{ presentation: "modal" }} />
    </Stack>
  );
}
