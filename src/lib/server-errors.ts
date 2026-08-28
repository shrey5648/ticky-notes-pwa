import "server-only";

/**
 * Turns the setup failures that all look identical to a user — "you never
 * enabled this service" vs. "something broke" — into distinguishable messages.
 *
 * Without this, a brand-new Firebase project fails sign-in with a generic 500
 * and no indication that the fix is one click in the console.
 */
export interface DescribedError {
  message: string;
  status: number;
  /** True when the cause is project configuration, not a transient fault. */
  setup: boolean;
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

/** Firebase Auth (Admin SDK) setup failures. */
export function describeAuthError(error: unknown): DescribedError | null {
  const code = errorCode(error);
  const raw = errorText(error);

  if (
    code === "auth/configuration-not-found" ||
    /no configuration corresponding to the provided identifier/i.test(raw)
  ) {
    return {
      message:
        "Firebase Authentication isn't set up for this project yet. Open the " +
        "Firebase console → Build → Authentication → Get started, and enable " +
        "at least one sign-in provider.",
      status: 503,
      setup: true,
    };
  }

  if (code === "auth/project-not-found" || code === "auth/invalid-credential") {
    return {
      message:
        "The server's Firebase credentials were rejected. Check the " +
        "FIREBASE_ADMIN_* values in .env.local.",
      status: 503,
      setup: true,
    };
  }

  if (code === "auth/email-already-exists") {
    return {
      message: "An account already exists for that email.",
      status: 409,
      setup: false,
    };
  }

  return null;
}

/** Firestore setup failures. */
export function describeFirestoreError(error: unknown): DescribedError | null {
  const raw = errorText(error);

  if (
    /has not been used in project|is disabled|SERVICE_DISABLED/i.test(raw) ||
    /NOT_FOUND.*database/i.test(raw)
  ) {
    return {
      message:
        "Cloud Firestore isn't enabled for this Firebase project yet. Open " +
        "the Firebase console → Build → Firestore Database → Create database, " +
        "then retry.",
      status: 503,
      setup: true,
    };
  }

  if (/PERMISSION_DENIED|UNAUTHENTICATED/i.test(raw)) {
    return {
      message:
        "The server's Firebase credentials were rejected. Check the " +
        "FIREBASE_ADMIN_* values in .env.local.",
      status: 503,
      setup: true,
    };
  }

  return null;
}

/**
 * Single entry point for route handlers: identifies whichever service failed,
 * falling back to a generic message so an unexpected error never leaks
 * internals to the client.
 */
export function describeServerError(error: unknown): DescribedError {
  return (
    describeAuthError(error) ??
    describeFirestoreError(error) ?? {
      message: "Something went wrong. Try again.",
      status: 500,
      setup: false,
    }
  );
}
