import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

// Hook for Google authentication
export const useGoogleAuth = () => {
  const redirectUri = makeRedirectUri({
    scheme: "niyah",
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
    androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
  });

  return {
    request,
    response,
    promptAsync,
    isReady: !!request,
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
