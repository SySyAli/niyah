import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, BaseFontFamily } from "../src/constants/colors";
import { useAuthStore } from "../src/store/authStore";
import { isEmailSignInLink } from "../src/config/firebase";
import { PENDING_REFERRAL_KEY } from "../src/constants/config";

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

  // Handle deep links for email magic link sign-in and referral invites
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (isEmailSignInLink(url)) {
        try {
          await completeEmailLink(url);
        } catch (error) {
          console.error("Error completing email link sign-in:", error);
        }
        return;
      }

      const parsed = Linking.parse(url);
      const referrerUid = parsed.queryParams?.ref;
      if (referrerUid && typeof referrerUid === "string") {
        await AsyncStorage.setItem(PENDING_REFERRAL_KEY, referrerUid);
      }
    };

    // Handle link that cold-started the app
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) await handleUrl(initialUrl);
    };

    handleInitialURL();

    // Handle links while the app is already open
    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
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
        <Stack.Screen
          name="invite"
          options={{
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="user/[uid]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
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
