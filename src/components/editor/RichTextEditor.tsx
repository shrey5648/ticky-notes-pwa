"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { activeWikiLinkQuery } from "@/lib/backlinks-parser";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./EditorToolbar";
import {
  AutocompleteModal,
  type AutocompletePosition,
} from "./AutocompleteModal";
import { buildExtensions } from "./tiptap/extensions";
import { NoteLookupProvider } from "./tiptap/notes-context";
import type { Note } from "@/types";

const PLACEHOLDER =
  "Start writing… Markdown shortcuts work as you type, and [[ links another note.";

interface Props {
  /** Markdown. Changes are adopted only when they differ from what we emitted. */
  content: string;
  /** All notes, for `[[` autocomplete and resolving link pills. */
  allNotes: Note[];
  currentNoteId: string;
  zen?: boolean;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
}

interface WikiState {
  query: string;
  from: number;
  to: number;
  position: AutocompletePosition;
}

export function RichTextEditor({
  content,
  allNotes,
  currentNoteId,
  zen = false,
  onChange,
  onBlur,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wiki, setWiki] = useState<WikiState | null>(null);
  /** Doc position of a popup the user dismissed, so Escape stays dismissed. */
  const dismissedAt = useRef<number | null>(null);

  // The last Markdown this component put into, or took out of, the editor.
  // Remote snapshots that match it are our own write echoing back and must not
  // reset the document (and with it the caret).
  const applied = useRef(content);

  const extensions = useMemo(() => buildExtensions(PLACEHOLDER), []);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const editor = useEditor({
    extensions,
    content,
    // Next.js renders this component on the server first; building the editor
    // there would mismatch on hydration.
    immediatelyRender: false,
    editorProps: {
      // Only what never changes: ProseMirror re-applies these from the props
      // object it was built with, so anything mode-dependent lives on the
      // wrapper below instead.
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Note content",
        class: "focus:outline-none",
      },
    },
    onUpdate({ editor: instance }) {
      const markdown = instance.storage.markdown.getMarkdown();
      applied.current = markdown;
      onChangeRef.current(markdown);
    },
    onBlur() {
      onBlurRef.current?.();
    },
  });

  /* ------------------------------------------------------------ remote sync */

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content === applied.current) return;
    applied.current = content;
    // emitUpdate: false — adopting a remote value is not a local edit and must
    // not queue a save that would echo it straight back.
    editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);

  /* -------------------------------------------------- [[ ]] autocompletion */

  useEffect(() => {
    if (!editor) return;

    function refresh() {
      if (!editor || editor.isDestroyed) return;
      const active = findWikiQuery(editor);
      if (!active) {
        dismissedAt.current = null;
        setWiki(null);
        return;
      }
      if (dismissedAt.current === active.from) {
        setWiki(null);
        return;
      }
      setWiki({
        ...active,
        position: caretPosition(editor, active.from, containerRef.current),
      });
    }

    editor.on("transaction", refresh);
    editor.on("focus", refresh);
    return () => {
      editor.off("transaction", refresh);
      editor.off("focus", refresh);
    };
  }, [editor]);

  const insertLink = useCallback(
    (title: string) => {
      if (!editor || !wiki) return;
      dismissedAt.current = null;
      setWiki(null);
      editor.commands.insertWikiLink({
        target: title,
        range: { from: wiki.from, to: wiki.to },
      });
    },
    [editor, wiki]
  );

  const dismiss = useCallback(() => {
    dismissedAt.current = wiki?.from ?? null;
    setWiki(null);
    editor?.commands.focus();
  }, [editor, wiki]);

  /* ----------------------------------------------------------------- render */

  const candidates = useMemo(
    () => allNotes.filter((note) => note.id !== currentNoteId),
    [allNotes, currentNoteId]
  );

  return (
    <NoteLookupProvider notes={allNotes}>
      <div className="flex min-h-0 flex-1 flex-col">
        {editor && !zen ? <EditorToolbar editor={editor} /> : null}

        <div
          ref={containerRef}
          className="relative min-h-0 flex-1 overflow-y-auto"
          // Clicking the empty space under a short note should put the caret in
          // it, the way a textarea does.
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget || !editor) return;
            event.preventDefault();
            editor.commands.focus("end");
          }}
        >
          {/* Typography lives on the wrapper rather than the editable element
              so switching to zen is a plain React re-render. */}
          <EditorContent
            editor={editor}
            className={cn(
              "prose prose-sm min-h-full max-w-none dark:prose-invert",
              "prose-headings:scroll-mt-24 prose-a:text-accent",
              "prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:m-0 prose-pre:border-0 prose-pre:bg-transparent prose-pre:p-0",
              zen ? "mx-auto w-full max-w-zen px-6 py-16" : "px-5 py-4"
            )}
          />

          {wiki ? (
            <AutocompleteModal
              query={wiki.query}
              notes={candidates}
              position={wiki.position}
              onSelect={insertLink}
              onDismiss={dismiss}
            />
          ) : null}
        </div>
      </div>
    </NoteLookupProvider>
  );
}

/* ------------------------------------------------------------------ helpers */

/**
 * An unterminated `[[` in the block the caret sits in.
 *
 * Inline atoms (existing link pills, formulas) each contribute one character to
 * `textBetween`, so string offsets map 1:1 onto document positions and the
 * shared `activeWikiLinkQuery` can be reused verbatim.
 */
function findWikiQuery(
  editor: Editor
): { query: string; from: number; to: number } | null {
  const { selection, doc } = editor.state;
  if (!selection.empty) return null;

  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parent.type.spec.code) return null;

  const blockStart = $from.start();
  const textBefore = doc.textBetween(blockStart, $from.pos, "\n", "￼");
  const active = activeWikiLinkQuery(textBefore, textBefore.length);
  if (!active) return null;

  return {
    query: active.query,
    from: blockStart + active.start,
    to: $from.pos,
  };
}

/** Caret coordinates relative to the scroll container the popup lives in. */
function caretPosition(
  editor: Editor,
  pos: number,
  container: HTMLElement | null
): AutocompletePosition {
  if (!container) return { top: 24, left: 24 };

  try {
    const caret = editor.view.coordsAtPos(pos);
    const box = container.getBoundingClientRect();
    const top = caret.bottom - box.top + container.scrollTop + 4;
    const left = caret.left - box.left;
    // Keep the 288px-wide popup inside the pane.
    const maxLeft = Math.max(8, container.clientWidth - 288);
    return { top, left: Math.min(Math.max(8, left), maxLeft) };
  } catch (error) {
    console.error("[editor] caret position failed", error);
    return { top: 24, left: 24 };
  }
}
