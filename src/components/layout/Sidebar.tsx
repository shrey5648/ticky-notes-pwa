"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import {
  ChevronLeft,
  Code2,
  Hash,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftOpen,
  Plus,
  Search,
  Shield,
  Sun,
  Users,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNotes, useProjectActions, useProjects } from "@/lib/firestore-hooks";
import { QuickLinksDrawer } from "./QuickLinksDrawer";
import { WorkspaceExporter } from "@/components/export/WorkspaceExporter";
import { Button, Dialog, DialogContent, DialogTrigger, Input } from "@/components/ui";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const PROJECT_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#64748B",
];

const PROJECT_ICONS = [
  "FolderKanban",
  "Rocket",
  "Bug",
  "BookOpen",
  "Beaker",
  "Palette",
  "Server",
  "Users",
];

/** Lucide exports a large namespace; this narrows it to icon components. */
function lucideIcon(name: string): Icons.LucideIcon {
  return (
    (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ??
    Icons.FolderKanban
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { projects } = useProjects();
  const { notes } = useNotes();
  const online = useOnlineStatus();
  const { theme, toggle } = useTheme();

  const [collapsed, setCollapsed] = useState(false);

  // Tags are derived from note content on save, so the sidebar list stays in
  // sync without a separate tags collection to maintain.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      for (const tag of note.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12);
  }, [notes]);

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-3">
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <Link
          href="/"
          aria-label="Overview"
          className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <LayoutDashboard className="h-4 w-4" />
        </Link>
        <Link
          href="/snippets"
          aria-label="Code vault"
          className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <Code2 className="h-4 w-4" />
        </Link>
        {isAdmin ? (
          <Link
            href="/admin/users"
            aria-label="User management"
            className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-fg"
          >
            <Users className="h-4 w-4" />
          </Link>
        ) : null}
      </aside>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-xs font-bold text-white">
            S
          </span>
          <span className="text-sm font-semibold text-fg">S Notes</span>
        </Link>

        {!online ? (
          <span
            title="Offline — changes are cached and sync when you reconnect."
            className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-500"
          >
            <WifiOff className="h-2.5 w-2.5" /> Offline
          </span>
        ) : null}

        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={() => setCollapsed(true)}
          className="ml-auto rounded p-1 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav className="px-2">
        <NavLink
          href="/"
          active={pathname === "/"}
          icon={<LayoutDashboard className="h-3.5 w-3.5" />}
        >
          Overview
        </NavLink>
        <NavLink
          href="/snippets"
          active={pathname.startsWith("/snippets")}
          icon={<Code2 className="h-3.5 w-3.5" />}
        >
          Code Vault
        </NavLink>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
            )
          }
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-fg"
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="ml-auto rounded border border-border px-1 text-[10px]">
            ⌘K
          </kbd>
        </button>

        {/* Rendered from the role claim, which the Firestore rules and the
            admin API both enforce independently. */}
        {isAdmin ? (
          <NavLink
            href="/admin/users"
            active={pathname.startsWith("/admin")}
            icon={<Users className="h-3.5 w-3.5" />}
          >
            Users
          </NavLink>
        ) : null}
      </nav>

      <div className="mt-3 flex items-center justify-between px-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Projects
        </span>
        <NewProjectDialog />
      </div>

      <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-2">
        {projects.length === 0 ? (
          <p className="px-1.5 py-2 text-[11px] text-muted">
            No projects yet. Create one to start writing.
          </p>
        ) : (
          projects.map((project) => {
            const Icon = lucideIcon(project.icon);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition",
                  pathname === `/projects/${project.id}`
                    ? "bg-elevated font-medium text-fg"
                    : "text-muted hover:bg-elevated hover:text-fg"
                )}
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: project.colorHex }}
                />
                <span className="truncate">{project.name}</span>
              </Link>
            );
          })
        )}

        {tags.length > 0 ? (
          <div className="mt-4">
            <p className="px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Tags
            </p>
            <div className="flex flex-wrap gap-1 px-1.5">
              {tags.map(([tag, count]) => (
                <span
                  key={tag}
                  title={`${count} ${count === 1 ? "note" : "notes"}`}
                  className="flex items-center gap-0.5 rounded bg-elevated px-1.5 py-0.5 text-[11px] text-muted"
                >
                  <Hash className="h-2.5 w-2.5" />
                  {tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <QuickLinksDrawer />

      <div className="flex items-center gap-1.5 border-t border-border px-2 py-2">
        <div className="min-w-0 flex-1 px-1.5">
          <p className="truncate text-[11px] text-fg">
            {user?.displayName || user?.email || "Guest"}
          </p>
          {user?.isAnonymous ? (
            <p className="text-[10px] text-amber-500">Guest — device-local</p>
          ) : isAdmin ? (
            <p className="flex items-center gap-0.5 text-[10px] text-accent">
              <Shield className="h-2.5 w-2.5" /> Administrator
            </p>
          ) : null}
        </div>

        <WorkspaceExporter compact />

        <button
          type="button"
          aria-label="Toggle theme"
          onClick={toggle}
          className="rounded p-1.5 text-muted transition hover:bg-elevated hover:text-fg"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          aria-label="Sign out"
          onClick={() => void logout()}
          className="rounded p-1.5 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition",
        active
          ? "bg-elevated font-medium text-fg"
          : "text-muted hover:bg-elevated hover:text-fg"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function NewProjectDialog() {
  const actions = useProjectActions();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await actions.create({ name: trimmed, colorHex: color, icon });
      setName("");
      setOpen(false);
    } catch (error) {
      console.error("[projects] create failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="New project"
          className="rounded p-0.5 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>

      <DialogContent
        title="New project"
        description="Projects scope your notes, Kanban board, and snippets."
      >
        <div className="space-y-4">
          <label className="block text-xs font-medium text-muted">
            Name
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void submit()}
              placeholder="Frontend Redesign"
              className="mt-1"
            />
          </label>

          <div>
            <p className="text-xs font-medium text-muted">Color</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Color ${hex}`}
                  onClick={() => setColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={cn(
                    "h-6 w-6 rounded-full transition",
                    color === hex &&
                      "ring-2 ring-fg ring-offset-2 ring-offset-surface"
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted">Icon</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PROJECT_ICONS.map((key) => {
                const Icon = lucideIcon(key);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={key}
                    onClick={() => setIcon(key)}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-md border transition",
                      icon === key
                        ? "border-accent bg-elevated"
                        : "border-border hover:bg-elevated"
                    )}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              disabled={!name.trim() || busy}
            >
              Create project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
