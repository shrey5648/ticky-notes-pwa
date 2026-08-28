"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity as ActivityIcon,
  CheckSquare,
  Code2,
  FileText,
  FolderKanban,
  Pin,
  Plus,
} from "lucide-react";
import {
  useActivity,
  useNoteActions,
  useNotes,
  useProjects,
  useSnippets,
  useTasks,
} from "@/lib/firestore-hooks";
import { WorkspaceExporter } from "@/components/export/WorkspaceExporter";
import { TemplatePickerModal } from "@/components/templates/TemplatePickerModal";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { relativeTime } from "@/lib/utils";
import type { Activity, Stamp } from "@/types";

export default function OverviewPage() {
  const router = useRouter();
  const { projects, loading: projectsLoading } = useProjects();
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { snippets } = useSnippets();
  const { activity } = useActivity(25);
  const noteActions = useNoteActions();

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== "DONE").length,
    [tasks]
  );
  const pinned = useMemo(() => notes.filter((n) => n.isPinned), [notes]);
  const recent = useMemo(() => notes.slice(0, 8), [notes]);

  async function createNote(input?: { title: string; content: string }) {
    const project = projects[0];
    if (!project) return;
    try {
      const id = await noteActions.create({
        projectId: project.id,
        title: input?.title,
        content: input?.content,
      });
      router.push(`/notes/${id}`);
    } catch (error) {
      console.error("[overview] create note failed", error);
    }
  }

  if (projectsLoading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-fg">Overview</h1>
            <p className="mt-0.5 text-sm text-muted">
              Everything across your workspace, at a glance.
            </p>
          </div>
          {projects.length > 0 ? (
            <>
              <TemplatePickerModal onPick={createNote} />
              <Button variant="primary" size="sm" onClick={() => createNote()}>
                <Plus className="h-3.5 w-3.5" /> New note
              </Button>
            </>
          ) : null}
        </header>

        {projects.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<FolderKanban className="h-7 w-7" />}
              title="Create your first project"
              hint="Projects are the root of everything — notes, Kanban tasks, and snippets all live inside one. Use the + beside “Projects” in the sidebar."
            />
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<FolderKanban className="h-4 w-4" />}
                label="Projects"
                value={projects.length}
              />
              <StatCard
                icon={<FileText className="h-4 w-4" />}
                label="Notes"
                value={notes.length}
              />
              <StatCard
                icon={<CheckSquare className="h-4 w-4" />}
                label="Open tasks"
                value={openTasks}
              />
              <StatCard
                icon={<Code2 className="h-4 w-4" />}
                label="Snippets"
                value={snippets.length}
              />
            </section>

            {pinned.length > 0 ? (
              <section className="mt-8">
                <SectionHeading icon={<Pin className="h-4 w-4" />}>
                  Pinned
                </SectionHeading>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {pinned.map((note) => (
                    <NoteRow
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      stamp={note.updatedAt}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <section>
                <SectionHeading icon={<FileText className="h-4 w-4" />}>
                  Recent notes
                </SectionHeading>
                {recent.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    No notes yet — create one to get started.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {recent.map((note) => (
                      <NoteRow
                        key={note.id}
                        id={note.id}
                        title={note.title}
                        stamp={note.updatedAt}
                        excerpt={note.content}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionHeading icon={<ActivityIcon className="h-4 w-4" />}>
                  Activity
                </SectionHeading>
                {activity.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    Your edits will show up here.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-2.5 border-l border-border pl-4">
                    {activity.map((entry) => (
                      <ActivityRow key={entry.id} entry={entry} />
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <div className="mt-10">
              <WorkspaceExporter />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
      <span className="text-muted">{icon}</span>
      {children}
    </h2>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-fg">{value}</p>
    </div>
  );
}

function NoteRow({
  id,
  title,
  stamp,
  excerpt,
}: {
  id: string;
  title: string;
  stamp: Stamp;
  excerpt?: string;
}) {
  return (
    <Link
      href={`/notes/${id}`}
      className="block rounded-lg border border-border bg-surface px-3.5 py-2.5 transition hover:border-accent/50"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-fg">{title}</span>
        <span className="shrink-0 text-[11px] text-muted">
          {relativeTime(stamp)}
        </span>
      </div>
      {excerpt ? (
        <p className="mt-1 line-clamp-1 text-xs text-muted">
          {excerpt.replace(/[#*`>\-\[\]]/g, "").slice(0, 140) || "Empty note"}
        </p>
      ) : null}
    </Link>
  );
}

const ACTION_VERBS: Record<Activity["action"], string> = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  STATUS_CHANGED: "moved",
};

function ActivityRow({ entry }: { entry: Activity }) {
  const { metadata } = entry;
  return (
    <li className="relative text-xs text-muted">
      <span className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-border" />
      <span className="text-fg">{metadata.entityTitle}</span>{" "}
      {ACTION_VERBS[entry.action]}
      {entry.action === "STATUS_CHANGED" && metadata.newStatus ? (
        <>
          {" "}
          to <span className="text-fg">{metadata.newStatus}</span>
        </>
      ) : null}{" "}
      <span className="opacity-70">
        · {entry.entityType.toLowerCase()} · {relativeTime(entry.timestamp)}
      </span>
    </li>
  );
}
