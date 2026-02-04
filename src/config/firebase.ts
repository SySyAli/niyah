import { firebase } from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Initialize Google Sign-In
// You'll get this webClientId from Firebase Console > Authentication > Sign-in method > Google
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  });
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    // Check if device supports Google Play
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Get the user's ID token
    const signInResult = await GoogleSignin.signIn();

    // Get the id token
    const idToken = signInResult.data?.idToken;
    if (!idToken) {
      throw new Error("No ID token found");
    }

    // Create a Google credential with the token
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Sign-in the user with the credential
    const userCredential = await auth().signInWithCredential(googleCredential);

    return userCredential.user;
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    await GoogleSignin.signOut();
    await auth().signOut();
  } catch (error) {
    console.error("Sign-Out Error:", error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth().currentUser;
};

// Auth state listener
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth().onAuthStateChanged(callback);
};

export { auth, firebase };
