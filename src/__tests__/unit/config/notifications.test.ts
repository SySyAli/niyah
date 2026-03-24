/**
 * Unit Tests for notifications.ts
 *
 * Tests FCM push notification setup: permission requests, token management,
 * message handlers, deep link navigation, and full initialization lifecycle.
 *
 * Firebase messaging is mocked globally in jest.setup.ts. Since clearMocks
 * resets implementations between tests, we re-configure the shared mock
 * instance in beforeEach so every call to messaging() returns it.
 */

import messaging from "@react-native-firebase/messaging";
import { getAuth } from "@react-native-firebase/auth";
import { setDoc } from "@react-native-firebase/firestore";
import { Platform } from "react-native";
import { router } from "expo-router";

import {
  requestNotificationPermission,
  registerFCMToken,
  removeFCMToken,
  onTokenRefresh,
  setupForegroundHandler,
  setupBackgroundHandler,
  checkInitialNotification,
  setupNotificationOpenHandler,
  initializeNotifications,
} from "../../../config/notifications";

// Shared mock instance — messaging() always returns this same object.
const sharedInstance = {
  requestPermission: jest.fn(() => Promise.resolve(1)),
  getToken: jest.fn(() => Promise.resolve("mock-fcm-token")),
  registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
};

describe("notifications", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    // Re-wire messaging() to return the shared instance with fresh mocks
    sharedInstance.requestPermission = jest.fn(() => Promise.resolve(1));
    sharedInstance.getToken = jest.fn(() =>
      Promise.resolve("mock-fcm-token"),
    );
    sharedInstance.registerDeviceForRemoteMessages = jest.fn(() =>
      Promise.resolve(),
    );
    sharedInstance.onTokenRefresh = jest.fn(() => jest.fn());
    sharedInstance.onMessage = jest.fn(() => jest.fn());
    sharedInstance.onNotificationOpenedApp = jest.fn(() => jest.fn());
    sharedInstance.setBackgroundMessageHandler = jest.fn();
    sharedInstance.getInitialNotification = jest.fn(() =>
      Promise.resolve(null),
    );

    (messaging as unknown as jest.Mock).mockReturnValue(sharedInstance);
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  // ─── requestNotificationPermission ──────────────────────────────────────────

  describe("requestNotificationPermission", () => {
    it("returns true when AUTHORIZED", async () => {
      sharedInstance.requestPermission.mockResolvedValue(
        messaging.AuthorizationStatus.AUTHORIZED,
      );

      const result = await requestNotificationPermission();
      expect(result).toBe(true);
    });

    it("returns true when PROVISIONAL", async () => {
      sharedInstance.requestPermission.mockResolvedValue(
        messaging.AuthorizationStatus.PROVISIONAL,
      );

      const result = await requestNotificationPermission();
      expect(result).toBe(true);
    });

    it("returns false when DENIED", async () => {
      sharedInstance.requestPermission.mockResolvedValue(
        messaging.AuthorizationStatus.DENIED,
      );

      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it("returns false when NOT_DETERMINED", async () => {
      sharedInstance.requestPermission.mockResolvedValue(
        messaging.AuthorizationStatus.NOT_DETERMINED,
      );

      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });
  });

  // ─── registerFCMToken ───────────────────────────────────────────────────────

  describe("registerFCMToken", () => {
    it("no-ops when no user is signed in", async () => {
      (getAuth as jest.Mock).mockReturnValue({ currentUser: null });

      await registerFCMToken();

      expect(sharedInstance.getToken).not.toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
    });

    it("registers device and writes token on iOS", async () => {
      Platform.OS = "ios" as typeof Platform.OS;
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: { uid: "user-123" },
      });
      sharedInstance.getToken.mockResolvedValue("ios-fcm-token");

      await registerFCMToken();

      expect(
        sharedInstance.registerDeviceForRemoteMessages,
      ).toHaveBeenCalled();
      expect(sharedInstance.getToken).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fcmTokens: expect.objectContaining({ __type: "arrayUnion" }),
        }),
        { merge: true },
      );
    });

    it("writes token without registerDevice on Android", async () => {
      Platform.OS = "android" as typeof Platform.OS;
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: { uid: "user-456" },
      });
      sharedInstance.getToken.mockResolvedValue("android-fcm-token");

      await registerFCMToken();

      expect(
        sharedInstance.registerDeviceForRemoteMessages,
      ).not.toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled();
    });

    it("no-ops when getToken returns null", async () => {
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: { uid: "user-789" },
      });
      sharedInstance.getToken.mockResolvedValue(null);

      await registerFCMToken();

      expect(setDoc).not.toHaveBeenCalled();
    });

    it("catches and swallows errors", async () => {
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: { uid: "user-err" },
      });
      sharedInstance.getToken.mockRejectedValue(new Error("network error"));

      await expect(registerFCMToken()).resolves.toBeUndefined();
    });
  });

  // ─── removeFCMToken ─────────────────────────────────────────────────────────

  describe("removeFCMToken", () => {
    it("writes arrayRemove to user doc", async () => {
      sharedInstance.getToken.mockResolvedValue("device-token");

      await removeFCMToken("user-123");

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fcmTokens: expect.objectContaining({
            __type: "arrayRemove",
            items: ["device-token"],
          }),
        }),
        { merge: true },
      );
    });

    it("no-ops when getToken returns null", async () => {
      sharedInstance.getToken.mockResolvedValue(null);

      await removeFCMToken("user-123");

      expect(setDoc).not.toHaveBeenCalled();
    });

    it("catches and swallows errors", async () => {
      sharedInstance.getToken.mockRejectedValue(new Error("fail"));

      await expect(removeFCMToken("user-123")).resolves.toBeUndefined();
    });
  });

  // ─── onTokenRefresh ─────────────────────────────────────────────────────────

  describe("onTokenRefresh", () => {
    it("registers a token refresh listener and returns unsubscribe", () => {
      const mockUnsub = jest.fn();
      sharedInstance.onTokenRefresh.mockReturnValue(mockUnsub);

      const unsub = onTokenRefresh();

      expect(sharedInstance.onTokenRefresh).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(unsub).toBe(mockUnsub);
    });
  });

  // ─── setupForegroundHandler ─────────────────────────────────────────────────

  describe("setupForegroundHandler", () => {
    it("registers onMessage handler and returns unsubscribe", () => {
      const mockUnsub = jest.fn();
      sharedInstance.onMessage.mockReturnValue(mockUnsub);

      const unsub = setupForegroundHandler();

      expect(sharedInstance.onMessage).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(unsub).toBe(mockUnsub);
    });
  });

  // ─── setupBackgroundHandler ─────────────────────────────────────────────────

  describe("setupBackgroundHandler", () => {
    it("registers background message handler", () => {
      setupBackgroundHandler();

      expect(
        sharedInstance.setBackgroundMessageHandler,
      ).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ─── checkInitialNotification ───────────────────────────────────────────────

  describe("checkInitialNotification", () => {
    it("navigates when initial notification has data", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "group_invite" },
      });

      await checkInitialNotification();

      expect(router.push).toHaveBeenCalledWith("/session/invites");
    });

    it("no-ops when getInitialNotification returns null", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue(null);

      await checkInitialNotification();

      expect(router.push).not.toHaveBeenCalled();
    });
  });

  // ─── setupNotificationOpenHandler ───────────────────────────────────────────

  describe("setupNotificationOpenHandler", () => {
    it("registers onNotificationOpenedApp and returns unsubscribe", () => {
      const mockUnsub = jest.fn();
      sharedInstance.onNotificationOpenedApp.mockReturnValue(mockUnsub);

      const unsub = setupNotificationOpenHandler();

      expect(sharedInstance.onNotificationOpenedApp).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(unsub).toBe(mockUnsub);
    });
  });

  // ─── handleNotificationNavigation (via checkInitialNotification) ────────────

  describe("notification navigation", () => {
    it("navigates to /session/invites for group_invite", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "group_invite" },
      });

      await checkInitialNotification();

      expect(router.push).toHaveBeenCalledWith("/session/invites");
    });

    it("navigates to waiting-room for invite_response with sessionId", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "invite_response", sessionId: "sess-abc" },
      });

      await checkInitialNotification();

      expect(router.push).toHaveBeenCalledWith(
        "/session/waiting-room?sessionId=sess-abc",
      );
    });

    it("navigates to waiting-room for session_ready with sessionId", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "session_ready", sessionId: "sess-xyz" },
      });

      await checkInitialNotification();

      expect(router.push).toHaveBeenCalledWith(
        "/session/waiting-room?sessionId=sess-xyz",
      );
    });

    it("does not navigate for invite_response without sessionId", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "invite_response" },
      });

      await checkInitialNotification();

      expect(router.push).not.toHaveBeenCalled();
    });

    it("navigates to /session/active for session_started", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "session_started" },
      });

      await checkInitialNotification();

      expect(router.push).toHaveBeenCalledWith("/session/active");
    });

    it("navigates to /session/complete for session_complete", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "session_complete" },
      });

      await checkInitialNotification();

      expect(router.push).toHaveBeenCalledWith("/session/complete");
    });

    it("does not navigate for unknown type", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: { type: "unknown_type" },
      });

      await checkInitialNotification();

      expect(router.push).not.toHaveBeenCalled();
    });

    it("does not navigate when data is undefined", async () => {
      sharedInstance.getInitialNotification.mockResolvedValue({
        data: undefined,
      });

      await checkInitialNotification();

      expect(router.push).not.toHaveBeenCalled();
    });
  });

  // ─── initializeNotifications ────────────────────────────────────────────────

  describe("initializeNotifications", () => {
    it("returns cleanup function that calls all unsubs", async () => {
      sharedInstance.requestPermission.mockResolvedValue(
        messaging.AuthorizationStatus.AUTHORIZED,
      );
      (getAuth as jest.Mock).mockReturnValue({
        currentUser: { uid: "user-init" },
      });
      sharedInstance.getToken.mockResolvedValue("init-token");
      sharedInstance.getInitialNotification.mockResolvedValue(null);

      const mockUnsubRefresh = jest.fn();
      const mockUnsubForeground = jest.fn();
      const mockUnsubOpen = jest.fn();
      sharedInstance.onTokenRefresh.mockReturnValue(mockUnsubRefresh);
      sharedInstance.onMessage.mockReturnValue(mockUnsubForeground);
      sharedInstance.onNotificationOpenedApp.mockReturnValue(mockUnsubOpen);

      const cleanup = await initializeNotifications();

      expect(sharedInstance.requestPermission).toHaveBeenCalled();
      expect(sharedInstance.onTokenRefresh).toHaveBeenCalled();
      expect(sharedInstance.onMessage).toHaveBeenCalled();
      expect(sharedInstance.onNotificationOpenedApp).toHaveBeenCalled();
      expect(sharedInstance.getInitialNotification).toHaveBeenCalled();

      cleanup();

      expect(mockUnsubRefresh).toHaveBeenCalled();
      expect(mockUnsubForeground).toHaveBeenCalled();
      expect(mockUnsubOpen).toHaveBeenCalled();
    });

    it("returns noop when permission is denied", async () => {
      sharedInstance.requestPermission.mockResolvedValue(
        messaging.AuthorizationStatus.DENIED,
      );

      const cleanup = await initializeNotifications();

      expect(sharedInstance.onTokenRefresh).not.toHaveBeenCalled();
      expect(sharedInstance.onMessage).not.toHaveBeenCalled();
      expect(sharedInstance.onNotificationOpenedApp).not.toHaveBeenCalled();

      expect(() => cleanup()).not.toThrow();
    });
  });
});
