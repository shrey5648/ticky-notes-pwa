"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import { mathMarkdownIt } from "./markdown-it-plugins";
import { cn } from "@/lib/utils";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { MarkdownNodeState } from "./markdown-types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      insertMathInline: (latex?: string) => ReturnType;
      insertMathBlock: (latex?: string) => ReturnType;
    };
  }
}

/* ------------------------------------------------------------------ shared */

function useKatex(latex: string, displayMode: boolean) {
  return useMemo(() => {
    if (!latex.trim()) return null;
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: "html",
      });
    } catch (error) {
      console.error("[math] render failed", error);
      return null;
    }
  }, [latex, displayMode]);
}

function MathView({
  node,
  updateAttributes,
  selected,
  editor,
  displayMode,
}: ReactNodeViewProps & { displayMode: boolean }) {
  const latex = String(node.attrs.latex ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latex);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const html = useKatex(latex, displayMode);

  // A formula edited from another tab (or undone) must not be masked by a
  // stale draft the next time the field opens.
  useEffect(() => {
    if (!editing) setDraft(latex);
  }, [latex, editing]);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== latex) updateAttributes({ latex: draft });
    editor.commands.focus();
  }

  if (editing) {
    return (
      <NodeViewWrapper
        as={displayMode ? "div" : "span"}
        contentEditable={false}
        className={displayMode ? "my-3" : "inline"}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={displayMode ? Math.min(8, draft.split("\n").length + 1) : 1}
          spellCheck={false}
          aria-label={displayMode ? "Block formula (LaTeX)" : "Inline formula (LaTeX)"}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(latex);
              setEditing(false);
              editor.commands.focus();
              return;
            }
            // Block formulas are multi-line, so only inline ones commit on Enter.
            if (event.key === "Enter" && (!displayMode || event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              commit();
            }
          }}
          className={cn(
            "resize-none rounded border border-accent bg-elevated px-1.5 py-0.5",
            "font-mono text-[0.85em] text-fg focus:outline-none",
            displayMode ? "block w-full" : "inline-block align-middle"
          )}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={displayMode ? "div" : "span"}
      contentEditable={false}
      className={displayMode ? "my-3" : "inline"}
    >
      <span
        role="button"
        tabIndex={0}
        title="Click to edit formula"
        onMouseDown={(event) => {
          event.preventDefault();
          setEditing(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setEditing(true);
          }
        }}
        className={cn(
          "cursor-pointer rounded",
          displayMode ? "block px-2 py-1 text-center" : "inline-block px-0.5",
          selected ? "ring-2 ring-accent/60" : "hover:bg-accent/10",
          !html && "bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-muted"
        )}
      >
        {html ? (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          `${displayMode ? "$$" : "$"} empty formula`
        )}
      </span>
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------------- nodes */

const latexAttribute = {
  latex: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute("data-latex") ?? "",
    renderHTML: (attributes: Record<string, unknown>) => ({
      "data-latex": attributes.latex,
    }),
  },
};

/**
 * `$…$`. Like wiki links these must be nodes, not text: the Markdown
 * serializer escapes `\`, `_` and `*`, which would corrupt almost every
 * formula on the first autosave.
 */
export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes: () => latexAttribute,

  parseHTML() {
    return [{ tag: "span[data-math-inline]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-math-inline": "" })];
  },

  renderText({ node }) {
    return `$${node.attrs.latex}$`;
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: ReactNodeViewProps) => (
      <MathView {...props} displayMode={false} />
    ));
  },

  addCommands() {
    return {
      insertMathInline:
        (latex = "") =>
        ({ chain }) =>
          chain().focus().insertContent({ type: this.name, attrs: { latex } }).run(),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownNodeState, node: ProseMirrorNode) {
          state.write(`$${String(node.attrs.latex ?? "")}$`);
        },
        parse: { setup: mathMarkdownIt },
      },
    };
  },
});

/** `$$…$$` on its own lines. */
export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes: () => latexAttribute,

  parseHTML() {
    return [{ tag: "div[data-math-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-math-block": "" })];
  },

  renderText({ node }) {
    return `$$\n${node.attrs.latex}\n$$`;
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: ReactNodeViewProps) => (
      <MathView {...props} displayMode />
    ));
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex = "") =>
        ({ chain }) =>
          chain().focus().insertContent({ type: this.name, attrs: { latex } }).run(),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownNodeState, node: ProseMirrorNode) {
          state.write("$$\n");
          state.text(String(node.attrs.latex ?? ""), false);
          state.ensureNewLine();
          state.write("$$");
          state.closeBlock(node);
        },
        // Parsing is registered once by MathInline; markdown-it would throw on
        // a duplicate rule name.
      },
    };
  },
});
