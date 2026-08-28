"use client";

import { useState } from "react";
import { Download, Loader2, PackageCheck } from "lucide-react";
import {
  useNotes,
  useProjects,
  useSnippets,
  useTasks,
  useTemplates,
} from "@/lib/firestore-hooks";
import { downloadWorkspaceZip } from "@/lib/zip-exporter";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * One-click, fully client-side workspace export. The data is already in memory
 * from the live subscriptions, so packaging never hits the network — which also
 * means the archive builds correctly while offline.
 */
export function WorkspaceExporter({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { projects } = useProjects(true);
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { snippets } = useSnippets();
  const { templates } = useTemplates();

  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  const total = notes.length + tasks.length + snippets.length;

  async function exportZip() {
    if (state === "working") return;
    setState("working");
    try {
      await downloadWorkspaceZip({ projects, notes, tasks, snippets, templates });
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    } catch (error) {
      console.error("[export] failed to build archive", error);
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  if (compact) {
    return (
      <Button
        size="sm"
        onClick={exportZip}
        disabled={state === "working"}
        className={className}
        aria-label="Export workspace"
      >
        {state === "working" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Export
      </Button>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-accent/10 p-2 text-accent">
          <PackageCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-fg">Export your workspace</h3>
          <p className="mt-1 text-xs text-muted">
            A .zip of Markdown files with YAML frontmatter, your snippets, and the
            full backlink graph as JSON. Built in your browser — nothing is
            uploaded.
          </p>
          <p className="mt-2 text-[11px] text-muted">
            {projects.length} projects · {notes.length} notes · {tasks.length} tasks
            · {snippets.length} snippets
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={exportZip}
          disabled={state === "working" || total === 0}
        >
          {state === "working" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Packaging…
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" /> Download .zip
            </>
          )}
        </Button>

        {state === "done" ? (
          <span className="text-xs text-emerald-500">Archive downloaded.</span>
        ) : null}
        {state === "error" ? (
          <span className="text-xs text-red-400">
            Export failed — see the browser console.
          </span>
        ) : null}
        {total === 0 && state === "idle" ? (
          <span className="text-xs text-muted">Nothing to export yet.</span>
        ) : null}
      </div>
    </div>
  );
}
