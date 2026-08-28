import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { describeServerError } from "@/lib/server-errors";
import {
  isValidEmail,
  normalizeEmail,
  otpDocId,
  verifyOtpHash,
  OTP_MAX_ATTEMPTS,
  type OtpRecord,
} from "@/lib/otp";
import { DEFAULT_ROLE, type Role, type UserProfile } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Emails listed here get the admin role the first time they sign in. */
function bootstrapAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

/**
 * Exchanges a valid code for a Firebase custom token, which the client trades
 * for a real session via `signInWithCustomToken`.
 *
 * Creates the account on first successful verification — possession of a code
 * sent to that address *is* the proof of ownership, so a separate registration
 * step would add friction without adding security.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "Server auth is not configured." }, { status: 503 });
  }

  let email: string;
  let code: string;
  try {
    const body = (await request.json()) as { email?: unknown; code?: unknown };
    if (typeof body.email !== "string" || typeof body.code !== "string") {
      throw new Error("bad body");
    }
    email = normalizeEmail(body.email);
    code = body.code.replace(/\D/g, "");
  } catch {
    return NextResponse.json({ error: "Provide an email and code." }, { status: 400 });
  }

  if (!isValidEmail(email) || code.length !== 6) {
    return NextResponse.json({ error: "That code isn't valid." }, { status: 400 });
  }

  const db = adminDb();
  const docRef = db.collection("otpCodes").doc(otpDocId(email));

  try {
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "That code has expired. Request a new one." },
        { status: 400 }
      );
    }

    const record = snap.data() as OtpRecord;
    const now = Date.now();

    if (record.expiresAt < now) {
      await docRef.delete().catch(() => {});
      return NextResponse.json(
        { error: "That code has expired. Request a new one." },
        { status: 400 }
      );
    }

    // The attempt cap is what makes a 6-digit code safe: without it, a million
    // guesses would exhaust the space.
    if ((record.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
      await docRef.delete().catch(() => {});
      return NextResponse.json(
        { error: "Too many incorrect attempts. Request a new code." },
        { status: 429 }
      );
    }

    if (!verifyOtpHash(code, email, record.codeHash)) {
      await docRef.update({ attempts: FieldValue.increment(1) });
      const left = OTP_MAX_ATTEMPTS - (record.attempts ?? 0) - 1;
      return NextResponse.json(
        {
          error:
            left > 0
              ? `Incorrect code. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
              : "Incorrect code. Request a new one.",
        },
        { status: 400 }
      );
    }

    // Single use: burn the code before minting anything.
    await docRef.delete().catch(() => {});

    const auth = adminAuth();
    let user;
    let created = false;
    try {
      user = await auth.getUserByEmail(email);
    } catch (lookupError) {
      // Only "no such user" means we should create one. Catching everything
      // here would turn a project-configuration failure into a misleading
      // create attempt that reports the wrong cause.
      const lookupCode =
        typeof lookupError === "object" && lookupError && "code" in lookupError
          ? String((lookupError as { code: unknown }).code)
          : "";
      if (lookupCode !== "auth/user-not-found") throw lookupError;

      user = await auth.createUser({ email, emailVerified: true });
      created = true;
    }

    if (user.disabled) {
      return NextResponse.json(
        { error: "This account has been disabled by an administrator." },
        { status: 403 }
      );
    }

    // Verifying a code proves control of the mailbox.
    if (!user.emailVerified) {
      await auth.updateUser(user.uid, { emailVerified: true });
    }

    const existingRole = (user.customClaims as { role?: unknown } | undefined)?.role;
    const role: Role =
      existingRole === "admin" || existingRole === "user"
        ? (existingRole as Role)
        : bootstrapAdmins().includes(email)
          ? "admin"
          : DEFAULT_ROLE;

    if (existingRole !== role) {
      await auth.setCustomUserClaims(user.uid, { role });
    }

    const profile: UserProfile = {
      uid: user.uid,
      email,
      displayName: user.displayName ?? "",
      role,
      disabled: false,
      createdAt: created
        ? now
        : new Date(user.metadata.creationTime ?? now).getTime(),
      lastSignInAt: now,
      provider: "otp",
    };
    // merge: never clobber a displayName the user set later.
    await db.collection("userProfiles").doc(user.uid).set(profile, { merge: true });

    const customToken = await auth.createCustomToken(user.uid, { role });

    return NextResponse.json({ customToken, role, created });
  } catch (error) {
    console.error("[otp] verify failed", error);
    const described = describeServerError(error);
    return NextResponse.json({ error: described.message }, { status: described.status });
  }
}
