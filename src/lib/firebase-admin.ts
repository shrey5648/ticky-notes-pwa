import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firebase Admin. This module must never reach the client — it
 * holds a private key that can impersonate any user, which is why it imports
 * `server-only` (the build fails loudly if a client component pulls it in).
 */

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

/**
 * Environment variables can't hold real newlines, so service-account keys are
 * conventionally stored with literal `\n` sequences that must be expanded.
 * Some hosts also wrap the value in quotes.
 */
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /^["']|["']$/g,
  ""
).replace(/\\n/g, "\n");

export const isAdminConfigured = Boolean(projectId && clientEmail && privateKey);

let cached: App | null = null;

function adminApp(): App {
  if (cached) return cached;
  if (!isAdminConfigured) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }
  // Route handlers run in a warm process across requests; reusing the app
  // avoids "app already exists" on the second invocation.
  const existing = getApps().find((a) => a.name === "admin");
  cached =
    existing ??
    initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }) },
      "admin"
    );
  return cached;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}
