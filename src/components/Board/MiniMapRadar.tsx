'use client';

import React, { useState, useRef } from 'react';
import { Note, NoteFrame, NoteConnection } from '@/lib/types';

interface MiniMapRadarProps {
  notes: Note[];
  frames: NoteFrame[];
  connections: NoteConnection[];
  panX: number;
  panY: number;
  zoom: number;
  onSetPan: (panX: number, panY: number) => void;
}

export const MiniMapRadar: React.FC<MiniMapRadarProps> = ({
  notes,
  frames,
  connections,
  panX,
  panY,
  zoom,
  onSetPan,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const minimapAreaRef = useRef<HTMLDivElement>(null);
  const isDraggingViewportRef = useRef(false);

  // Overall virtual world dimensions
  const worldWidth = 3200;
  const worldHeight = 2200;

  // Mini-map box dimensions inside CSS container (220px x 118px canvas area)
  const miniMapWidth = 218;
  const miniMapHeight = 114;

  const scaleX = miniMapWidth / worldWidth;
  const scaleY = miniMapHeight / worldHeight;

  // Calculate current viewport bounds inside mini-map space
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Pan values are negative translate offsets when panned right/down
  const currentViewX = -panX / zoom;
  const currentViewY = -panY / zoom;
  const currentViewW = viewportWidth / zoom;
  const currentViewH = viewportHeight / zoom;

  const miniRectX = Math.max(0, Math.min(miniMapWidth - 20, currentViewX * scaleX));
  const miniRectY = Math.max(0, Math.min(miniMapHeight - 15, currentViewY * scaleY));
  const miniRectW = Math.min(miniMapWidth, Math.max(20, currentViewW * scaleX));
  const miniRectH = Math.min(miniMapHeight, Math.max(15, currentViewH * scaleY));

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingViewportRef.current = true;
    updatePanFromEvent(e);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (isDraggingViewportRef.current) {
      updatePanFromEvent(e);
    }
  };

  const handlePointerUp = () => {
    isDraggingViewportRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const updatePanFromEvent = (e: React.PointerEvent | PointerEvent) => {
    if (!minimapAreaRef.current) return;
    const rect = minimapAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Target world center position
    const targetWorldX = clickX / scaleX - currentViewW / 2;
    const targetWorldY = clickY / scaleY - currentViewH / 2;

    const newPanX = -targetWorldX * zoom;
    const newPanY = -targetWorldY * zoom;

    onSetPan(newPanX, newPanY);
  };

  return (
    <div className={`minimap-radar-box ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header Bar */}
      <div className="minimap-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>🧭</span> Mini-Map ({notes.length})
        </span>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ui-text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isCollapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* Mini-Map Render Area */}
      {!isCollapsed && (
        <div
          ref={minimapAreaRef}
          className="minimap-canvas-area"
          onPointerDown={handlePointerDown}
        >
          {/* Render Mini Swimlane Frames */}
          {frames.map((frame) => (
            <div
              key={frame.id}
              style={{
                position: 'absolute',
                left: `${frame.position_x * scaleX}px`,
                top: `${frame.position_y * scaleY}px`,
                width: `${frame.width * scaleX}px`,
                height: `${frame.height * scaleY}px`,
                border: `1px dashed ${frame.color || '#3b82f6'}`,
                backgroundColor: `${frame.color || '#3b82f6'}15`,
                borderRadius: '2px',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Render Mini SVG Connection Lines */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {connections.map((conn) => {
              const from = notes.find((n) => n.id === conn.from_note_id);
              const to = notes.find((n) => n.id === conn.to_note_id);
              if (!from || !to) return null;
              return (
                <line
                  key={conn.id}
                  x1={(from.position_x + 140) * scaleX}
                  y1={(from.position_y + 110) * scaleY}
                  x2={(to.position_x + 140) * scaleX}
                  y2={(to.position_y + 110) * scaleY}
                  stroke={conn.color || '#6366f1'}
                  strokeWidth="1"
                  opacity="0.7"
                />
              );
            })}
          </svg>

          {/* Render Mini Sticky Notes */}
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                left: `${note.position_x * scaleX}px`,
                top: `${note.position_y * scaleY}px`,
                width: `${Math.max(4, 280 * scaleX)}px`,
                height: `${Math.max(4, 220 * scaleY)}px`,
                backgroundColor: note.color || '#FFEB3B',
                borderRadius: '1px',
                boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Render Draggable Viewport Radar Window */}
          <div
            className="minimap-viewport-rect"
            style={{
              left: `${miniRectX}px`,
              top: `${miniRectY}px`,
              width: `${miniRectW}px`,
              height: `${miniRectH}px`,
            }}
          />
        </div>
      )}
    </div>
  );
};
