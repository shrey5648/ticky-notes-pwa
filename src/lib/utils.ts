import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Stamp } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Firestore Timestamp -> Date, tolerating the null window before the
 *  server value resolves in the local cache. */
export function toDate(stamp: Stamp): Date | null {
  if (!stamp) return null;
  try {
    return stamp.toDate();
  } catch {
    return null;
  }
}

export function formatDate(stamp: Stamp, fallback = "—"): string {
  const d = toDate(stamp);
  if (!d) return fallback;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function relativeTime(stamp: Stamp): string {
  return relativeTimeFrom(toDate(stamp));
}

/** Same formatting for values that were never Firestore Timestamps — the
 *  admin API returns plain epoch milliseconds. */
export function relativeTimeFromMs(ms: number | null | undefined): string {
  return ms ? relativeTimeFrom(new Date(ms)) : "Never";
}

function relativeTimeFrom(d: Date | null): string {
  if (!d) return "just now";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
    [604800, "week"],
    [2592000, "month"],
    [31536000, "year"],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  let divisor = 1;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [threshold, u] of units) {
    if (seconds < threshold * 60 || u === "year") {
      divisor = threshold;
      unit = u;
      break;
    }
  }
  return rtf.format(-Math.floor(seconds / divisor), unit);
}

/** Slug-safe filename for the ZIP exporter. */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .toLowerCase()
      .slice(0, 80) || "untitled"
  );
}

export function wordCount(markdown: string): number {
  const text = markdown.replace(/```[\s\S]*?```/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}
