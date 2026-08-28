"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Code2,
  CornerDownLeft,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Users,
} from "lucide-react";
import {
  useNoteActions,
  useNotes,
  useProjects,
  useSnippets,
} from "@/lib/firestore-hooks";
import { useAuth } from "@/lib/auth-context";
import { fuzzyRank } from "@/lib/backlinks-parser";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: "Actions" | "Projects" | "Notes" | "Snippets";
  icon: ReactNode;
  run: () => void | Promise<void>;
}

/**
 * Global Cmd/Ctrl+K navigation. Everything it searches is already subscribed
 * elsewhere in the tree, so the palette is instant and works offline.
 */
export function CommandPalette() {
  const router = useRouter();
  const { projects } = useProjects();
  const { notes } = useNotes();
  const { snippets } = useSnippets();
  const { isAdmin } = useAuth();
  const noteActions = useNoteActions();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reopening should always start from a clean slate.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: "nav:dashboard",
        label: "Go to Overview",
        group: "Actions",
        icon: <LayoutDashboard className="h-3.5 w-3.5" />,
        run: () => router.push("/"),
      },
      {
        id: "nav:snippets",
        label: "Go to Code Vault",
        group: "Actions",
        icon: <Code2 className="h-3.5 w-3.5" />,
        run: () => router.push("/snippets"),
      },
    ];

    if (isAdmin) {
      list.push({
        id: "nav:admin",
        label: "Manage users",
        hint: "admin",
        group: "Actions",
        icon: <Users className="h-3.5 w-3.5" />,
        run: () => router.push("/admin/users"),
      });
    }

    // Creating a note needs somewhere to put it; without a project the action
    // would fail, so it only appears once one exists.
    const firstProject = projects[0];
    if (firstProject) {
      list.push({
        id: "action:new-note",
        label: "New note",
        hint: `in ${firstProject.name}`,
        group: "Actions",
        icon: <Plus className="h-3.5 w-3.5" />,
        run: async () => {
          const id = await noteActions.create({ projectId: firstProject.id });
          router.push(`/notes/${id}`);
        },
      });
    }

    for (const project of projects) {
      list.push({
        id: `project:${project.id}`,
        label: project.name,
        hint: "project",
        group: "Projects",
        icon: (
          <FolderKanban className="h-3.5 w-3.5" style={{ color: project.colorHex }} />
        ),
        run: () => router.push(`/projects/${project.id}`),
      });
    }

    for (const note of notes.slice(0, 60)) {
      list.push({
        id: `note:${note.id}`,
        label: note.title,
        hint: "note",
        group: "Notes",
        icon: <FileText className="h-3.5 w-3.5" />,
        run: () => router.push(`/notes/${note.id}`),
      });
    }

    for (const snippet of snippets.slice(0, 30)) {
      list.push({
        id: `snippet:${snippet.id}`,
        label: snippet.title,
        hint: snippet.language,
        group: "Snippets",
        icon: <Code2 className="h-3.5 w-3.5" />,
        run: () => router.push("/snippets"),
      });
    }

    return list;
  }, [projects, notes, snippets, router, noteActions, isAdmin]);

  const matches = useMemo(
    () => fuzzyRank(commands, query, (c) => `${c.label} ${c.hint ?? ""}`, 30),
    [commands, query]
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row visible when arrowing past the fold.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  async function execute(command: Command | undefined) {
    if (!command) return;
    setOpen(false);
    try {
      await command.run();
    } catch (error) {
      console.error("[palette] command failed", command.id, error);
    }
  }

  let lastGroup = "";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-label="Command palette"
          className="fixed left-1/2 top-[15vh] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>

          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((i) => (matches.length ? (i + 1) % matches.length : 0));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((i) =>
                    matches.length ? (i - 1 + matches.length) % matches.length : 0
                  );
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  void execute(matches[active]);
                }
              }}
              placeholder="Search notes, projects, snippets…"
              className="h-12 flex-1 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
            />
            <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
              Esc
            </kbd>
          </div>

          {matches.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
              {matches.map((command, index) => {
                const showGroup = command.group !== lastGroup;
                lastGroup = command.group;
                return (
                  <li key={command.id}>
                    {showGroup ? (
                      <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {command.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => void execute(command)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                        index === active
                          ? "bg-accent/15 text-fg"
                          : "text-muted hover:text-fg"
                      )}
                    >
                      <span className="shrink-0 opacity-80">{command.icon}</span>
                      <span className="truncate">{command.label}</span>
                      {command.hint ? (
                        <span className="ml-auto shrink-0 text-[11px] text-muted">
                          {command.hint}
                        </span>
                      ) : null}
                      {index === active ? (
                        <CornerDownLeft className="h-3 w-3 shrink-0 opacity-50" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
