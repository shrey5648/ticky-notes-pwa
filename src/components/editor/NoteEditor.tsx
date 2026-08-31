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
  Code,
  Expand,
  FileText,
  Loader2,
  Minimize2,
  Type,
} from "lucide-react";
import { cn, wordCount } from "@/lib/utils";
import { useNoteActions } from "@/lib/firestore-hooks";
import { RichTextEditor } from "./RichTextEditor";
import { MarkdownSourceEditor } from "./MarkdownSourceEditor";
import { Tooltip } from "@/components/ui";
import type { Note, SaveState } from "@/types";

/** `rich` is the WYSIWYG surface; `source` exposes the Markdown behind it. */
export type ViewMode = "rich" | "source" | "zen";

const AUTOSAVE_MS = 300;

interface Props {
  note: Note;
  /** All notes in the workspace, for `[[` autocomplete and link resolution. */
  allNotes: Note[];
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function NoteEditor({ note, allNotes, mode, onModeChange }: Props) {
  const { save } = useNoteActions();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<{ title?: string; content?: string }>({});
  /** True while the user has unsaved keystrokes. */
  const dirty = useRef(false);

  /* ------------------------------------------------------------ remote sync */

  // Switching notes is reconciled during render, not in an effect: effects run
  // after children have rendered, which would mount the new note's editor
  // holding the previous note's document for a frame.
  const [loadedId, setLoadedId] = useState(note.id);
  if (loadedId !== note.id) {
    setLoadedId(note.id);
    setTitle(note.title);
    setContent(note.content ?? "");
    setSaveState("idle");
    dirty.current = false;
    pending.current = {};
  }

  // Firestore pushes the doc back after every write (and after edits made in
  // another tab). Only adopt remote values when we have nothing unsaved,
  // otherwise a slow round-trip would overwrite keystrokes.
  useEffect(() => {
    if (dirty.current) return;
    setTitle(note.title);
    setContent(note.content ?? "");
  }, [note.title, note.content]);

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

  const handleContentChange = useCallback(
    (markdown: string) => {
      setContent(markdown);
      queueSave({ content: markdown });
    },
    [queueSave]
  );

  const flushNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void flush();
  }, [flush]);

  /* ------------------------------------------------------------------ chrome */

  const words = useMemo(() => wordCount(content), [content]);
  const isZen = mode === "zen";
  const isSource = mode === "source";

  // Zen collapses everything around the text, so Escape needs to be a way out.
  useEffect(() => {
    if (!isZen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onModeChange("rich");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isZen, onModeChange]);

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
          onBlur={flushNow}
          placeholder="Untitled note"
          aria-label="Note title"
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-fg placeholder:text-muted focus:outline-none"
        />

        <SaveIndicator state={saveState} />

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          <ModeButton
            active={mode === "rich"}
            label="Rich text"
            onClick={() => onModeChange("rich")}
          >
            <Type className="h-4 w-4" />
          </ModeButton>
          <ModeButton
            active={isSource}
            label="Markdown source"
            onClick={() => onModeChange("source")}
          >
            <Code className="h-4 w-4" />
          </ModeButton>
          <ModeButton
            active={isZen}
            label={isZen ? "Exit zen (Esc)" : "Zen mode"}
            onClick={() => onModeChange(isZen ? "rich" : "zen")}
          >
            {isZen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Expand className="h-4 w-4" />
            )}
          </ModeButton>
        </div>
      </header>

      {isSource ? (
        <MarkdownSourceEditor
          content={content}
          allNotes={allNotes}
          currentNoteId={note.id}
          onChange={handleContentChange}
          onBlur={flushNow}
        />
      ) : (
        <RichTextEditor
          // A different note gets a different editor, so undo history and the
          // document never leak across navigations.
          key={note.id}
          content={content}
          allNotes={allNotes}
          currentNoteId={note.id}
          zen={isZen}
          onChange={handleContentChange}
          onBlur={flushNow}
        />
      )}

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
