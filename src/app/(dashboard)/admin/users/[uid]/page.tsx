"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  ChevronLeft,
  Code2,
  Eye,
  FileText,
  FolderKanban,
  KanbanSquare,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { EmptyState, Spinner } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import type { Note, Project, Snippet, Task } from "@/types";

type Tab = "notes" | "tasks" | "snippets";

interface Workspace {
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  snippets: Snippet[];
}

/**
 * Read-only view of another user's workspace.
 *
 * The reads go straight to Firestore rather than through an API route: the
 * rules already grant admins read across `users/{uid}/**`, so proxying would
 * only duplicate an authorization decision that's enforced in one place.
 *
 * Deliberately one-way — there is no editing here. An admin can investigate
 * content but not silently rewrite someone's notes.
 */
export default function AdminUserWorkspacePage() {
  const { uid } = useParams<{ uid: string }>();
  const { isAdmin, loading: authLoading } = useAuth();

  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("notes");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [projects, notes, tasks, snippets] = await Promise.all([
          getDocs(query(collection(db, "users", uid, "projects"))),
          getDocs(
            query(
              collection(db, "users", uid, "notes"),
              orderBy("updatedAt", "desc")
            )
          ),
          getDocs(query(collection(db, "users", uid, "tasks"))),
          getDocs(query(collection(db, "users", uid, "snippets"))),
        ]);
        if (cancelled) return;
        setData({
          projects: projects.docs.map(
            (d) => ({ ...d.data(), id: d.id }) as Project
          ),
          notes: notes.docs.map((d) => ({ ...d.data(), id: d.id }) as Note),
          tasks: tasks.docs.map((d) => ({ ...d.data(), id: d.id }) as Task),
          snippets: snippets.docs.map(
            (d) => ({ ...d.data(), id: d.id }) as Snippet
          ),
        });
      } catch (caught) {
        console.error("[admin] workspace read failed", caught);
        if (!cancelled) {
          setError(
            "Could not read this workspace. Confirm the deployed Firestore rules grant admins read access."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [uid, isAdmin, authLoading]);

  const projectName = useMemo(
    () => new Map((data?.projects ?? []).map((p) => [p.id, p.name])),
    [data]
  );

  if (authLoading || loading) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <EmptyState
          icon={<Shield className="h-7 w-7" />}
          title="Administrator access required"
          hint="Your account doesn't have the admin role."
        />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/admin/users"
          className="flex w-fit items-center gap-1 text-xs text-muted transition hover:text-fg"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> All users
        </Link>

        <header className="mt-3 flex flex-wrap items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10">
            <Eye className="h-4 w-4 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-fg">
              Workspace contents
            </h1>
            <p className="truncate font-mono text-[11px] text-muted">{uid}</p>
          </div>
        </header>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            You&apos;re viewing another user&apos;s private content as an
            administrator. This view is read-only.
          </span>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : !data ? null : (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-4">
              <Stat
                icon={<FolderKanban className="h-4 w-4" />}
                label="Projects"
                value={data.projects.length}
              />
              <Stat
                icon={<FileText className="h-4 w-4" />}
                label="Notes"
                value={data.notes.length}
              />
              <Stat
                icon={<KanbanSquare className="h-4 w-4" />}
                label="Tasks"
                value={data.tasks.length}
              />
              <Stat
                icon={<Code2 className="h-4 w-4" />}
                label="Snippets"
                value={data.snippets.length}
              />
            </section>

            <nav className="mt-6 flex gap-1 border-b border-border">
              {(["notes", "tasks", "snippets"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "border-b-2 px-3 py-2 text-sm capitalize transition",
                    tab === key
                      ? "border-accent font-medium text-fg"
                      : "border-transparent text-muted hover:text-fg"
                  )}
                >
                  {key}
                </button>
              ))}
            </nav>

            <div className="mt-4">
              {tab === "notes" ? (
                data.notes.length === 0 ? (
                  <EmptyState
                    title="No notes"
                    icon={<FileText className="h-6 w-6" />}
                  />
                ) : (
                  <div className="space-y-2">
                    {data.notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-border bg-surface"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenNoteId((current) =>
                              current === note.id ? null : note.id
                            )
                          }
                          className="flex w-full items-baseline gap-3 px-3.5 py-2.5 text-left"
                        >
                          <span className="truncate text-sm font-medium text-fg">
                            {note.title}
                          </span>
                          <span className="ml-auto shrink-0 text-[11px] text-muted">
                            {projectName.get(note.projectId) ?? "—"} ·{" "}
                            {relativeTime(note.updatedAt)}
                          </span>
                        </button>
                        {openNoteId === note.id ? (
                          <div className="border-t border-border px-3.5 py-3">
                            <MarkdownPreview content={note.content ?? ""} readOnly />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )
              ) : null}

              {tab === "tasks" ? (
                data.tasks.length === 0 ? (
                  <EmptyState
                    title="No tasks"
                    icon={<KanbanSquare className="h-6 w-6" />}
                  />
                ) : (
                  <div className="space-y-1.5">
                    {data.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm"
                      >
                        <span className="truncate text-fg">{task.title}</span>
                        <span className="ml-auto shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">
                          {task.status}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted">
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : null}

              {tab === "snippets" ? (
                data.snippets.length === 0 ? (
                  <EmptyState
                    title="No snippets"
                    icon={<Code2 className="h-6 w-6" />}
                  />
                ) : (
                  <div className="space-y-3">
                    {data.snippets.map((snippet) => (
                      <div key={snippet.id}>
                        <p className="mb-1 text-sm font-medium text-fg">
                          {snippet.title}{" "}
                          <span className="text-[11px] font-normal text-muted">
                            {snippet.language}
                          </span>
                        </p>
                        <MarkdownPreview
                          readOnly
                          content={`\`\`\`${snippet.language}\n${snippet.code ?? ""}\n\`\`\``}
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold text-fg">{value}</p>
    </div>
  );
}
