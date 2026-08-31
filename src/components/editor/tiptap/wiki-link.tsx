"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useRouter } from "next/navigation";
import { wikiLinkMarkdownIt } from "./markdown-it-plugins";
import { useNoteLookup } from "./notes-context";
import { cn } from "@/lib/utils";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { MarkdownNodeState } from "./markdown-types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      /** Replaces `range` with a link pill; `range` omitted inserts at the cursor. */
      insertWikiLink: (attrs: {
        target: string;
        label?: string | null;
        range?: { from: number; to: number };
      }) => ReturnType;
    };
  }
}

function WikiLinkView({ node }: ReactNodeViewProps) {
  const router = useRouter();
  const { resolve } = useNoteLookup();

  const target = String(node.attrs.target ?? "");
  const label = (node.attrs.label as string | null) ?? target;
  const noteId = resolve(target);

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        role={noteId ? "link" : undefined}
        tabIndex={noteId ? 0 : undefined}
        title={noteId ? `Open "${target}"` : `No note titled "${target}" yet`}
        // The editor owns the caret, so navigation runs on mousedown before
        // ProseMirror can turn the click into a selection change.
        onMouseDown={(event) => {
          if (!noteId || event.button !== 0) return;
          event.preventDefault();
          router.push(`/notes/${noteId}`);
        }}
        onKeyDown={(event) => {
          if (!noteId || event.key !== "Enter") return;
          event.preventDefault();
          router.push(`/notes/${noteId}`);
        }}
        className={cn(
          "rounded px-1.5 py-0.5 text-[0.9em] font-medium",
          noteId
            ? "cursor-pointer bg-accent/10 text-accent hover:bg-accent/20"
            : "bg-elevated text-muted ring-1 ring-inset ring-border"
        )}
      >
        {label}
      </span>
    </NodeViewWrapper>
  );
}

/**
 * `[[Note Title]]` as a single atomic node.
 *
 * It has to be a node rather than plain text because the Markdown serializer
 * escapes bare `[` and `]`, which would rewrite every link to `\[\[…\]\]` on
 * the first save and break the backlink index.
 */
export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      target: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-target") ?? "",
        renderHTML: (attributes) => ({ "data-target": attributes.target }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) =>
          attributes.label ? { "data-label": attributes.label } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-link]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-wiki-link": "" }),
      (node.attrs.label as string | null) ?? String(node.attrs.target ?? ""),
    ];
  },

  // Copying a pill out of the editor should yield the syntax back.
  renderText({ node }) {
    return serializeWikiLink(node.attrs.target, node.attrs.label);
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView);
  },

  addCommands() {
    return {
      insertWikiLink:
        ({ target, label = null, range }) =>
        ({ chain }) => {
          const content = {
            type: this.name,
            attrs: { target, label: label && label !== target ? label : null },
          };
          return range
            ? chain()
                .focus()
                .insertContentAt(range, [content, { type: "text", text: " " }])
                .run()
            : chain()
                .focus()
                .insertContent([content, { type: "text", text: " " }])
                .run();
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownNodeState, node: ProseMirrorNode) {
          state.write(serializeWikiLink(node.attrs.target, node.attrs.label));
        },
        parse: { setup: wikiLinkMarkdownIt },
      },
    };
  },
});

function serializeWikiLink(target: unknown, label: unknown): string {
  const to = String(target ?? "").trim();
  const alias = label == null ? null : String(label).trim();
  return alias && alias !== to ? `[[${to}|${alias}]]` : `[[${to}]]`;
}
