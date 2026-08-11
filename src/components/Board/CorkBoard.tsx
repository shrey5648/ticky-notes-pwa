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
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--ui-text-muted)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📍</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '4px' }}>Your Cork Board is Empty</h3>
            <p style={{ fontSize: '0.95rem' }}>Click the <strong>+ New Sticky Note</strong> button above to create one!</p>
          </div>
        ) : (
          notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
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
