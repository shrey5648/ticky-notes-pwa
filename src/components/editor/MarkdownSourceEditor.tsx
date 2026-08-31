"use client";

import { useCallback, useRef, useState } from "react";
import { activeWikiLinkQuery } from "@/lib/backlinks-parser";
import { cn } from "@/lib/utils";
import {
  AutocompleteModal,
  type AutocompletePosition,
} from "./AutocompleteModal";
import type { Note } from "@/types";

interface Props {
  content: string;
  allNotes: Note[];
  currentNoteId: string;
  zen?: boolean;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
}

/**
 * Raw Markdown editing — the escape hatch behind the rich-text surface, for
 * pasting Markdown wholesale or fixing anything the WYSIWYG view can't express.
 */
export function MarkdownSourceEditor({
  content,
  allNotes,
  currentNoteId,
  zen = false,
  onChange,
  onBlur,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const [autocomplete, setAutocomplete] = useState<{
    query: string;
    start: number;
    position: AutocompletePosition;
  } | null>(null);

  const updateAutocomplete = useCallback((value: string, cursor: number) => {
    const active = activeWikiLinkQuery(value, cursor);
    if (!active) {
      setAutocomplete(null);
      return;
    }
    setAutocomplete({
      query: active.query,
      start: active.start,
      position: caretPosition(textareaRef.current, mirrorRef.current, cursor),
    });
  }, []);

  const insertLink = useCallback(
    (linkTitle: string) => {
      const textarea = textareaRef.current;
      if (!textarea || !autocomplete) return;
      const cursor = textarea.selectionStart;
      const before = content.slice(0, autocomplete.start);
      const after = content.slice(cursor);
      const inserted = `[[${linkTitle}]]`;
      const caret = before.length + inserted.length;

      onChange(before + inserted + after);
      setAutocomplete(null);

      // Restore focus and place the caret past the inserted link.
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      });
    },
    [autocomplete, content, onChange]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => {
          onChange(event.target.value);
          updateAutocomplete(event.target.value, event.target.selectionStart);
        }}
        onClick={(event) =>
          updateAutocomplete(content, event.currentTarget.selectionStart)
        }
        onKeyUp={(event) => {
          // Arrow keys can move the caret out of an open `[[`.
          if (event.key.startsWith("Arrow")) {
            updateAutocomplete(content, event.currentTarget.selectionStart);
          }
        }}
        onBlur={onBlur}
        spellCheck
        placeholder={"Start writing…\n\nType [[ to link another note."}
        aria-label="Markdown source"
        className={cn(
          "min-h-0 flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed",
          "text-fg placeholder:text-muted focus:outline-none",
          zen ? "mx-auto w-full max-w-zen px-6 py-16" : "px-5 py-4"
        )}
      />

      {/* Invisible mirror used to measure caret position for the popup. */}
      <div
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 select-none opacity-0"
      />

      {autocomplete ? (
        <AutocompleteModal
          query={autocomplete.query}
          notes={allNotes.filter((note) => note.id !== currentNoteId)}
          position={autocomplete.position}
          onSelect={insertLink}
          onDismiss={() => setAutocomplete(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Textareas expose no caret coordinates, so the popup is positioned by
 * rendering the text before the caret into a mirror div that copies the
 * textarea's box and font metrics, then reading the offset of a marker span.
 */
function caretPosition(
  textarea: HTMLTextAreaElement | null,
  mirror: HTMLDivElement | null,
  cursor: number
): AutocompletePosition {
  if (!textarea || !mirror) return { top: 24, left: 24 };

  const style = window.getComputedStyle(textarea);
  const props = [
    "boxSizing",
    "width",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderWidth",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textTransform",
  ] as const;
  for (const prop of props) {
    mirror.style[prop as never] = style[prop as never];
  }
  mirror.style.position = "absolute";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.visibility = "hidden";
  mirror.style.height = "auto";

  mirror.textContent = textarea.value.slice(0, cursor);
  const marker = document.createElement("span");
  // A zero-width space collapses; a real glyph gives the span a box to measure.
  marker.textContent = ".";
  mirror.appendChild(marker);

  const lineHeight = parseFloat(style.lineHeight) || 20;
  const top = marker.offsetTop - textarea.scrollTop + lineHeight + 4;
  const left = marker.offsetLeft;

  mirror.textContent = "";

  // Keep the 288px-wide popup inside the pane.
  const maxLeft = Math.max(8, textarea.clientWidth - 288);
  return { top, left: Math.min(Math.max(8, left), maxLeft) };
}
