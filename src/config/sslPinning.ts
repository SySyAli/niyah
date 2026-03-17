/**
 * SSL Certificate Pinning for Cloud Functions endpoint.
 *
 * Only the Cloud Functions endpoint needs pinning because it uses JS `fetch()`.
 * Firebase Auth/Firestore and Stripe use native SDKs with their own built-in
 * certificate validation that bypasses React Native's networking layer.
 *
 * Pin hashes are derived from the server's PUBLIC key (safe to publish).
 * Pinned to intermediate CA (WE2) and root CA (GTS Root R4), NOT the leaf
 * cert, since Google rotates leaf certs frequently.
 *
 * To refresh pin hashes if Google rotates their CA chain, replace
 * <YOUR_PROJECT_ID> with the Firebase project ID and run:
 *    openssl s_client -showcerts -connect us-central1-<YOUR_PROJECT_ID>.cloudfunctions.net:443 \
 *      -servername us-central1-<YOUR_PROJECT_ID>.cloudfunctions.net 2>/dev/null \
 *      | openssl x509 -pubkey -noout \
 *      | openssl pkey -pubin -outform der \
 *      | openssl dgst -sha256 -binary \
 *      | openssl enc -base64
 *
 * After updating hashes, rebuild the dev client: pnpm build:local
 *
 * IMPORTANT: Set an expirationDate as a safety valve. If pins expire, the library
 * degrades to normal TLS rather than bricking the app.
 *
 * NOTE: expo-dev-client's network inspector conflicts with TrustKit on iOS.
 * If using expo-build-properties, set { ios: { networkInspector: false } }.
 */

import { Platform } from "react-native";

// Only initialize pinning in production builds on real devices.
// In __DEV__ mode, pinning interferes with debugging tools and proxies.
declare const __DEV__: boolean;

const FUNCTIONS_HOST = `us-central1-${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

/**
 * Initialize SSL pinning for the Cloud Functions endpoint.
 * Call this once at app startup, BEFORE any fetch() calls to the endpoint.
 *
 * No-op in development builds or if the pinning library is unavailable.
 */
export async function initializeSslPinning(): Promise<void> {
  // Skip in development — pinning interferes with debugging proxies (Charles, Proxyman)
  if (__DEV__) return;

  // Skip on web (not applicable)
  if (Platform.OS === "web") return;

  try {
    const {
      initializeSslPinning: init,
    } = require("react-native-ssl-public-key-pinning");

    await init({
      [FUNCTIONS_HOST]: {
        includeSubdomains: false,
        publicKeyHashes: [
          // Pin to intermediate + root CAs (NOT the leaf cert, which Google rotates).
          // Intermediate: Google Trust Services WE2 (issues the leaf cert)
          "vh78KSg1Ry4NaqGDV10w/cTb9VH3BQUZoCWNa93W/EY=",
          // Root: GTS Root R4 (backup — survives intermediate rotation)
          "mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c=",
        ],
        // Safety valve: if pins expire, degrade to normal TLS rather than
        // bricking the app. Set this to ~1 year from now and rotate before expiry.
        expirationDate: "2027-01-01",
      },
    });
  } catch {
    // Library not linked or initialization failed — degrade to normal TLS.
    // This is acceptable: pinning is defense-in-depth, not the primary security layer.
  }
}
