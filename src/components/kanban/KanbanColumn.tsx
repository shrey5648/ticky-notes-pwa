"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

export const COLUMN_META: Record<TaskStatus, { label: string; accent: string }> = {
  BACKLOG: { label: "Backlog", accent: "bg-slate-400" },
  TODO: { label: "Todo", accent: "bg-blue-400" },
  IN_PROGRESS: { label: "In Progress", accent: "bg-amber-400" },
  REVIEW: { label: "Review", accent: "bg-purple-400" },
  DONE: { label: "Done", accent: "bg-emerald-400" },
};

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onCreate: (status: TaskStatus, title: string) => void;
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function KanbanColumn({ status, tasks, onCreate, onOpen, onDelete }: Props) {
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState("");

  // The column itself is a drop target so an empty column can still receive
  // cards — with only sortable items, there would be nothing to drop onto.
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status}`,
    data: { type: "column", status },
  });

  const meta = COLUMN_META[status];

  function submit() {
    const title = draft.trim();
    if (title) onCreate(status, title);
    setDraft("");
    setDrafting(false);
  }

  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl bg-surface/60">
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn("h-2 w-2 rounded-full", meta.accent)} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg">
          {meta.label}
        </h3>
        <span className="rounded-full bg-elevated px-1.5 text-[11px] text-muted">
          {tasks.length}
        </span>
        <button
          type="button"
          aria-label={`Add task to ${meta.label}`}
          onClick={() => setDrafting(true)}
          className="ml-auto rounded p-1 text-muted transition hover:bg-elevated hover:text-fg"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[7rem] flex-1 flex-col gap-2 rounded-lg border border-transparent p-2 transition",
          isOver && "border-accent/40 bg-accent/5"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </SortableContext>

        {drafting ? (
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={submit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
              if (event.key === "Escape") {
                setDraft("");
                setDrafting(false);
              }
            }}
            placeholder="Task title — Enter to add"
            className="w-full resize-none rounded-lg border border-accent/50 bg-surface p-2.5 text-sm text-fg placeholder:text-muted focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setDrafting(true)}
            className="rounded-lg px-2.5 py-1.5 text-left text-xs text-muted transition hover:bg-elevated hover:text-fg"
          >
            + Add task
          </button>
        )}
      </div>
    </section>
  );
}
