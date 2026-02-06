import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";

// Configure Google Sign-In with the web client ID.
// The native SDK uses this to get an ID token. On Android, it automatically
// matches the Android OAuth client ID registered in Google Cloud Console
// via the app's package name + SHA-1 signing certificate.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
});

// Sign in with Google using the native SDK.
// Returns an access token (via getTokens) for fetching user info.
export const signInWithGoogle = async (): Promise<string> => {
  // Check if Play Services are available (Android only, no-op on iOS)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error("Google Sign-In was cancelled");
  }

  // Get the access token
  const tokens = await GoogleSignin.getTokens();
  if (!tokens.accessToken) {
    throw new Error("Failed to get access token from Google");
  }

  return tokens.accessToken;
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Google Sign-Out error:", error);
  }
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

export { statusCodes };

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}
