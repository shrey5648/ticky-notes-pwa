'use client';

import React, { useState, useRef } from 'react';
import { NoteFrame, Note } from '@/lib/types';

interface SwimlaneFrameProps {
  frame: NoteFrame;
  notes: Note[];
  onUpdateFrame: (id: string, updates: Partial<NoteFrame>) => void;
  onDeleteFrame: (id: string) => void;
  onBatchUpdateNotePositions: (updates: { id: string; newX: number; newY: number }[]) => void;
}

const FRAME_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'];

export const SwimlaneFrame: React.FC<SwimlaneFrameProps> = ({
  frame,
  notes,
  onUpdateFrame,
  onDeleteFrame,
  onBatchUpdateNotePositions,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(frame.title);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; frameX: number; frameY: number; notesInFrame: { id: string; startX: number; startY: number }[] }>({
    startX: 0,
    startY: 0,
    frameX: 0,
    frameY: 0,
    notesInFrame: [],
  });

  const resizeStartRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number }>({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  // Calculate notes currently enclosed in frame bounds
  const getNotesInFrame = () => {
    const frameLeft = frame.position_x;
    const frameTop = frame.position_y;
    const frameRight = frameLeft + frame.width;
    const frameBottom = frameTop + frame.height;

    return notes.filter((n) => {
      const cardWidth = 280;
      const cardHeight = 220;
      const noteCenterX = n.position_x + cardWidth / 2;
      const noteCenterY = n.position_y + cardHeight / 2;
      return (
        noteCenterX >= frameLeft &&
        noteCenterX <= frameRight &&
        noteCenterY >= frameTop &&
        noteCenterY <= frameBottom
      );
    });
  };

  // Header Drag Handlers
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (isEditingTitle) return;
    e.stopPropagation();
    setIsDragging(true);

    const enclosed = getNotesInFrame().map((n) => ({
      id: n.id,
      startX: n.position_x,
      startY: n.position_y,
    }));

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      frameX: frame.position_x,
      frameY: frame.position_y,
      notesInFrame: enclosed,
    };

    window.addEventListener('mousemove', handleMouseMoveHeader);
    window.addEventListener('mouseup', handleMouseUpHeader);
  };

  const handleMouseMoveHeader = (e: MouseEvent) => {
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const newFrameX = Math.max(10, dragStartRef.current.frameX + dx);
    const newFrameY = Math.max(80, dragStartRef.current.frameY + dy);

    onUpdateFrame(frame.id, { position_x: newFrameX, position_y: newFrameY });

    // Synchronously move all notes inside frame
    if (dragStartRef.current.notesInFrame.length > 0) {
      const noteUpdates = dragStartRef.current.notesInFrame.map((item) => ({
        id: item.id,
        newX: Math.max(10, item.startX + dx),
        newY: Math.max(80, item.startY + dy),
      }));
      onBatchUpdateNotePositions(noteUpdates);
    }
  };

  const handleMouseUpHeader = () => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleMouseMoveHeader);
    window.removeEventListener('mouseup', handleMouseUpHeader);
  };

  // Resize Handle Drag Handlers
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: frame.width,
      startHeight: frame.height,
    };
    window.addEventListener('mousemove', handleMouseMoveResize);
    window.addEventListener('mouseup', handleMouseUpResize);
  };

  const handleMouseMoveResize = (e: MouseEvent) => {
    const dx = e.clientX - resizeStartRef.current.startX;
    const dy = e.clientY - resizeStartRef.current.startY;

    const newWidth = Math.max(250, resizeStartRef.current.startWidth + dx);
    const newHeight = Math.max(180, resizeStartRef.current.startHeight + dy);

    onUpdateFrame(frame.id, { width: newWidth, height: newHeight });
  };

  const handleMouseUpResize = () => {
    setIsResizing(false);
    window.removeEventListener('mousemove', handleMouseMoveResize);
    window.removeEventListener('mouseup', handleMouseUpResize);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleText.trim()) {
      onUpdateFrame(frame.id, { title: titleText.trim() });
    } else {
      setTitleText(frame.title);
    }
  };

  const frameColor = frame.color || '#3b82f6';
  const enclosedCount = getNotesInFrame().length;

  return (
    <div
      className="swimlane-frame-container"
      style={{
        left: `${frame.position_x}px`,
        top: `${frame.position_y}px`,
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        borderColor: frameColor,
        boxShadow: isDragging ? `0 8px 30px ${frameColor}40` : 'none',
      }}
    >
      {/* Frame Drag Header */}
      <div
        className="swimlane-frame-header"
        onMouseDown={handleMouseDownHeader}
        style={{
          background: `${frameColor}20`,
          borderBottomColor: `${frameColor}40`,
          color: frameColor,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <span style={{ fontSize: '1rem' }}>📦</span>
          {isEditingTitle ? (
            <input
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              style={{
                background: 'var(--ui-bg)',
                border: '1px solid var(--ui-accent)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--ui-text)',
                outline: 'none',
              }}
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingTitle(true)}
              style={{ cursor: 'pointer', flex: 1 }}
              title="Double click to rename frame"
            >
              {frame.title} ({enclosedCount})
            </span>
          )}
        </div>

        {/* Color presets & Delete button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onMouseDown={(e) => e.stopPropagation()}>
          {FRAME_COLORS.map((col) => (
            <div
              key={col}
              onClick={() => onUpdateFrame(frame.id, { color: col })}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: col,
                cursor: 'pointer',
                opacity: frameColor === col ? 1 : 0.4,
                transform: frameColor === col ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
          <button
            onClick={() => onDeleteFrame(frame.id)}
            title="Delete Frame"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ui-text-muted)',
              fontSize: '0.9rem',
              marginLeft: '4px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Resize Handle at Bottom-Right */}
      <div
        onMouseDown={handleMouseDownResize}
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: frameColor,
          fontSize: '0.75rem',
          userSelect: 'none',
        }}
        title="Drag to resize frame"
      >
        ◢
      </div>
    </div>
  );
};
