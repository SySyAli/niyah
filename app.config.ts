/**
 * Dynamic Expo config — replaces app.json so project-specific identifiers
 * (Firebase project ID, Google OAuth client IDs) come from .env rather than
 * being hardcoded in source control.
 *
 * See .env.example for required environment variables.
 */

function env(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(
    `Missing required env var: ${name}. Copy .env.example to .env and fill in values.`,
  );
}

const firebaseProjectId = env("EXPO_PUBLIC_FIREBASE_PROJECT_ID");
const googleIosClientId = env("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID");
// iosUrlScheme needs just the numeric ID (e.g. "714...-42pm..."), not the full
// "714...-42pm....apps.googleusercontent.com" form stored in the env var.
const googleIosShortId = googleIosClientId.replace(
  /\.apps\.googleusercontent\.com$/,
  "",
);

export default {
  expo: {
    name: "Niyah",
    slug: "niyah",
    owner: "niyah-app",
    version: "1.0.0",
    scheme: "niyah",
    orientation: "portrait" as const,
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark" as const,
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain" as const,
      backgroundColor: "#1A1714",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.niyah.app",
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST ||
        "./firebase/GoogleService-Info.plist",
      usesAppleSignIn: true,
      associatedDomains: [`applinks:${firebaseProjectId}.firebaseapp.com`],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSContactsUsageDescription:
          "Niyah uses your contacts to invite friends to focus sessions.",
      },
    },
    android: {
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./firebase/google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1A1714",
      },
      package: "com.niyah.app",
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: `${firebaseProjectId}.firebaseapp.com`,
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro" as const,
    },
    plugins: [
      "expo-router",
      "react-native-bottom-tabs",
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: `com.googleusercontent.apps.${googleIosShortId}`,
        },
      ],
      "expo-apple-authentication",
      "expo-contacts",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.niyah.app",
          enableGooglePay: false,
        },
      ],
      "./plugins/withFollyCoroutinesFix",
      "./plugins/withGoogleServicesPlist",
      "./plugins/withGoogleServicesJson",
      "./plugins/withFirebaseStaticFrameworks",
      "./plugins/withScreenTimeEntitlement",
      "./plugins/withDeviceActivityMonitor",
      "./plugins/withShieldExtensions",
    ],
    experiments: {
      typedRoutes: true,
    },
    nativeModulesDir: "modules",
    extra: {
      router: {},
      eas: {
        projectId: "dea6379a-e2c1-4e15-8d7e-3dc25f03b59b",
      },
    },
  },
};
