import { addDoc, serverTimestamp } from "firebase/firestore";
import { col } from "./paths";
import type { ActivityAction, ActivityEntityType } from "@/types";

/**
 * Activity is a best-effort audit trail — a failure here must never surface as
 * a failed note save, so errors are logged and swallowed.
 */
export async function logActivity(
  uid: string,
  entityType: ActivityEntityType,
  action: ActivityAction,
  metadata: { entityTitle: string; prevStatus?: string; newStatus?: string }
): Promise<void> {
  try {
    await addDoc(col.activity(uid), {
      entityType,
      action,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn("[activity] failed to record", entityType, action, error);
  }
}
