"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./firebase";
import { DEFAULT_ROLE, isRole, type Role } from "./roles";

export interface OtpRequestResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

interface AuthValue {
  user: User | null;
  /** Read from the ID token's custom claims — never from user input. */
  role: Role;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  requestOtp: (email: string) => Promise<OtpRequestResult>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshRole: () => Promise<Role>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [loading, setLoading] = useState(true);

  const readRole = useCallback(
    async (next: User | null, force = false): Promise<Role> => {
      if (!next) return DEFAULT_ROLE;
      try {
        const result = await next.getIdTokenResult(force);
        const claimed = result.claims.role;
        return isRole(claimed) ? claimed : DEFAULT_ROLE;
      } catch (error) {
        console.error("[auth] could not read role claim", error);
        return DEFAULT_ROLE;
      }
    },
    []
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(
      auth,
      async (next) => {
        setUser(next);
        setRole(await readRole(next));
        setLoading(false);
      },
      (error) => {
        console.error("[auth] listener failed", error);
        setLoading(false);
      }
    );
  }, [readRole]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      role,
      isAdmin: role === "admin",
      loading,
      configured: isFirebaseConfigured,

      async requestOtp(email) {
        const response = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Could not send a code.");
        return {
          expiresInSeconds: data.expiresInSeconds ?? 600,
          resendAfterSeconds: data.resendAfterSeconds ?? 60,
        };
      },

      async verifyOtp(email, code) {
        const response = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "That code didn't work.");
        // The server proved ownership of the mailbox and minted a custom
        // token; this is what turns it into a real Firebase session.
        const credential = await signInWithCustomToken(auth, data.customToken);
        setRole(await readRole(credential.user, true));
      },

      async signInGoogle() {
        const credential = await signInWithPopup(auth, googleProvider);
        setRole(await readRole(credential.user, true));
      },

      async signInGuest() {
        await signInAnonymously(auth);
      },

      async logout() {
        await signOut(auth);
        setRole(DEFAULT_ROLE);
      },

      async refreshRole() {
        const next = await readRole(auth.currentUser, true);
        setRole(next);
        return next;
      },

      async getIdToken() {
        const current = auth.currentUser;
        if (!current) throw new Error("Not signed in");
        return current.getIdToken();
      },
    }),
    [user, role, loading, readRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Convenience for hooks that cannot run without a signed-in user. */
export function useUid(): string | null {
  return useAuth().user?.uid ?? null;
}

/** Authenticated fetch for the admin API. */
export function useApiFetch() {
  const { getIdToken } = useAuth();
  return useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getIdToken();
      const response = await fetch(input, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }
      return data;
    },
    [getIdToken]
  );
}

/** Maps Firebase auth error codes to messages worth showing a user. */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in window was closed.";
    case "auth/operation-not-allowed":
      return "That sign-in method isn't enabled in your Firebase project.";
    case "auth/configuration-not-found":
      return "Firebase Authentication isn't set up for this project yet.";
    case "auth/network-request-failed":
      return "Network unavailable. Check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled by an administrator.";
    case "auth/invalid-custom-token":
      return "Sign-in token was rejected. Request a new code.";
    default:
      return error instanceof Error ? error.message : "Something went wrong.";
  }
}
