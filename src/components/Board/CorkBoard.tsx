'use client';

import React, { useState, useRef } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Note } from '@/lib/types';
import { StickyNote } from '../Notes/StickyNote';
import { BatchActionBar } from '../Toolbar/BatchActionBar';

interface CorkBoardProps {
  notes: Note[];
  selectedNoteIds: string[];
  onSelectNote: (id: string, isShift: boolean) => void;
  onClearSelection: () => void;
  onSetSelection: (ids: string[]) => void;
  onUpdateNotePosition: (id: string, newX: number, newY: number) => void;
  onBatchUpdatePositions: (updates: { id: string; newX: number; newY: number }[]) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onBatchDeleteNotes: () => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
  onBatchPinToggle: (isPinned: boolean) => void;
  onLockToggle?: (id: string, isLocked: boolean) => void;
  onBatchLockToggle?: (isLocked: boolean) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onShareNote: (note: Note) => void;
  onBringToFront: (id: string) => void;
  onBatchRecolor: (color: string) => void;
  onBatchTag: (tag: string) => void;
  onBatchAlign: (mode: 'row' | 'column' | 'grid') => void;
  onCreateNoteWithImage?: (x: number, y: number, base64Image: string) => void;
  onAttachImage?: (id: string, base64Image: string) => void;
}

export function autoArrangeNotes(notes: Note[], onUpdatePosition: (id: string, x: number, y: number) => void) {
  const cardWidth = 300;
  const cardHeight = 240;
  const startX = 60;
  const startY = 110;
  const cols = Math.max(1, Math.floor((window.innerWidth - 120) / cardWidth));

  notes.forEach((note, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const newX = startX + col * cardWidth;
    const newY = startY + row * cardHeight;
    onUpdatePosition(note.id, newX, newY);
  });
}

export const CorkBoard: React.FC<CorkBoardProps> = ({
  notes,
  selectedNoteIds,
  onSelectNote,
  onClearSelection,
  onSetSelection,
  onUpdateNotePosition,
  onBatchUpdatePositions,
  onEditNote,
  onDeleteNote,
  onBatchDeleteNotes,
  onPinToggle,
  onBatchPinToggle,
  onLockToggle,
  onBatchLockToggle,
  onArchiveToggle,
  onShareNote,
  onBringToFront,
  onBatchRecolor,
  onBatchTag,
  onBatchAlign,
  onCreateNoteWithImage,
  onAttachImage,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active || !delta) return;

    const noteId = active.id as string;

    // If dragged note is part of multi-selection, move all selected notes together
    if (selectedNoteIds.includes(noteId)) {
      const updates = selectedNoteIds
        .map((id) => {
          const n = notes.find((item) => item.id === id);
          if (!n) return null;
          return {
            id: n.id,
            newX: Math.max(10, n.position_x + delta.x),
            newY: Math.max(80, n.position_y + delta.y),
          };
        })
        .filter(Boolean) as { id: string; newX: number; newY: number }[];

      onBatchUpdatePositions(updates);
    } else {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const newX = Math.max(10, note.position_x + delta.x);
        const newY = Math.max(80, note.position_y + delta.y);
        onUpdateNotePosition(noteId, newX, newY);
      }
    }
  };

  // Rubber-band marquee selection handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger marquee selection if clicking directly on corkboard background
    const target = e.target as HTMLElement;
    if (target.classList.contains('cork-board') || target.classList.contains('empty-board') || target.tagName === 'MAIN') {
      setIsSelecting(true);
      const rect = boardRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
      if (!e.shiftKey) {
        onClearSelection();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

    // Calculate selection rectangle bounds
    const boxLeft = Math.min(selectionBox.startX, currentX);
    const boxTop = Math.min(selectionBox.startY, currentY);
    const boxRight = Math.max(selectionBox.startX, currentX);
    const boxBottom = Math.max(selectionBox.startY, currentY);

    // Find notes intersecting with rubber-band box
    const cardWidth = 280;
    const cardHeight = 220;
    const intersected = notes
      .filter((n) => {
        const noteLeft = n.position_x;
        const noteTop = n.position_y;
        const noteRight = noteLeft + cardWidth;
        const noteBottom = noteTop + cardHeight;

        return (
          noteLeft < boxRight &&
          noteRight > boxLeft &&
          noteTop < boxBottom &&
          noteBottom > boxTop
        );
      })
      .map((n) => n.id);

    onSetSelection(intersected);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionBox(null);
  };

  // Canvas Image Drag & Drop Handler
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile && onCreateNoteWithImage) {
      const rect = boardRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const dropX = Math.max(20, e.clientX - rect.left - 100);
      const dropY = Math.max(90, e.clientY - rect.top - 60);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          onCreateNoteWithImage(dropX, dropY, base64);
        }
      };
      reader.readAsDataURL(imageFile);
    }
  };

  const renderSelectionBox = () => {
    if (!selectionBox) return null;
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);

    return (
      <div
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'rgba(25, 118, 210, 0.12)',
          border: '1.5px dashed #1976d2',
          borderRadius: '6px',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      />
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        ref={boardRef}
        className="cork-board"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        style={{
          minWidth: '100vw',
          minHeight: '100vh',
          paddingBottom: '200px',
          position: 'relative',
          userSelect: isSelecting ? 'none' : 'auto',
        }}
      >
        {renderSelectionBox()}

        {notes.length === 0 ? (
          <div className="empty-board">
            <div className="empty-icon">📝</div>
            <h3>Your Board is Empty</h3>
            <p>Click <strong>+ New Note</strong> or drop an image here to create your sticky note!</p>
          </div>
        ) : (
          notes.map((note, index) => (
            <StickyNote
              key={note.id}
              note={note}
              index={index}
              isSelected={selectedNoteIds.includes(note.id)}
              onSelectToggle={onSelectNote}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
              onPinToggle={onPinToggle}
              onLockToggle={onLockToggle}
              onArchiveToggle={onArchiveToggle}
              onShare={onShareNote}
              onBringToFront={onBringToFront}
              onAttachImage={onAttachImage}
            />
          ))
        )}

        {/* Floating Batch Action Bar */}
        <BatchActionBar
          selectedCount={selectedNoteIds.length}
          onClearSelection={onClearSelection}
          onBatchRecolor={onBatchRecolor}
          onBatchTag={onBatchTag}
          onBatchPinToggle={onBatchPinToggle}
          onBatchLockToggle={onBatchLockToggle ? () => onBatchLockToggle(true) : () => {}}
          onBatchAlign={onBatchAlign}
          onBatchDelete={onBatchDeleteNotes}
        />
      </div>
    </DndContext>
  );
};
