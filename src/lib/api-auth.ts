import "server-only";

import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, isAdminConfigured } from "./firebase-admin";
import { describeAuthError } from "./server-errors";
import { isRole, type Role } from "./roles";

export interface Caller {
  uid: string;
  email: string | null;
  role: Role;
  token: DecodedIdToken;
}

/** Uniform JSON error shape so the client can render `error` directly. */
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Authenticates a route handler from the `Authorization: Bearer <idToken>`
 * header.
 *
 * `checkRevoked` is on: a disabled or deleted account, or one whose tokens were
 * revoked after a role change, is rejected immediately rather than staying
 * valid for up to an hour until the ID token expires.
 */
export async function requireUser(
  request: Request
): Promise<Caller | NextResponse> {
  if (!isAdminConfigured) {
    return apiError("Server auth is not configured.", 503);
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return apiError("Missing bearer token.", 401);

  try {
    const token = await adminAuth().verifyIdToken(match[1], true);
    const claimed = (token as Record<string, unknown>).role;
    return {
      uid: token.uid,
      email: token.email ?? null,
      role: isRole(claimed) ? claimed : "user",
      token,
    };
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "auth/id-token-revoked" || code === "auth/user-disabled") {
      return apiError("Your session is no longer valid. Sign in again.", 401);
    }
    // A misconfigured project fails here too; that's a 503, not a bad token.
    const setup = describeAuthError(error);
    if (setup?.setup) return apiError(setup.message, setup.status);

    return apiError("Invalid or expired token.", 401);
  }
}

export async function requireAdmin(
  request: Request
): Promise<Caller | NextResponse> {
  const caller = await requireUser(request);
  if (caller instanceof NextResponse) return caller;
  if (caller.role !== "admin") {
    // 403, not 404: the caller is authenticated, just not permitted.
    return apiError("Administrator access required.", 403);
  }
  return caller;
}
