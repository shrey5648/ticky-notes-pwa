"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Trash2 } from "lucide-react";
import { cn, toDate } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types";

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: "bg-slate-500/15 text-slate-400",
  MEDIUM: "bg-blue-500/15 text-blue-400",
  HIGH: "bg-amber-500/15 text-amber-400",
  URGENT: "bg-red-500/15 text-red-400",
};

interface Props {
  task: Task;
  onOpen?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  /** Rendered inside a DragOverlay — no sortable wiring, no interactions. */
  overlay?: boolean;
}

export function TaskCard({ task, onOpen, onDelete, overlay = false }: Props) {
  const sortable = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: overlay,
  });

  const due = toDate(task.dueDate);
  const overdue = due ? due.getTime() < Date.now() && task.status !== "DONE" : false;

  return (
    <div
      ref={overlay ? undefined : sortable.setNodeRef}
      style={
        overlay
          ? undefined
          : {
              transform: CSS.Transform.toString(sortable.transform),
              transition: sortable.transition,
            }
      }
      className={cn(
        "group rounded-lg border border-border bg-surface p-2.5 shadow-sm",
        // The original stays in place as a placeholder while the overlay drags.
        !overlay && sortable.isDragging && "opacity-40",
        overlay && "rotate-2 cursor-grabbing shadow-2xl ring-1 ring-accent/40"
      )}
    >
      <div className="flex items-start gap-1.5">
        {!overlay ? (
          <button
            type="button"
            aria-label={`Drag ${task.title}`}
            className="mt-0.5 cursor-grab touch-none text-muted opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ) : (
          <GripVertical className="mt-0.5 h-3.5 w-3.5 text-muted" />
        )}

        <button
          type="button"
          disabled={overlay}
          onClick={() => onOpen?.(task)}
          className="min-w-0 flex-1 text-left text-sm leading-snug text-fg"
        >
          {task.title}
        </button>

        {!overlay && onDelete ? (
          <button
            type="button"
            aria-label={`Delete ${task.title}`}
            onClick={() => onDelete(task)}
            className="text-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-5">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
            PRIORITY_STYLES[task.priority]
          )}
        >
          {task.priority}
        </span>
        {due ? (
          <span
            className={cn(
              "flex items-center gap-1 text-[10px]",
              overdue ? "font-medium text-red-400" : "text-muted"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
