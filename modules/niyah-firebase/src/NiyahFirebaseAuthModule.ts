import { NativeModule, requireNativeModule } from "expo";
import type { NiyahFirebaseAuthModuleEvents, FirebaseUser } from "./types";

declare class NiyahFirebaseAuthModuleClass extends NativeModule<NiyahFirebaseAuthModuleEvents> {
  signInWithCredential(
    provider: "google" | "apple",
    idToken: string,
    rawNonce?: string | null,
  ): Promise<FirebaseUser>;

  sendSignInLinkToEmail(
    email: string,
    actionCodeURL: string,
    bundleId: string,
  ): Promise<void>;

  isSignInWithEmailLink(link: string): boolean;

  signInWithEmailLink(email: string, link: string): Promise<FirebaseUser>;

  signOut(): Promise<void>;

  getCurrentUser(): FirebaseUser | null;
}

export default requireNativeModule<NiyahFirebaseAuthModuleClass>(
  "NiyahFirebaseAuth",
);
