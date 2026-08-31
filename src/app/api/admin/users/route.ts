import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { apiError, requireAdmin } from "@/lib/api-auth";
import { describeServerError } from "@/lib/server-errors";
import { isRole, type AdminUserRow, type Role } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

/**
 * Lists every account.
 *
 * The Auth record is the source of truth for identity and the role claim; the
 * `userProfiles` mirror only supplies fields Auth doesn't store. Reading Auth
 * first means a user created out-of-band (console, another client) still shows
 * up rather than silently missing from the console.
 */
export async function GET(request: Request) {
  const caller = await requireAdmin(request);
  if (caller instanceof NextResponse) return caller;

  try {
    const auth = adminAuth();
    const db = adminDb();

    const rows: AdminUserRow[] = [];
    let pageToken: string | undefined;

    // listUsers is paginated; loop so a large tenant isn't truncated.
    do {
      const page = await auth.listUsers(PAGE_SIZE, pageToken);
      for (const user of page.users) {
        const claimed = (user.customClaims as { role?: unknown } | undefined)?.role;
        const role: Role = isRole(claimed) ? claimed : "user";
        rows.push({
          uid: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          role,
          disabled: user.disabled,
          emailVerified: user.emailVerified,
          createdAt: new Date(user.metadata.creationTime ?? 0).getTime(),
          lastSignInAt: user.metadata.lastSignInTime
            ? new Date(user.metadata.lastSignInTime).getTime()
            : null,
          provider:
            user.providerData[0]?.providerId ?? (user.email ? "otp" : "anonymous"),
        });
      }
      pageToken = page.pageToken;
    } while (pageToken);

    // The mirror fills in names Auth doesn't carry; cheap to read in bulk.
    const profiles = await db.collection("userProfiles").get();
    const extras = new Map(
      profiles.docs.map((d) => [d.id, d.data() as { displayName?: string }])
    );
    for (const row of rows) {
      if (!row.displayName) row.displayName = extras.get(row.uid)?.displayName ?? "";
    }

    rows.sort((a, b) => (b.lastSignInAt ?? 0) - (a.lastSignInAt ?? 0));

    return NextResponse.json({ users: rows, total: rows.length });
  } catch (error) {
    console.error("[admin] list users failed", error);
    const described = describeServerError(error);
    return apiError(
      described.setup ? described.message : "Could not load users.",
      described.status
    );
  }
}

/**
 * Creates an account.
 *
 * Sign-in here is passwordless OTP, so a password is optional: without one the
 * user simply signs in with their email like everyone else. The role claim and
 * the `userProfiles` mirror are written together, same as in PATCH.
 */
export async function POST(request: Request) {
  const caller = await requireAdmin(request);
  if (caller instanceof NextResponse) return caller;

  let email: string;
  let displayName = "";
  let password: string | undefined;
  let role: Role = "user";
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return apiError("A valid email address is required.", 400);
    }
    email = body.email.trim().toLowerCase();

    if (typeof body.displayName === "string") {
      displayName = body.displayName.trim().slice(0, 80);
    }
    if (body.password !== undefined && body.password !== "") {
      if (typeof body.password !== "string" || body.password.length < 6) {
        return apiError("Password must be at least 6 characters.", 400);
      }
      password = body.password;
    }
    if (body.role !== undefined) {
      if (!isRole(body.role)) return apiError("Unknown role.", 400);
      role = body.role;
    }
  } catch {
    return apiError("Malformed request body.", 400);
  }

  try {
    const auth = adminAuth();

    const user = await auth.createUser({
      email,
      emailVerified: false,
      ...(displayName ? { displayName } : {}),
      ...(password ? { password } : {}),
    });

    await auth.setCustomUserClaims(user.uid, { role });

    await adminDb().collection("userProfiles").doc(user.uid).set(
      {
        uid: user.uid,
        email,
        displayName,
        role,
        disabled: false,
        createdAt: Date.now(),
      },
      { merge: true }
    );

    const row: AdminUserRow = {
      uid: user.uid,
      email,
      displayName,
      role,
      disabled: false,
      emailVerified: false,
      createdAt: new Date(user.metadata.creationTime ?? Date.now()).getTime(),
      lastSignInAt: null,
      provider: password ? "password" : "otp",
    };

    return NextResponse.json({ user: row }, { status: 201 });
  } catch (error) {
    console.error("[admin] create user failed", error);
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "auth/email-already-exists") {
      return apiError("An account with that email already exists.", 409);
    }
    if (code === "auth/invalid-email") {
      return apiError("That email address isn't valid.", 400);
    }
    const described = describeServerError(error);
    return apiError(
      described.setup ? described.message : "Could not create this user.",
      described.status
    );
  }
}
