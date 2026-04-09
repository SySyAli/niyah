import { useEffect, type ComponentProps, type ReactElement } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BaseFontFamily } from "../src/constants/colors";
import { useColors } from "../src/hooks/useColors";
import { useThemeStore } from "../src/store/themeStore";
import { useAuthStore } from "../src/store/authStore";
import { isEmailSignInLink } from "../src/config/firebase";
import { DEMO_MODE, PENDING_REFERRAL_KEY } from "../src/constants/config";
import { logger } from "../src/utils/logger";
import { initializeSslPinning } from "../src/config/sslPinning";

// Set in .env as EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
// Use pk_test_... for development, pk_live_... for production
const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

// Lazily import StripeProvider only when Stripe is active (non-demo mode + key present).
// This prevents crashes on dev client builds that don't yet have the native Stripe module linked.
type StripeWrapperProps = ComponentProps<
  typeof import("@stripe/stripe-react-native").StripeProvider
>;

const FallbackStripeWrapper = ({ children }: StripeWrapperProps) => (
  <>{children}</>
);

let StripeWrapper: (props: StripeWrapperProps) => ReactElement | null =
  FallbackStripeWrapper;

if (!DEMO_MODE && STRIPE_PK) {
  try {
    StripeWrapper = (
      require("@stripe/stripe-react-native") as typeof import("@stripe/stripe-react-native")
    ).StripeProvider;
  } catch (error) {
    logger.warn("Stripe SDK unavailable in this build:", error);
  }

  // Pre-warm heavy native modules at app startup. Without this, the first
  // navigation to deposit/withdraw triggers a synchronous require() that
  // blocks the JS thread mid-modal-animation, leaving a black screen and
  // sometimes crashing before the screen finishes mounting.
  try {
    require("react-native-plaid-link-sdk");
  } catch (error) {
    logger.warn("Plaid SDK unavailable in this build:", error);
  }
}

// Apply SF Pro Rounded globally as the default font family
if (Platform.OS === "ios" && BaseFontFamily) {
  type WithDefaultStyle = {
    defaultProps?: { style?: { fontFamily?: string } };
  };
  const textStyle = { fontFamily: BaseFontFamily };
  (Text as unknown as WithDefaultStyle).defaultProps = {
    ...((Text as unknown as WithDefaultStyle).defaultProps || {}),
    style: textStyle,
  };
  (TextInput as unknown as WithDefaultStyle).defaultProps = {
    ...((TextInput as unknown as WithDefaultStyle).defaultProps || {}),
    style: textStyle,
  };
}

export default function RootLayout() {
  const Colors = useColors();
  const theme = useThemeStore((s) => s.theme);
  const { completeEmailLink } = useAuthStore();

  // Initialize SSL certificate pinning (no-op in __DEV__ mode)
  useEffect(() => {
    initializeSslPinning();
  }, []);

  // Handle deep links for email magic link sign-in and referral invites
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (await isEmailSignInLink(url)) {
        try {
          await completeEmailLink(url);
        } catch (error) {
          logger.error("Error completing email link sign-in:", error);
        }
        return;
      }

      const parsed = Linking.parse(url);
      const referrerUid = parsed.queryParams?.ref;
      // Validate referrer UID: must be a non-empty string matching Firebase
      // UID format (alphanumeric, 1-128 chars). Prevents storing arbitrary
      // data from malicious deep links.
      if (
        referrerUid &&
        typeof referrerUid === "string" &&
        /^[a-zA-Z0-9]{1,128}$/.test(referrerUid)
      ) {
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
    <StripeWrapper
      publishableKey={STRIPE_PK}
      merchantIdentifier="merchant.com.niyah.app"
      urlScheme="niyah"
    >
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: Colors.background }}
      >
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
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
    </StripeWrapper>
  );
}
