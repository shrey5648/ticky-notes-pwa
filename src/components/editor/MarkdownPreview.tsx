"use client";

import Link from "next/link";
import { useMemo, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { wikiLinksToMarkdown } from "@/lib/backlinks-parser";
import { cn } from "@/lib/utils";
import type { Note } from "@/types";

interface Props {
  content: string;
  /** Used to resolve `[[Title]]` to a real note id. Omit in public views. */
  notes?: Note[];
  className?: string;
  /** Public share views must not offer navigation into private notes. */
  readOnly?: boolean;
}

/**
 * Renders GitHub-flavored Markdown with math and syntax highlighting.
 *
 * `[[Wiki Links]]` are rewritten to ordinary Markdown links before parsing, so
 * the renderer needs no custom plugin — the anchor component below turns them
 * back into pills.
 */
export function MarkdownPreview({
  content,
  notes,
  className,
  readOnly = false,
}: Props) {
  const idByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of notes ?? []) map.set(note.title.toLowerCase(), note.id);
    return map;
  }, [notes]);

  const source = useMemo(
    () => wikiLinksToMarkdown(content, (t) => idByTitle.get(t.toLowerCase())),
    [content, idByTitle]
  );

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-pre:border prose-pre:border-border prose-pre:bg-elevated",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-headings:scroll-mt-24 prose-a:text-accent",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={{
          a({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
            const target = href ?? "";

            // Unresolved wiki link — the note doesn't exist yet.
            if (target.startsWith("#new=")) {
              const title = decodeURIComponent(target.slice(5));
              return (
                <span
                  title={
                    readOnly
                      ? `Links to "${title}"`
                      : `No note titled "${title}" yet`
                  }
                  className="rounded bg-elevated px-1.5 py-0.5 text-[0.9em] font-medium text-muted no-underline ring-1 ring-inset ring-border"
                >
                  {children}
                </span>
              );
            }

            // Resolved wiki link — a pill that navigates internally.
            if (target.startsWith("/notes/")) {
              if (readOnly) {
                return (
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[0.9em] font-medium text-accent no-underline">
                    {children}
                  </span>
                );
              }
              return (
                <Link
                  href={target}
                  className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent no-underline hover:bg-accent/20"
                >
                  {children}
                </Link>
              );
            }

            return (
              <a href={target} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
          input(props: ComponentPropsWithoutRef<"input">) {
            // GFM task-list checkboxes: visible, but not editable from preview.
            return (
              <input
                {...props}
                disabled
                className="mr-1.5 h-3.5 w-3.5 rounded border-border align-middle accent-accent"
              />
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
