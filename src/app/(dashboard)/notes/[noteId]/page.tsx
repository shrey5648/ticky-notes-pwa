"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FileX, Globe, Lock, Pin, PinOff, Trash2 } from "lucide-react";
import {
  useNote,
  useNoteActions,
  useNotes,
  useProjects,
} from "@/lib/firestore-hooks";
import { MarkdownEditor, type ViewMode } from "@/components/editor/MarkdownEditor";
import { BacklinksFooter } from "@/components/editor/BacklinksFooter";
import { Button, EmptyState, Spinner, Tooltip } from "@/components/ui";

export default function NotePage() {
  const { noteId } = useParams<{ noteId: string }>();
  const router = useRouter();

  const { note, loading } = useNote(noteId);
  const { notes } = useNotes();
  const { projects } = useProjects(true);
  const actions = useNoteActions();

  const [mode, setMode] = useState<ViewMode>("edit");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // window is unavailable during SSR, so the absolute share URL is built after
  // mount rather than during render.
  useEffect(() => {
    setShareUrl(
      note?.shareSlug ? `${window.location.origin}/share/${note.shareSlug}` : null
    );
  }, [note?.shareSlug]);

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <EmptyState
          icon={<FileX className="h-7 w-7" />}
          title="Note not found"
          hint="This note was deleted, or the link is no longer valid."
          action={
            <Link href="/" className="text-sm text-accent hover:underline">
              Back to overview
            </Link>
          }
        />
      </div>
    );
  }

  const project = projects.find((p) => p.id === note.projectId);

  async function remove() {
    if (!note) return;
    if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    try {
      await actions.remove(note.id, note.title);
      router.replace(project ? `/projects/${project.id}` : "/");
    } catch (error) {
      console.error("[note] delete failed", error);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Zen mode covers the viewport, so this bar would be hidden anyway —
          skipping it keeps the DOM honest about what's visible. */}
      {mode !== "zen" ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <Link
            href={project ? `/projects/${project.id}` : "/"}
            className="flex items-center gap-1 text-xs text-muted transition hover:text-fg"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {project?.name ?? "Overview"}
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <Tooltip label={note.isPinned ? "Unpin note" : "Pin note"}>
              <Button
                size="icon"
                aria-label="Toggle pin"
                onClick={() =>
                  actions
                    .update(note.id, { isPinned: !note.isPinned })
                    .catch((e) => console.error("[note] pin toggle failed", e))
                }
              >
                {note.isPinned ? (
                  <Pin className="h-4 w-4 text-accent" />
                ) : (
                  <PinOff className="h-4 w-4" />
                )}
              </Button>
            </Tooltip>

            <Tooltip label={note.isPublic ? "Make private" : "Publish read-only link"}>
              <Button
                size="icon"
                aria-label="Toggle sharing"
                onClick={() =>
                  actions
                    .setPublic(note, !note.isPublic)
                    .catch((e) => console.error("[note] share toggle failed", e))
                }
              >
                {note.isPublic ? (
                  <Globe className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </Button>
            </Tooltip>

            <Tooltip label="Delete note">
              <Button size="icon" aria-label="Delete note" onClick={remove}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>

          {shareUrl ? (
            <div className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs">
              <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="shrink-0 text-muted">Public link:</span>
              <code className="truncate text-fg">{shareUrl}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="ml-auto shrink-0 text-accent hover:underline"
              >
                Copy
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <MarkdownEditor
        note={note}
        allNotes={notes}
        mode={mode}
        onModeChange={setMode}
      />

      {mode !== "zen" ? (
        <div className="max-h-72 shrink-0 overflow-y-auto border-t border-border px-4 pb-6">
          <BacklinksFooter note={note} />
        </div>
      ) : null}
    </div>
  );
}
