import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import { Colors, BaseFontFamily } from "../src/constants/colors";
import { useAuthStore } from "../src/store/authStore";
import { isEmailSignInLink } from "../src/config/firebase";

// Apply SF Pro Rounded globally as the default font family
if (Platform.OS === "ios" && BaseFontFamily) {
  const textStyle = { fontFamily: BaseFontFamily };
  (Text as any).defaultProps = {
    ...((Text as any).defaultProps || {}),
    style: textStyle,
  };
  (TextInput as any).defaultProps = {
    ...((TextInput as any).defaultProps || {}),
    style: textStyle,
  };
}

export default function RootLayout() {
  const { completeEmailLink } = useAuthStore();

  // Handle deep links for email magic link sign-in
  useEffect(() => {
    // Handle link that opened the app
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && isEmailSignInLink(initialUrl)) {
        try {
          await completeEmailLink(initialUrl);
        } catch (error) {
          console.error("Error completing email link sign-in:", error);
        }
      }
    };

    handleInitialURL();

    // Handle links while the app is open
    const subscription = Linking.addEventListener("url", async (event) => {
      if (isEmailSignInLink(event.url)) {
        try {
          await completeEmailLink(event.url);
        } catch (error) {
          console.error("Error completing email link sign-in:", error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [completeEmailLink]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="session"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
