// Type declarations for @react-native-firebase/messaging
// The package doesn't ship .d.ts files, so we declare the module here.

declare module "@react-native-firebase/messaging" {
  export interface RemoteMessage {
    messageId?: string;
    notification?: {
      title?: string;
      body?: string;
    };
    data?: Record<string, string>;
  }

  export interface FirebaseMessagingTypes {
    AuthorizationStatus: {
      NOT_DETERMINED: -1;
      DENIED: 0;
      AUTHORIZED: 1;
      PROVISIONAL: 2;
    };
  }

  interface Messaging {
    requestPermission(): Promise<number>;
    getToken(): Promise<string>;
    registerDeviceForRemoteMessages(): Promise<void>;
    onTokenRefresh(listener: (token: string) => void): () => void;
    onMessage(
      listener: (message: RemoteMessage) => Promise<void> | void,
    ): () => void;
    onNotificationOpenedApp(
      listener: (message: RemoteMessage) => void,
    ): () => void;
    setBackgroundMessageHandler(
      handler: (message: RemoteMessage) => Promise<void>,
    ): void;
    getInitialNotification(): Promise<RemoteMessage | null>;
  }

  function messaging(): Messaging;

  namespace messaging {
    const AuthorizationStatus: {
      NOT_DETERMINED: -1;
      DENIED: 0;
      AUTHORIZED: 1;
      PROVISIONAL: 2;
    };
  }

  export default messaging;
}
