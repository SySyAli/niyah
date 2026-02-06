import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

// Check if Google auth is configured for the current platform
const googleAuthConfigured =
  (Platform.OS === "android" && !!GOOGLE_CLIENT_IDS.androidClientId) ||
  (Platform.OS === "ios" && !!GOOGLE_CLIENT_IDS.iosClientId) ||
  (Platform.OS === "web" && !!GOOGLE_CLIENT_IDS.webClientId);

// Hook for Google authentication
export const useGoogleAuth = () => {
  const redirectUri = makeRedirectUri({
    scheme: "niyah",
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    // Use webClientId as a fallback so the hook doesn't throw when
    // a platform-specific client ID is missing.
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId || GOOGLE_CLIENT_IDS.webClientId,
    androidClientId:
      GOOGLE_CLIENT_IDS.androidClientId || GOOGLE_CLIENT_IDS.webClientId,
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
  });

  return {
    request,
    response,
    promptAsync,
    // Only mark as ready when the platform's actual client ID is configured
    isReady: !!request && googleAuthConfigured,
  };
};

// Extract user info from Google token
export const getGoogleUserInfo = async (accessToken: string) => {
  try {
    const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Google user info:", error);
    throw error;
  }
};

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}
