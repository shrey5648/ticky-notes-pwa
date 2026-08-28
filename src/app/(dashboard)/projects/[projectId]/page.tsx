"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { Code2, FileText, FolderX, KanbanSquare, Pin, Plus, Trash2 } from "lucide-react";
import {
  useNoteActions,
  useNotes,
  useProjectActions,
  useProjects,
  useSnippets,
  useTasks,
} from "@/lib/firestore-hooks";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { SnippetVault } from "@/components/snippets/SnippetVault";
import { TemplatePickerModal } from "@/components/templates/TemplatePickerModal";
import { Button, EmptyState, Spinner, Tooltip } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";

type Tab = "notes" | "board" | "snippets";

const TABS: Array<{ key: Tab; label: string; icon: ReactNode }> = [
  { key: "notes", label: "Notes", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "board", label: "Board", icon: <KanbanSquare className="h-3.5 w-3.5" /> },
  { key: "snippets", label: "Snippets", icon: <Code2 className="h-3.5 w-3.5" /> },
];

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const { projects, loading } = useProjects(true);
  const { notes } = useNotes(projectId);
  const { tasks } = useTasks(projectId);
  const { snippets } = useSnippets(projectId);
  const noteActions = useNoteActions();
  const projectActions = useProjectActions();

  const [tab, setTab] = useState<Tab>("notes");

  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  async function createNote(input?: { title: string; content: string }) {
    try {
      const id = await noteActions.create({
        projectId,
        title: input?.title,
        content: input?.content,
      });
      router.push(`/notes/${id}`);
    } catch (error) {
      console.error("[project] create note failed", error);
    }
  }

  async function deleteProject() {
    if (!project) return;
    const confirmed = confirm(
      `Delete "${project.name}"?\n\nThis also deletes ${notes.length} notes, ${tasks.length} tasks, and ${snippets.length} snippets. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await projectActions.remove(project.id, project.name);
      router.replace("/");
    } catch (error) {
      console.error("[project] delete failed", error);
    }
  }

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <EmptyState
          icon={<FolderX className="h-7 w-7" />}
          title="Project not found"
          hint="It may have been deleted, or the link points somewhere that no longer exists."
          action={
            <Link href="/" className="text-sm text-accent hover:underline">
              Back to overview
            </Link>
          }
        />
      </div>
    );
  }

  const Icon =
    (Icons as unknown as Record<string, Icons.LucideIcon>)[project.icon] ??
    Icons.FolderKanban;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border px-6 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ backgroundColor: `${project.colorHex}22` }}
          >
            <Icon className="h-4 w-4" style={{ color: project.colorHex }} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-fg">{project.name}</h1>
            {project.description ? (
              <p className="truncate text-xs text-muted">{project.description}</p>
            ) : null}
          </div>

          <TemplatePickerModal onPick={createNote} />
          <Button variant="primary" size="sm" onClick={() => createNote()}>
            <Plus className="h-3.5 w-3.5" /> New note
          </Button>
          <Tooltip label="Delete project">
            <Button size="icon" aria-label="Delete project" onClick={deleteProject}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>

        <nav className="mt-4 flex gap-1">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm transition",
                tab === key
                  ? "border-accent font-medium text-fg"
                  : "border-transparent text-muted hover:text-fg"
              )}
            >
              {icon}
              {label}
              <span className="rounded-full bg-elevated px-1.5 text-[10px] text-muted">
                {key === "notes"
                  ? notes.length
                  : key === "board"
                    ? tasks.length
                    : snippets.length}
              </span>
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {tab === "notes" ? (
          notes.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title="No notes in this project"
              hint="Start from scratch or pick a template — meeting notes, bug report, project scope, or technical spec."
              action={
                <Button variant="primary" size="sm" onClick={() => createNote()}>
                  <Plus className="h-3.5 w-3.5" /> New note
                </Button>
              }
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="flex flex-col rounded-xl border border-border bg-surface p-3.5 transition hover:border-accent/50"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-fg">
                      {note.title}
                    </span>
                    {note.isPinned ? (
                      <Pin className="h-3 w-3 shrink-0 text-accent" />
                    ) : null}
                  </div>
                  <p className="mt-1.5 line-clamp-3 flex-1 text-xs text-muted">
                    {(note.content ?? "").replace(/[#*`>\-\[\]]/g, "").slice(0, 200) ||
                      "Empty note"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {(note.tags ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="ml-auto text-[10px] text-muted">
                      {relativeTime(note.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : null}

        {tab === "board" ? <KanbanBoard projectId={projectId} tasks={tasks} /> : null}

        {tab === "snippets" ? <SnippetVault projectId={projectId} /> : null}
      </div>
    </div>
  );
}
