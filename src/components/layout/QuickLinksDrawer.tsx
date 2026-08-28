"use client";

import { useState } from "react";
import { ExternalLink, Link as LinkIcon, Plus, X } from "lucide-react";
import { useQuickLinkActions, useQuickLinks } from "@/lib/firestore-hooks";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "h-7 w-full rounded border border-border bg-surface px-2 text-[11px] text-fg",
  "placeholder:text-muted focus:border-accent focus:outline-none"
);

/** Pinned bookmarks in the sidebar — Figma files, dashboards, docs. */
export function QuickLinksDrawer() {
  const { quickLinks } = useQuickLinks();
  const actions = useQuickLinkActions();

  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  async function submit() {
    const trimmed = url.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    // Bare hostnames are the common case when pasting; assume https.
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      await actions.create({
        title: title.trim() || hostnameOf(normalized),
        url: normalized,
      });
    } catch (error) {
      console.error("[quicklinks] create failed", error);
    }
    setTitle("");
    setUrl("");
    setAdding(false);
  }

  return (
    <div className="border-t border-border px-2 py-2">
      <div className="flex items-center gap-1.5 px-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted transition hover:text-fg"
        >
          <LinkIcon className="h-3 w-3" />
          Quick links
        </button>
        <button
          type="button"
          aria-label="Add quick link"
          onClick={() => {
            setOpen(true);
            setAdding(true);
          }}
          className="rounded p-1 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {open ? (
        <div className="mt-1 space-y-0.5">
          {quickLinks.map((link) => (
            <div
              key={link.id}
              className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-elevated"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted transition hover:text-fg"
              >
                {link.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={link.favicon}
                    alt=""
                    width={14}
                    height={14}
                    className="shrink-0 rounded-sm"
                    // A dead favicon host shouldn't leave a broken-image icon.
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <ExternalLink className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{link.title}</span>
              </a>
              <button
                type="button"
                aria-label={`Remove ${link.title}`}
                onClick={() => void actions.remove(link.id)}
                className="shrink-0 text-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="space-y-1 px-1.5 py-1">
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Label (optional)"
                className={inputClass}
              />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                  if (event.key === "Escape") setAdding(false);
                }}
                placeholder="https://…"
                className={inputClass}
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={submit}
                  className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-white"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded px-2 py-1 text-[11px] text-muted hover:text-fg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {!quickLinks.length && !adding ? (
            <p className="px-1.5 py-1 text-[11px] text-muted">No links pinned yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
