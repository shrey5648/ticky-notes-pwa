'use client';

import React from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Note } from '@/lib/types';
import { StickyNote } from '../Notes/StickyNote';

interface CorkBoardProps {
  notes: Note[];
  onUpdateNotePosition: (id: string, newX: number, newY: number) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onShareNote: (note: Note) => void;
  onBringToFront: (id: string) => void;
}

export const CorkBoard: React.FC<CorkBoardProps> = ({
  notes,
  onUpdateNotePosition,
  onEditNote,
  onDeleteNote,
  onPinToggle,
  onArchiveToggle,
  onShareNote,
  onBringToFront,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // minimum 5px drag movement before activation
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active || !delta) return;

    const noteId = active.id as string;
    const note = notes.find((n) => n.id === noteId);

    if (note) {
      const newX = Math.max(10, note.position_x + delta.x);
      const newY = Math.max(80, note.position_y + delta.y); // account for top toolbar
      onUpdateNotePosition(noteId, newX, newY);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="cork-board" style={{ minWidth: '100vw', minHeight: '100vh', paddingBottom: '200px' }}>
        {notes.length === 0 ? (
          <div className="empty-board">
            <div className="empty-icon">📝</div>
            <h3>Your Board is Empty</h3>
            <p>Click <strong>+ New Note</strong> to create your first sticky note!</p>
          </div>
        ) : (
          notes.map((note, index) => (
            <StickyNote
              key={note.id}
              note={note}
              index={index}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
              onPinToggle={onPinToggle}
              onArchiveToggle={onArchiveToggle}
              onShare={onShareNote}
              onBringToFront={onBringToFront}
            />
          ))
        )}
      </div>
    </DndContext>
  );
};
