import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { OTP_TTL_MS } from "./otp";

const host = process.env.SMTP_HOST;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

export const isMailConfigured = Boolean(host && user && pass);

let cached: Transporter | null = null;

function transporter(): Transporter {
  if (cached) return cached;
  if (!isMailConfigured) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS."
    );
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  cached = nodemailer.createTransport({
    host,
    port,
    // Port 465 is implicit TLS; 587 upgrades via STARTTLS.
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
  return cached;
}

/** Verifies SMTP credentials without sending. */
export async function verifyMailer(): Promise<void> {
  await transporter().verify();
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const minutes = Math.round(OTP_TTL_MS / 60000);
  const from = process.env.SMTP_FROM || user;

  await transporter().sendMail({
    from,
    to: email,
    subject: `${code} is your S Notes sign-in code`,
    // Plain text isn't a nicety — some clients render it by default, and
    // spam filters penalize HTML-only mail.
    text: [
      `Your S Notes sign-in code is ${code}.`,
      ``,
      `It expires in ${minutes} minutes and can only be used once.`,
      `If you didn't request this, you can ignore this email — no one can`,
      `sign in without the code.`,
    ].join("\n"),
    html: otpHtml(code, minutes),
  });
}

function otpHtml(code: string, minutes: number): string {
  // Inline styles and a table layout: email clients strip <style> blocks and
  // have no reliable flexbox support.
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:32px;">
          <tr><td style="padding-bottom:20px;">
            <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;background:#3b82f6;color:#ffffff;border-radius:6px;font-weight:700;font-size:14px;">S</span>
            <span style="margin-left:8px;font-size:15px;font-weight:600;color:#18181b;vertical-align:middle;">S Notes</span>
          </td></tr>
          <tr><td style="font-size:15px;color:#18181b;padding-bottom:6px;font-weight:600;">Your sign-in code</td></tr>
          <tr><td style="font-size:13px;color:#71717a;padding-bottom:20px;line-height:1.5;">
            Enter this code to finish signing in. It expires in ${minutes} minutes and can only be used once.
          </td></tr>
          <tr><td align="center" style="padding-bottom:20px;">
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#18181b;background:#f4f4f5;border-radius:8px;padding:16px 8px;">${code}</div>
          </td></tr>
          <tr><td style="font-size:12px;color:#a1a1aa;line-height:1.5;border-top:1px solid #e4e4e7;padding-top:16px;">
            Didn't request this? You can safely ignore this email — no one can sign in without the code.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
