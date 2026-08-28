import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** Minimum gap between sends to one address, so "Resend" can't be spammed. */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Sends allowed to one address per hour. */
export const OTP_HOURLY_LIMIT = 5;

/**
 * Cryptographically uniform 6-digit code. `randomInt` avoids the modulo bias
 * that `Math.random()` or `% 1000000` would introduce.
 */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/**
 * Codes are stored hashed, never in plaintext: a leaked Firestore export or an
 * over-broad read rule must not hand out working login codes. The email is
 * mixed in so a hash from one address can't be replayed against another.
 */
export function hashOtp(code: string, email: string): string {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

/** Constant-time compare, so response timing can't be used to guess a code. */
export function verifyOtpHash(
  candidate: string,
  email: string,
  storedHash: string
): boolean {
  const computed = Buffer.from(hashOtp(candidate, email), "hex");
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHash, "hex");
  } catch {
    return false;
  }
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

/** Firestore doc ids can't contain "/"; hashing also keeps addresses out of
 *  the key space, so the collection can't be enumerated for valid emails. */
export function otpDocId(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export interface OtpRecord {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  /** Epoch ms of each send in the trailing hour, for rate limiting. */
  sends: number[];
  createdAt: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  retryAfter: number;
  reason?: string;
}

export function checkSendRate(
  record: OtpRecord | null,
  now = Date.now()
): RateLimitVerdict {
  if (!record) return { allowed: true, retryAfter: 0 };

  const recent = (record.sends ?? []).filter((t) => now - t < 60 * 60 * 1000);

  const last = recent.at(-1);
  if (last !== undefined && now - last < OTP_RESEND_COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - last)) / 1000),
      reason: "Please wait before requesting another code.",
    };
  }

  if (recent.length >= OTP_HOURLY_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.ceil((60 * 60 * 1000 - (now - recent[0])) / 1000),
      reason: "Too many codes requested. Try again later.",
    };
  }

  return { allowed: true, retryAfter: 0 };
}

/** Trims the send log to the trailing hour so the array can't grow forever. */
export function pruneSends(sends: number[] = [], now = Date.now()): number[] {
  return sends.filter((t) => now - t < 60 * 60 * 1000).slice(-OTP_HOURLY_LIMIT);
}
