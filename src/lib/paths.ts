import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

/** All user data lives under users/{uid}/… so the security rules can scope
 *  access with a single wildcard match. */
export const col = {
  projects: (uid: string) => collection(db, "users", uid, "projects"),
  notes: (uid: string) => collection(db, "users", uid, "notes"),
  tasks: (uid: string) => collection(db, "users", uid, "tasks"),
  snippets: (uid: string) => collection(db, "users", uid, "snippets"),
  templates: (uid: string) => collection(db, "users", uid, "templates"),
  quickLinks: (uid: string) => collection(db, "users", uid, "quickLinks"),
  activity: (uid: string) => collection(db, "users", uid, "activity"),
};

export const ref = {
  project: (uid: string, id: string) => doc(db, "users", uid, "projects", id),
  note: (uid: string, id: string) => doc(db, "users", uid, "notes", id),
  task: (uid: string, id: string) => doc(db, "users", uid, "tasks", id),
  snippet: (uid: string, id: string) => doc(db, "users", uid, "snippets", id),
  template: (uid: string, id: string) => doc(db, "users", uid, "templates", id),
  quickLink: (uid: string, id: string) =>
    doc(db, "users", uid, "quickLinks", id),
};

/** Public share lookups are unauthenticated, so the slug -> {uid, id} mapping
 *  lives in a top-level collection readable by anyone holding the slug. */
export const shareIndex = (slug: string) => doc(db, "shares", slug);

export interface ShareIndexEntry {
  uid: string;
  entityId: string;
  kind: "note" | "snippet";
  createdAt: unknown;
}
