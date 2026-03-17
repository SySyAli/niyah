/**
 * Cryptographically secure ID generation.
 *
 * Replaces Math.random()-based IDs across the codebase. Math.random() is
 * not cryptographically secure and has collision risk — unsuitable for
 * session IDs, transaction IDs, and other identifiers used in financial
 * operations or as Firestore document keys.
 *
 * Uses expo-crypto (backed by iOS SecRandomCopyBytes / Android
 * SecureRandom) for production-quality randomness.
 */

import * as Crypto from "expo-crypto";

/**
 * Generate a cryptographically secure random ID string.
 *
 * @param length Number of random bytes (default 16 = 32 hex chars).
 *               Collision probability with 16 bytes is ~1 in 2^128.
 * @returns Hex-encoded random string (lowercase, 2× length chars).
 */
export const generateId = (length: number = 16): string => {
  // expo-crypto.getRandomBytes is synchronous (backed by native SecRandom)
  const bytes = Crypto.getRandomBytes(length);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
