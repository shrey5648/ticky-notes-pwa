"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, MailCheck, UserRound } from "lucide-react";
import { authErrorMessage, useAuth } from "@/lib/auth-context";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;

type Step = "email" | "code";

/**
 * Passwordless sign-in. There is no separate register flow: a code proves
 * control of the mailbox, and the verify route creates the account on first
 * use, so "sign in" and "sign up" are the same three keystrokes.
 */
export function AuthForm() {
  const router = useRouter();
  const {
    user,
    loading,
    configured,
    requestOtp,
    verifyOtp,
    signInGoogle,
    signInGuest,
  } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [busy, setBusy] = useState<null | "send" | "verify" | "google" | "guest">(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // An already-authenticated visitor has no business on the auth screen.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  // Mirrors the server's rate limit, so the button is disabled rather than
  // failing with a 429.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") inputsRef.current[0]?.focus();
  }, [step]);

  const code = digits.join("");

  async function sendCode(resend = false) {
    if (busy) return;
    setBusy("send");
    setError(null);
    try {
      const result = await requestOtp(email);
      setStep("code");
      setDigits(Array(CODE_LENGTH).fill(""));
      setResendIn(result.resendAfterSeconds);
      setNotice(
        resend
          ? "A new code is on its way."
          : `Code sent to ${email}. It expires in ${Math.round(
              result.expiresInSeconds / 60
            )} minutes.`
      );
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function submitCode(value: string) {
    if (busy || value.length !== CODE_LENGTH) return;
    setBusy("verify");
    setError(null);
    try {
      await verifyOtp(email, value);
      router.replace("/");
    } catch (caught) {
      setError(authErrorMessage(caught));
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setBusy(null);
    }
  }

  function setDigit(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();

    // Auto-submit once the last box is filled — one less click on the common
    // path, and the code is useless without a submit anyway.
    const joined = next.join("");
    if (joined.length === CODE_LENGTH && !next.includes("")) {
      void submitCode(joined);
    }
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      // Backspace on an empty box steps back, matching every OTP field users
      // have already learned.
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    // Codes are almost always pasted from the email, so a paste into any box
    // must fill the whole field rather than a single digit.
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array<string>(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH) void submitCode(pasted);
  }

  async function runProvider(
    kind: "google" | "guest",
    action: () => Promise<void>
  ) {
    setBusy(kind);
    setError(null);
    try {
      await action();
      router.replace("/");
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <div>
            <h1 className="text-base font-semibold text-fg">
              {step === "email" ? "Sign in to S Notes" : "Check your email"}
            </h1>
            <p className="text-xs text-muted">
              {step === "email"
                ? "We'll email you a one-time code — no password needed."
                : `Enter the ${CODE_LENGTH}-digit code sent to ${email}.`}
            </p>
          </div>
        </div>

        {!configured ? (
          <div className="mb-4 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Firebase isn&apos;t configured yet.</p>
              <p className="mt-1 text-amber-500/80">
                Copy <code>.env.example</code> to <code>.env.local</code>, fill in
                the Firebase, Admin SDK and SMTP values, then restart the dev
                server.
              </p>
            </div>
          </div>
        ) : null}

        {step === "email" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendCode();
            }}
            className="space-y-3"
          >
            <label className="block text-xs font-medium text-muted">
              Email
              <Input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1"
              />
            </label>

            {error ? (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              disabled={!configured || !email.trim() || busy !== null}
            >
              {busy === "send" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailCheck className="h-4 w-4" />
              )}
              Email me a code
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div
              role="group"
              aria-label="One-time code"
              className="flex justify-between gap-1.5"
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event)}
                  onPaste={onPaste}
                  onFocus={(event) => event.target.select()}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  aria-label={`Digit ${index + 1}`}
                  disabled={busy === "verify"}
                  className={cn(
                    "h-12 w-full rounded-lg border bg-surface text-center font-mono text-lg text-fg",
                    "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
                    "disabled:opacity-60",
                    error ? "border-red-500/60" : "border-border"
                  )}
                />
              ))}
            </div>

            {error ? (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            ) : notice ? (
              <p className="text-xs text-muted">{notice}</p>
            ) : null}

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => void submitCode(code)}
              disabled={code.length !== CODE_LENGTH || busy !== null}
            >
              {busy === "verify" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Verify and sign in
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                  setNotice(null);
                }}
                className="flex items-center gap-1 text-muted transition hover:text-fg"
              >
                <ArrowLeft className="h-3 w-3" /> Use another email
              </button>

              <button
                type="button"
                onClick={() => void sendCode(true)}
                disabled={resendIn > 0 || busy !== null}
                className="text-accent transition hover:underline disabled:text-muted disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        <div className="my-4 flex items-center gap-3 text-[11px] text-muted">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Button
            className="w-full justify-center"
            disabled={!configured || busy !== null}
            onClick={() => void runProvider("google", signInGoogle)}
          >
            {busy === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleMark />
            )}
            Continue with Google
          </Button>

          <Button
            className="w-full justify-center"
            disabled={!configured || busy !== null}
            onClick={() => void runProvider("guest", signInGuest)}
          >
            {busy === "guest" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            Continue as guest
          </Button>
          <p className="text-[11px] text-muted">
            Guest workspaces live on this device only and are lost if you clear
            site data.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
