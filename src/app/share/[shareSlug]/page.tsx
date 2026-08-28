"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDoc } from "firebase/firestore";
import { Check, Copy, Globe, Link as LinkIcon, ShieldOff } from "lucide-react";
import { ref, shareIndex, type ShareIndexEntry } from "@/lib/paths";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Spinner } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Note, Snippet } from "@/types";

type Shared =
  | { kind: "note"; note: Note }
  | { kind: "snippet"; snippet: Snippet };

/**
 * Public read-only view. Resolution is a two-step read:
 *   shares/{slug} -> { uid, entityId, kind }, then the entity itself.
 *
 * The security rules only allow the second read when `isPublic == true`, so
 * un-publishing a note makes existing links stop resolving immediately — the
 * slug index entry is deleted too, but the rule is what actually enforces it.
 */
export default function SharePage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();

  const [shared, setShared] = useState<Shared | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const indexSnap = await getDoc(shareIndex(shareSlug));
        if (!indexSnap.exists()) {
          if (!cancelled) setState("missing");
          return;
        }
        const entry = indexSnap.data() as ShareIndexEntry;

        const entitySnap = await getDoc(
          entry.kind === "note"
            ? ref.note(entry.uid, entry.entityId)
            : ref.snippet(entry.uid, entry.entityId)
        );

        // A permission-denied read also lands here: the rules reject anything
        // that isn't still marked public.
        if (!entitySnap.exists()) {
          if (!cancelled) setState("missing");
          return;
        }

        const data = { ...entitySnap.data(), id: entitySnap.id };
        if (cancelled) return;
        setShared(
          entry.kind === "note"
            ? { kind: "note", note: data as Note }
            : { kind: "snippet", snippet: data as Snippet }
        );
        setState("ready");
      } catch (error) {
        console.error("[share] could not resolve link", error);
        if (!cancelled) setState("missing");
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [shareSlug]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (state === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading…
        </span>
      </div>
    );
  }

  if (state === "missing" || !shared) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-sm text-center">
          <ShieldOff className="mx-auto h-8 w-8 text-muted" />
          <h1 className="mt-3 text-base font-semibold text-fg">
            This link isn&apos;t available
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            It may have been unpublished by its author, or the link is incorrect.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Go to S Notes
          </Link>
        </div>
      </div>
    );
  }

  const title = shared.kind === "note" ? shared.note.title : shared.snippet.title;
  const updatedAt =
    shared.kind === "note" ? shared.note.updatedAt : shared.snippet.updatedAt;

  return (
    <div className="min-h-dvh">
      {/* Deliberately no sidebar, no editor chrome, no private controls. */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-3">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-xs font-bold text-white">
              S
            </span>
            <span className="text-sm font-semibold text-fg">S Notes</span>
          </Link>
          <span className="ml-1 flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
            <Globe className="h-2.5 w-2.5" /> Public
          </span>

          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
              setCopied(true);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition hover:bg-elevated hover:text-fg"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-fg">{title}</h1>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <LinkIcon className="h-3 w-3" />
          Read-only · last updated {formatDate(updatedAt)}
        </p>

        <div className="mt-8">
          {shared.kind === "note" ? (
            <MarkdownPreview
              content={shared.note.content ?? ""}
              readOnly
              className="prose-base"
            />
          ) : (
            <MarkdownPreview
              readOnly
              content={`\`\`\`${shared.snippet.language}\n${shared.snippet.code ?? ""}\n\`\`\``}
            />
          )}
        </div>

        <footer className="mt-16 border-t border-border pt-5 text-xs text-muted">
          Published with{" "}
          <Link href="/" className="text-accent hover:underline">
            S Notes
          </Link>
          .
        </footer>
      </main>
    </div>
  );
}
