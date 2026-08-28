import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { apiError, requireAdmin } from "@/lib/api-auth";
import { describeServerError } from "@/lib/server-errors";
import { isRole, type Role } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ uid: string }>;
}

/** Collections that hang off users/{uid} and must go when the user does. */
const OWNED_COLLECTIONS = [
  "projects",
  "notes",
  "tasks",
  "snippets",
  "templates",
  "quickLinks",
  "activity",
] as const;

/**
 * Guards against an admin locking every administrator out of the console.
 * Demoting or disabling the last remaining enabled admin leaves nobody who can
 * undo it, so it's refused outright.
 */
async function wouldRemoveLastAdmin(uid: string): Promise<boolean> {
  const auth = adminAuth();
  let pageToken: string | undefined;
  let others = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.uid === uid || user.disabled) continue;
      const claimed = (user.customClaims as { role?: unknown } | undefined)?.role;
      if (claimed === "admin") others += 1;
    }
    pageToken = page.pageToken;
  } while (pageToken && others === 0);
  return others === 0;
}

/** PATCH — change role, enabled state, and/or display name. */
export async function PATCH(request: Request, context: Context) {
  const caller = await requireAdmin(request);
  if (caller instanceof NextResponse) return caller;

  const { uid } = await context.params;

  let role: Role | undefined;
  let disabled: boolean | undefined;
  let displayName: string | undefined;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.role !== undefined) {
      if (!isRole(body.role)) return apiError("Unknown role.", 400);
      role = body.role;
    }
    if (body.disabled !== undefined) {
      if (typeof body.disabled !== "boolean") {
        return apiError("`disabled` must be a boolean.", 400);
      }
      disabled = body.disabled;
    }
    if (typeof body.displayName === "string") {
      displayName = body.displayName.trim().slice(0, 80);
    }
  } catch {
    return apiError("Malformed request body.", 400);
  }

  if (role === undefined && disabled === undefined && displayName === undefined) {
    return apiError("Nothing to update.", 400);
  }

  // Self-lockout guards. An admin can edit their own display name, but not
  // strip their own access — that's almost always a mistake, and there's no
  // way back from it in the UI.
  if (uid === caller.uid && role === "user") {
    return apiError("You can't remove your own administrator role.", 400);
  }
  if (uid === caller.uid && disabled === true) {
    return apiError("You can't disable your own account.", 400);
  }

  try {
    const auth = adminAuth();
    const user = await auth.getUser(uid).catch(() => null);
    if (!user) return apiError("User not found.", 404);

    const currentRole = (user.customClaims as { role?: unknown } | undefined)?.role;
    const losesAdmin =
      currentRole === "admin" && (role === "user" || disabled === true);
    if (losesAdmin && (await wouldRemoveLastAdmin(uid))) {
      return apiError(
        "This is the only active administrator. Promote someone else first.",
        400
      );
    }

    if (role !== undefined) await auth.setCustomUserClaims(uid, { role });
    if (disabled !== undefined || displayName !== undefined) {
      await auth.updateUser(uid, {
        ...(disabled !== undefined ? { disabled } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
      });
    }

    // Claims live inside the ID token, so an existing session would keep the
    // old role for up to an hour. Revoking forces a token refresh on the next
    // request, which is what makes a demotion or disable take effect now.
    if (role !== undefined || disabled === true) {
      await auth.revokeRefreshTokens(uid);
    }

    await adminDb()
      .collection("userProfiles")
      .doc(uid)
      .set(
        {
          uid,
          email: user.email ?? "",
          ...(role !== undefined ? { role } : {}),
          ...(disabled !== undefined ? { disabled } : {}),
          ...(displayName !== undefined ? { displayName } : {}),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true, uid, role, disabled });
  } catch (error) {
    console.error("[admin] update user failed", uid, error);
    const described = describeServerError(error);
    return apiError(
      described.setup ? described.message : "Could not update this user.",
      described.status
    );
  }
}

/** DELETE — remove the account and everything it owns. */
export async function DELETE(request: Request, context: Context) {
  const caller = await requireAdmin(request);
  if (caller instanceof NextResponse) return caller;

  const { uid } = await context.params;

  if (uid === caller.uid) {
    return apiError("You can't delete your own account here.", 400);
  }

  try {
    const auth = adminAuth();
    const db = adminDb();

    const user = await auth.getUser(uid).catch(() => null);
    if (!user) return apiError("User not found.", 404);

    const claimed = (user.customClaims as { role?: unknown } | undefined)?.role;
    if (claimed === "admin" && (await wouldRemoveLastAdmin(uid))) {
      return apiError(
        "This is the only active administrator. Promote someone else first.",
        400
      );
    }

    // Delete content before the account: if this fails halfway, the user still
    // exists and the operation can be retried. The reverse order would orphan
    // documents with no owner to attribute them to.
    for (const name of OWNED_COLLECTIONS) {
      await db.recursiveDelete(db.collection(`users/${uid}/${name}`));
    }
    await db.collection("userProfiles").doc(uid).delete().catch(() => {});

    // Share-index entries are top-level, so they survive the sweep above.
    const shares = await db.collection("shares").where("uid", "==", uid).get();
    await Promise.all(shares.docs.map((d) => d.ref.delete().catch(() => {})));

    await auth.deleteUser(uid);

    return NextResponse.json({ ok: true, uid });
  } catch (error) {
    console.error("[admin] delete user failed", uid, error);
    const described = describeServerError(error);
    return apiError(
      described.setup ? described.message : "Could not delete this user.",
      described.status
    );
  }
}
