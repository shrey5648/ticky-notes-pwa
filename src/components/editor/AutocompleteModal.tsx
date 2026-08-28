"use client";

import { useEffect, useMemo, useState } from "react";
import { CornerDownLeft, FileText } from "lucide-react";
import { fuzzyRank } from "@/lib/backlinks-parser";
import { cn } from "@/lib/utils";
import type { Note } from "@/types";

export interface AutocompletePosition {
  top: number;
  left: number;
}

interface Props {
  query: string;
  notes: Note[];
  position: AutocompletePosition;
  onSelect: (title: string) => void;
  onDismiss: () => void;
}

/**
 * Floating `[[` autocomplete. Keyboard handling lives here rather than in the
 * editor so arrow keys move the selection instead of the text cursor while the
 * dropdown is open; the listener runs in capture phase to win that race.
 */
export function AutocompleteModal({
  query,
  notes,
  position,
  onSelect,
  onDismiss,
}: Props) {
  const [active, setActive] = useState(0);

  const matches = useMemo(
    () => fuzzyRank(notes, query, (n) => n.title, 8),
    [notes, query]
  );

  // A new query changes what's under the cursor; keep the highlight in range.
  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          event.stopPropagation();
          setActive((i) => (matches.length ? (i + 1) % matches.length : 0));
          break;
        case "ArrowUp":
          event.preventDefault();
          event.stopPropagation();
          setActive((i) =>
            matches.length ? (i - 1 + matches.length) % matches.length : 0
          );
          break;
        case "Enter":
        case "Tab": {
          event.preventDefault();
          event.stopPropagation();
          // Enter with no match still completes — it creates a forward link to
          // a note the user intends to write later, which is the point of
          // wiki-style linking.
          const chosen = matches[active]?.title ?? query.trim();
          if (chosen) onSelect(chosen);
          break;
        }
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [matches, active, query, onSelect, onDismiss]);

  return (
    <div
      role="listbox"
      aria-label="Link to note"
      className="absolute z-40 w-72 overflow-hidden rounded-lg border border-border bg-elevated shadow-2xl"
      style={{ top: position.top, left: position.left }}
    >
      {matches.length === 0 ? (
        <div className="px-3 py-2.5 text-xs text-muted">
          {query.trim() ? (
            <>
              No note titled{" "}
              <span className="font-medium text-fg">{query.trim()}</span> — press
              Enter to link it anyway.
            </>
          ) : (
            "Type to search your notes…"
          )}
        </div>
      ) : (
        <ul className="max-h-64 overflow-y-auto py-1">
          {matches.map((note, index) => (
            <li key={note.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  // mousedown, not click: clicking must not blur the editor
                  // first, or the insertion point is lost.
                  event.preventDefault();
                  onSelect(note.title);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  index === active
                    ? "bg-accent/15 text-fg"
                    : "text-muted hover:text-fg"
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{note.title}</span>
                {index === active ? (
                  <CornerDownLeft className="ml-auto h-3 w-3 shrink-0 opacity-50" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
