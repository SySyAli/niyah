/**
 * Milestone event logging for investor-facing metrics + Sentry breadcrumbs
 * for crash context. Fire-and-forget: never throws, never blocks.
 *
 * Keep the event set tight — each call writes a Firestore doc. Non-milestone
 * trace events should use addBreadcrumb() directly.
 */

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { addBreadcrumb } from "../config/sentry";
import { DEMO_MODE } from "../constants/config";
import { logger } from "./logger";

type EventProps = Record<string, string | number | boolean | null>;

export async function logEvent(
  name: string,
  props: EventProps = {},
): Promise<void> {
  addBreadcrumb("analytics", name, props);

  // Tests + local demo skip Firestore writes.
  if (DEMO_MODE) return;

  try {
    const uid = getAuth().currentUser?.uid ?? null;
    const db = getFirestore();
    await addDoc(collection(db, "analytics_events"), {
      userId: uid,
      name,
      props,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    logger.warn("logEvent failed:", name, err);
  }
}
