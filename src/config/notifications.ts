/**
 * FCM Push Notification setup for NIYAH.
 *
 * Handles:
 * - Permission request
 * - FCM token management (register/refresh/remove)
 * - Foreground message handling
 * - Background message handling
 * - Deep link navigation from notifications
 */

import messaging from "@react-native-firebase/messaging";
import { getAuth } from "@react-native-firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "@react-native-firebase/firestore";
import { Platform, Alert } from "react-native";
import { router, type Href } from "expo-router";
import { logger } from "../utils/logger";

const db = getFirestore();

// ─── Permission ─────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    logger.warn("Notification permission not granted");
  }

  return enabled;
}

// ─── Token Management ───────────────────────────────────────────────────────

/** Register the current device's FCM token in the user's Firestore doc. */
export async function registerFCMToken(): Promise<void> {
  try {
    const user = getAuth().currentUser;
    if (!user) return;

    // On iOS, must register for remote notifications first
    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    if (!token) return;

    // Store token in user doc (array of tokens for multi-device support)
    await setDoc(
      doc(db, "users", user.uid),
      {
        fcmTokens: arrayUnion(token),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    logger.info("FCM token registered");
  } catch (error) {
    logger.error("Failed to register FCM token:", error);
  }
}

/** Remove the current device's FCM token on logout. */
export async function removeFCMToken(uid: string): Promise<void> {
  try {
    const token = await messaging().getToken();
    if (!token) return;

    await setDoc(
      doc(db, "users", uid),
      {
        fcmTokens: arrayRemove(token),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    logger.info("FCM token removed");
  } catch (error) {
    logger.error("Failed to remove FCM token:", error);
  }
}

/** Listen for token refreshes and update Firestore. */
export function onTokenRefresh(): () => void {
  return messaging().onTokenRefresh(async (newToken) => {
    const user = getAuth().currentUser;
    if (!user) return;

    await setDoc(
      doc(db, "users", user.uid),
      {
        fcmTokens: arrayUnion(newToken),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    logger.info("FCM token refreshed");
  });
}

// ─── Message Handling ───────────────────────────────────────────────────────

/** Handle notification taps that opened the app from background/quit state. */
function handleNotificationNavigation(
  data: Record<string, string> | undefined,
): void {
  if (!data) return;

  const { type, sessionId } = data;

  switch (type) {
    case "group_invite":
      router.push("/session/invites" as Href);
      break;
    case "invite_response":
    case "session_ready":
      if (sessionId)
        router.push(`/session/waiting-room?sessionId=${sessionId}` as Href);
      break;
    case "session_started":
      router.push("/session/active");
      break;
    case "session_complete":
      router.push("/session/complete");
      break;
    default:
      break;
  }
}

/** Set up foreground message handler — shows in-app alert. */
export function setupForegroundHandler(): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    if (!notification) return;

    // Show in-app alert for foreground messages
    Alert.alert(notification.title || "NIYAH", notification.body || "", [
      { text: "Dismiss", style: "cancel" },
      {
        text: "View",
        onPress: () =>
          handleNotificationNavigation(data as Record<string, string>),
      },
    ]);
  });
}

/** Set up background message handler. Must be called at app entry point. */
export function setupBackgroundHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    logger.info("Background message received:", remoteMessage.messageId);
    // Background messages are handled by the system notification tray.
    // Navigation happens via onNotificationOpenedApp when user taps.
  });
}

/** Check if app was opened from a notification (cold start). */
export async function checkInitialNotification(): Promise<void> {
  const initialNotification = await messaging().getInitialNotification();
  if (initialNotification) {
    handleNotificationNavigation(
      initialNotification.data as Record<string, string>,
    );
  }
}

/** Set up handler for notification taps when app is in background. */
export function setupNotificationOpenHandler(): () => void {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    handleNotificationNavigation(remoteMessage.data as Record<string, string>);
  });
}

// ─── Initialize ─────────────────────────────────────────────────────────────

/**
 * Initialize all notification handling. Call once after auth is confirmed.
 * Returns cleanup function for all listeners.
 */
export async function initializeNotifications(): Promise<() => void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return () => {};

  await registerFCMToken();

  const unsubTokenRefresh = onTokenRefresh();
  const unsubForeground = setupForegroundHandler();
  const unsubOpen = setupNotificationOpenHandler();

  // Check if app was opened from a quit-state notification
  await checkInitialNotification();

  return () => {
    unsubTokenRefresh();
    unsubForeground();
    unsubOpen();
  };
}
