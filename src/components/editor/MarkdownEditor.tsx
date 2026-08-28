"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  Check,
  Columns2,
  Expand,
  FileText,
  Loader2,
  Minimize2,
  PencilLine,
} from "lucide-react";
import { activeWikiLinkQuery } from "@/lib/backlinks-parser";
import { cn, wordCount } from "@/lib/utils";
import { useNoteActions } from "@/lib/firestore-hooks";
import { MarkdownPreview } from "./MarkdownPreview";
import {
  AutocompleteModal,
  type AutocompletePosition,
} from "./AutocompleteModal";
import { Tooltip } from "@/components/ui";
import type { Note, SaveState } from "@/types";

export type ViewMode = "edit" | "split" | "zen";

const AUTOSAVE_MS = 300;

interface Props {
  note: Note;
  /** All notes in the workspace, for `[[` autocomplete and link resolution. */
  allNotes: Note[];
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function MarkdownEditor({ note, allNotes, mode, onModeChange }: Props) {
  const { save } = useNoteActions();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [autocomplete, setAutocomplete] = useState<{
    query: string;
    start: number;
    position: AutocompletePosition;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<{ title?: string; content?: string }>({});
  /** True while the user has unsaved keystrokes. */
  const dirty = useRef(false);

  /* ------------------------------------------------------------ remote sync */

  // Firestore pushes the doc back after every write (and after edits made in
  // another tab). Only adopt remote values when we have nothing unsaved,
  // otherwise a slow round-trip would overwrite keystrokes.
  useEffect(() => {
    if (dirty.current) return;
    setTitle(note.title);
    setContent(note.content ?? "");
  }, [note.title, note.content]);

  // Switching to a different note must reset dirty state outright.
  useEffect(() => {
    dirty.current = false;
    pending.current = {};
    setSaveState("idle");
    setAutocomplete(null);
  }, [note.id]);

  /* --------------------------------------------------------------- autosave */

  const flush = useCallback(async () => {
    const patch = pending.current;
    if (patch.title === undefined && patch.content === undefined) return;
    pending.current = {};
    setSaveState("saving");
    try {
      await save(note.id, patch);
      dirty.current = false;
      setSaveState("saved");
    } catch (error) {
      console.error("[editor] autosave failed", error);
      // Put the patch back so the next keystroke retries it rather than
      // silently dropping the user's work.
      pending.current = { ...patch, ...pending.current };
      setSaveState("error");
    }
  }, [note.id, save]);

  const queueSave = useCallback(
    (patch: { title?: string; content?: string }) => {
      dirty.current = true;
      pending.current = { ...pending.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush]
  );

  // Unmounting mid-debounce (navigating away) would lose the last few hundred
  // milliseconds of typing, so flush on the way out.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void flush();
    };
  }, [flush]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty.current) return;
      void flush();
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [flush]);

  // "Saved" is a transient confirmation, not a permanent state.
  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = setTimeout(() => setSaveState("idle"), 1600);
    return () => clearTimeout(timer);
  }, [saveState]);

  /* --------------------------------------------------- [[ ]] autocompletion */

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

  const handleContentChange = (value: string, cursor: number) => {
    setContent(value);
    queueSave({ content: value });
    updateAutocomplete(value, cursor);
  };

  const insertLink = useCallback(
    (linkTitle: string) => {
      const textarea = textareaRef.current;
      if (!textarea || !autocomplete) return;
      const cursor = textarea.selectionStart;
      const before = content.slice(0, autocomplete.start);
      const after = content.slice(cursor);
      const inserted = `[[${linkTitle}]]`;
      const next = before + inserted + after;
      const caret = before.length + inserted.length;

      setContent(next);
      queueSave({ content: next });
      setAutocomplete(null);

      // Restore focus and place the caret past the inserted link.
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      });
    },
    [autocomplete, content, queueSave]
  );

  /* ---------------------------------------------------- synchronized scroll */

  // Split view scrolls proportionally rather than line-for-line: mapping source
  // lines to rendered blocks would need a position map the renderer doesn't
  // expose, and proportional tracking is accurate enough to stay oriented.
  const syncingFrom = useRef<"editor" | "preview" | null>(null);

  const syncScroll = (from: "editor" | "preview") => () => {
    if (mode !== "split") return;
    if (syncingFrom.current && syncingFrom.current !== from) return;
    const source = from === "editor" ? textareaRef.current : previewRef.current;
    const target = from === "editor" ? previewRef.current : textareaRef.current;
    if (!source || !target) return;

    const sourceRange = source.scrollHeight - source.clientHeight;
    const targetRange = target.scrollHeight - target.clientHeight;
    if (sourceRange <= 0 || targetRange <= 0) return;

    syncingFrom.current = from;
    target.scrollTop = (source.scrollTop / sourceRange) * targetRange;
    requestAnimationFrame(() => {
      syncingFrom.current = null;
    });
  };

  /* ------------------------------------------------------------------ chrome */

  const words = useMemo(() => wordCount(content), [content]);
  const isZen = mode === "zen";

  // Zen collapses everything around the text, so Escape needs to be a way out.
  useEffect(() => {
    if (!isZen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !autocomplete) onModeChange("edit");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isZen, autocomplete, onModeChange]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isZen && "fixed inset-0 z-40 bg-bg"
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            queueSave({ title: event.target.value });
          }}
          placeholder="Untitled note"
          aria-label="Note title"
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-fg placeholder:text-muted focus:outline-none"
        />

        <SaveIndicator state={saveState} />

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          <ModeButton
            active={mode === "edit"}
            label="Editor"
            onClick={() => onModeChange("edit")}
          >
            <PencilLine className="h-4 w-4" />
          </ModeButton>
          <ModeButton
            active={mode === "split"}
            label="Split preview"
            onClick={() => onModeChange("split")}
          >
            <Columns2 className="h-4 w-4" />
          </ModeButton>
          <ModeButton
            active={isZen}
            label={isZen ? "Exit zen (Esc)" : "Zen mode"}
            onClick={() => onModeChange(isZen ? "edit" : "zen")}
          >
            {isZen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Expand className="h-4 w-4" />
            )}
          </ModeButton>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div
          className={cn(
            "relative flex min-h-0 flex-col",
            mode === "split" ? "w-1/2 border-r border-border" : "w-full"
          )}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) =>
              handleContentChange(event.target.value, event.target.selectionStart)
            }
            onClick={(event) =>
              updateAutocomplete(content, event.currentTarget.selectionStart)
            }
            onKeyUp={(event) => {
              // Arrow keys can move the caret out of an open `[[`.
              if (event.key.startsWith("Arrow")) {
                updateAutocomplete(content, event.currentTarget.selectionStart);
              }
            }}
            onBlur={() => {
              if (saveTimer.current) clearTimeout(saveTimer.current);
              void flush();
            }}
            onScroll={syncScroll("editor")}
            spellCheck
            placeholder={"Start writing…\n\nType [[ to link another note."}
            aria-label="Markdown content"
            className={cn(
              "min-h-0 flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed",
              "text-fg placeholder:text-muted focus:outline-none",
              isZen ? "mx-auto w-full max-w-zen px-6 py-16" : "px-5 py-4"
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
              notes={allNotes.filter((n) => n.id !== note.id)}
              position={autocomplete.position}
              onSelect={insertLink}
              onDismiss={() => setAutocomplete(null)}
            />
          ) : null}
        </div>

        {mode === "split" ? (
          <div
            ref={previewRef}
            onScroll={syncScroll("preview")}
            className="min-h-0 w-1/2 overflow-y-auto px-6 py-4"
          >
            <MarkdownPreview content={content} notes={allNotes} />
          </div>
        ) : null}
      </div>

      <footer className="flex items-center gap-4 border-t border-border px-4 py-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          {words} {words === 1 ? "word" : "words"}
        </span>
        <span>{content.length} characters</span>
        <span className="ml-auto">
          {isZen ? "Esc to exit zen" : "Cmd/Ctrl + K for commands"}
        </span>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-emerald-500">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span
        title="Your changes are kept locally and retry on the next edit."
        className="flex shrink-0 items-center gap-1.5 text-xs text-amber-500"
      >
        <AlertCircle className="h-3 w-3" /> Not saved
      </span>
    );
  }
  return <span className="w-0" />;
}

function ModeButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          "rounded-md p-1.5 transition",
          active ? "bg-elevated text-fg shadow-sm" : "text-muted hover:text-fg"
        )}
      >
        {children}
      </button>
    </Tooltip>
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
