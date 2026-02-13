import { requireNativeModule } from "expo";
import type { FirestoreDocument, ServerTimestamp } from "./types";

declare class NiyahFirestoreModuleClass {
  getDoc(
    collectionPath: string,
    documentId: string,
  ): Promise<FirestoreDocument | null>;

  setDoc(
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
    merge: boolean,
  ): Promise<void>;

  updateDoc(
    collectionPath: string,
    documentId: string,
    data: Record<string, unknown>,
  ): Promise<void>;

  deleteDoc(collectionPath: string, documentId: string): Promise<void>;

  serverTimestamp(): ServerTimestamp;
}

export default requireNativeModule<NiyahFirestoreModuleClass>("NiyahFirestore");
