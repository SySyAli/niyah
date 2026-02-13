// ---------------------------------------------------------------------------
// Auth types
// ---------------------------------------------------------------------------

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  providerId: string | null;
  isNewUser: boolean;
}

export interface AuthStateChangedEvent {
  user: FirebaseUser | null;
}

export type NiyahFirebaseAuthModuleEvents = {
  onAuthStateChanged: (event: AuthStateChangedEvent) => void;
};

// ---------------------------------------------------------------------------
// Firestore types
// ---------------------------------------------------------------------------

export interface FirestoreDocument {
  __id: string;
  [key: string]: unknown;
}

export interface ServerTimestamp {
  __type: "serverTimestamp";
}
