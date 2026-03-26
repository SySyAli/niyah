declare module "@react-native-firebase/messaging" {
  export interface RemoteMessage {
    messageId?: string;
    notification?: {
      title?: string;
      body?: string;
    };
    data?: Record<string, string>;
  }

  export interface Messaging {
    requestPermission(): Promise<number>;
    getToken(): Promise<string | null>;
    getAPNSToken(): Promise<string | null>;
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

  export const AuthorizationStatus: {
    NOT_DETERMINED: -1;
    DENIED: 0;
    AUTHORIZED: 1;
    PROVISIONAL: 2;
  };

  export function getMessaging(): Messaging;
  export function requestPermission(messaging: Messaging): Promise<number>;
  export function getToken(messaging: Messaging): Promise<string | null>;
  export function getAPNSToken(messaging: Messaging): Promise<string | null>;
  export function registerDeviceForRemoteMessages(
    messaging: Messaging,
  ): Promise<void>;
  export function onTokenRefresh(
    messaging: Messaging,
    listener: (token: string) => void,
  ): () => void;
  export function onMessage(
    messaging: Messaging,
    listener: (message: RemoteMessage) => Promise<void> | void,
  ): () => void;
  export function onNotificationOpenedApp(
    messaging: Messaging,
    listener: (message: RemoteMessage) => void,
  ): () => void;
  export function setBackgroundMessageHandler(
    messaging: Messaging,
    handler: (message: RemoteMessage) => Promise<void>,
  ): void;
  export function getInitialNotification(
    messaging: Messaging,
  ): Promise<RemoteMessage | null>;

  interface MessagingModule {
    (): Messaging;
    AuthorizationStatus: typeof AuthorizationStatus;
  }

  const messaging: MessagingModule;

  export default messaging;
}
