"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { useTaskActions } from "@/lib/firestore-hooks";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types";

interface Props {
  projectId: string;
  tasks: Task[];
  onOpenTask?: (task: Task) => void;
}

/** Gap between positionOrder values, so single-card moves rarely need a full
 *  renumber of the column. */
const ORDER_STEP = 1000;

export function KanbanBoard({ projectId, tasks, onOpenTask }: Props) {
  const { create, reorder, remove, logStatusChange } = useTaskActions();

  /**
   * Optimistic mirror of the server list. Drags apply here first so the board
   * doesn't wait on a round-trip; the Firestore snapshot then overwrites it,
   * which also means a rejected write self-corrects on the next snapshot.
   */
  const [optimistic, setOptimistic] = useState<Task[]>(tasks);
  const [dragging, setDragging] = useState<Task | null>(null);

  useEffect(() => {
    // Adopting server state mid-drag would yank the card out from under the
    // pointer, so defer until the drag ends.
    if (!dragging) setOptimistic(tasks);
  }, [tasks, dragging]);

  const sensors = useSensors(
    // A small distance threshold keeps clicking a card from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(
      TASK_STATUSES.map((s) => [s, [] as Task[]])
    ) as Record<TaskStatus, Task[]>;
    for (const task of optimistic) {
      (groups[task.status] ?? groups.BACKLOG).push(task);
    }
    for (const status of TASK_STATUSES) {
      groups[status].sort((a, b) => a.positionOrder - b.positionOrder);
    }
    return groups;
  }, [optimistic]);

  function handleDragStart(event: DragStartEvent) {
    setDragging(optimistic.find((t) => t.id === event.active.id) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDragging(null);
    if (!over) return;

    const moved = optimistic.find((t) => t.id === active.id);
    if (!moved) return;

    // The drop target is either a column (empty space) or another card.
    const overData = over.data.current as
      | { type: "column"; status: TaskStatus }
      | { type: "task"; task: Task }
      | undefined;

    const targetStatus =
      overData?.type === "column"
        ? overData.status
        : (overData?.task.status ?? moved.status);

    const column = byStatus[targetStatus].filter((t) => t.id !== moved.id);
    const overIndex =
      overData?.type === "task"
        ? column.findIndex((t) => t.id === overData.task.id)
        : -1;
    const insertAt = overIndex === -1 ? column.length : overIndex;

    const sameColumn = moved.status === targetStatus;
    const sameSlot =
      sameColumn &&
      byStatus[targetStatus].findIndex((t) => t.id === moved.id) === insertAt;
    if (sameSlot) return;

    const nextColumn = [...column];
    nextColumn.splice(insertAt, 0, { ...moved, status: targetStatus });

    // Renumber the destination column so ordering is unambiguous even after
    // repeated moves; the source column keeps its relative order intact.
    const updates = nextColumn.map((task, index) => ({
      id: task.id,
      status: targetStatus,
      positionOrder: (index + 1) * ORDER_STEP,
    }));

    const patched = new Map(updates.map((u) => [u.id, u]));
    setOptimistic((current) =>
      current.map((task) => {
        const update = patched.get(task.id);
        return update
          ? { ...task, status: update.status, positionOrder: update.positionOrder }
          : task;
      })
    );

    try {
      await reorder(updates);
      logStatusChange(moved, moved.status, targetStatus);
    } catch (error) {
      console.error("[kanban] reorder failed", error);
      // Snap back to the last known server state.
      setOptimistic(tasks);
    }
  }

  async function handleCreate(status: TaskStatus, title: string) {
    const last = byStatus[status].at(-1);
    try {
      await create({
        projectId,
        title,
        status,
        positionOrder: (last?.positionOrder ?? 0) + ORDER_STEP,
      });
    } catch (error) {
      console.error("[kanban] create failed", error);
    }
  }

  async function handleDelete(task: Task) {
    setOptimistic((current) => current.filter((t) => t.id !== task.id));
    try {
      await remove(task.id, task.title);
    } catch (error) {
      console.error("[kanban] delete failed", error);
      setOptimistic(tasks);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={byStatus[status]}
            onCreate={handleCreate}
            onOpen={(task) => onOpenTask?.(task)}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Rendering the dragged card in an overlay keeps it above the columns
          and unaffected by their scroll containers. */}
      <DragOverlay dropAnimation={null}>
        {dragging ? <TaskCard task={dragging} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
