"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { useBacklinks } from "@/lib/firestore-hooks";
import { parseWikiLinks, stripCodeBlocks } from "@/lib/backlinks-parser";
import { Spinner } from "@/components/ui";
import { relativeTime } from "@/lib/utils";
import type { Note } from "@/types";

/**
 * "Referenced In" card. Reactive by construction: it queries
 * `outgoingLinks array-contains <this note's title>`, and every save re-derives
 * `outgoingLinks`, so links appear here as soon as the other note is saved —
 * there is no separate index to maintain.
 *
 * Renaming a note does not rewrite links pointing at the old title. That's
 * deliberate and matches how wiki-link tools behave: the link stays a link to a
 * title, and this footer simply stops matching until the referrer is updated.
 */
export function BacklinksFooter({ note }: { note: Note }) {
  const { backlinks, loading } = useBacklinks(note.title);

  // A note that links to itself would otherwise show up in its own footer.
  const referrers = backlinks.filter((b) => b.id !== note.id);

  if (loading) {
    return (
      <section className="mt-10 rounded-xl border border-border bg-surface p-4">
        <Header count={null} />
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Spinner className="h-3 w-3" /> Looking for references…
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-xl border border-border bg-surface p-4">
      <Header count={referrers.length} />
      {referrers.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          No other note links here yet. Type{" "}
          <code className="rounded bg-elevated px-1 py-0.5">
            [[{note.title}]]
          </code>{" "}
          elsewhere to create a reference.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {referrers.map((referrer) => (
            <li key={referrer.id}>
              <Link
                href={`/notes/${referrer.id}`}
                className="block rounded-lg border border-border bg-elevated px-3 py-2 transition hover:border-accent/50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-fg">
                    {referrer.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {relativeTime(referrer.updatedAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">
                  {excerptAround(referrer.content, note.title)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Header({ count }: { count: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <Link2 className="h-4 w-4 text-muted" />
      <h2 className="text-sm font-semibold text-fg">Referenced In</h2>
      {count !== null ? (
        <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-muted">
          {count}
        </span>
      ) : null}
    </div>
  );
}

/** Shows the sentence around the link so the reference has context. */
function excerptAround(content: string, title: string): string {
  const body = stripCodeBlocks(content ?? "");
  const link = parseWikiLinks(body).find(
    (l) => l.target.toLowerCase() === title.toLowerCase()
  );
  if (!link) return body.slice(0, 160).trim();
  const start = Math.max(0, link.start - 80);
  const end = Math.min(body.length, link.end + 80);
  const text = body
    .slice(start, end)
    .replace(/\s+/g, " ")
    .replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (_, t, alias) => alias ?? t)
    .trim();
  return `${start > 0 ? "… " : ""}${text}${end < body.length ? " …" : ""}`;
}
