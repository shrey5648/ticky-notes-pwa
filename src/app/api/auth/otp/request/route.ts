import { NextResponse } from "next/server";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { describeServerError } from "@/lib/server-errors";
import { isMailConfigured, sendOtpEmail } from "@/lib/mailer";
import {
  checkSendRate,
  generateOtp,
  hashOtp,
  isValidEmail,
  normalizeEmail,
  otpDocId,
  pruneSends,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  type OtpRecord,
} from "@/lib/otp";

// firebase-admin and nodemailer both need Node APIs; the edge runtime has
// neither.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues a one-time sign-in code.
 *
 * Always responds 200 for a well-formed address, whether or not an account
 * exists. Telling an anonymous caller "no such user" turns this endpoint into
 * an account-enumeration oracle.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured || !isMailConfigured) {
    return NextResponse.json(
      { error: "Email sign-in is not configured on this server. See .env.example." },
      { status: 503 }
    );
  }

  let email: string;
  try {
    const body = (await request.json()) as { email?: unknown };
    if (typeof body.email !== "string") throw new Error("email required");
    email = normalizeEmail(body.email);
  } catch {
    return NextResponse.json({ error: "Provide an email address." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look right." },
      { status: 400 }
    );
  }

  const now = Date.now();
  const docRef = adminDb().collection("otpCodes").doc(otpDocId(email));

  try {
    const snap = await docRef.get();
    const existing = snap.exists ? (snap.data() as OtpRecord) : null;

    const verdict = checkSendRate(existing, now);
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: verdict.reason, retryAfter: verdict.retryAfter },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfter) } }
      );
    }

    const code = generateOtp();
    const record: OtpRecord = {
      email,
      codeHash: hashOtp(code, email),
      expiresAt: now + OTP_TTL_MS,
      // A fresh code resets the attempt budget; the previous code is replaced
      // outright so only the newest one is ever valid.
      attempts: 0,
      sends: [...pruneSends(existing?.sends, now), now],
      createdAt: now,
    };

    await docRef.set(record);

    try {
      await sendOtpEmail(email, code);
    } catch (error) {
      console.error("[otp] send failed", error);
      // The code is unusable if it never arrived — clear it so the user isn't
      // rate-limited for a message they never got.
      await docRef.delete().catch(() => {});
      return NextResponse.json(
        { error: "Could not send the email. Try again in a moment." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      expiresInSeconds: Math.round(OTP_TTL_MS / 1000),
      resendAfterSeconds: Math.round(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    console.error("[otp] request failed", error);
    const described = describeServerError(error);
    return NextResponse.json({ error: described.message }, { status: described.status });
  }
}
