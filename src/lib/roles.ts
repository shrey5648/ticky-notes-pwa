export const ROLES = ["admin", "user"] as const;
export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "user";

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/**
 * Profile mirror of a Firebase Auth user.
 *
 * The role of record lives in the user's *custom claims* — that's what the
 * Firestore rules read, and a client cannot forge it. This document exists
 * because claims aren't queryable: the admin console needs to list and sort
 * users, which the Auth API alone can't do efficiently. Both are written
 * together in the admin routes; claims win if they ever disagree.
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  disabled: boolean;
  /** Epoch ms — plain numbers, so one shape works on client and server. */
  createdAt: number;
  lastSignInAt: number | null;
  provider: string;
}

export interface AdminUserRow extends UserProfile {
  /** Present only in admin listings, straight from the Auth record. */
  emailVerified: boolean;
}
