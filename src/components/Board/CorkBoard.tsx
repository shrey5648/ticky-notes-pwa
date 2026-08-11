'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Note, NoteConnection, NoteFrame } from '@/lib/types';
import { StickyNote } from '../Notes/StickyNote';
import { BatchActionBar } from '../Toolbar/BatchActionBar';
import { ConnectionLinesOverlay } from './ConnectionLinesOverlay';
import { ConnectionModal } from './ConnectionModal';
import { SwimlaneFrame } from './SwimlaneFrame';
import { MiniMapRadar } from './MiniMapRadar';
import { ZoomIn, ZoomOut, Maximize2, Move, Link2, LayoutGrid } from 'lucide-react';

interface CorkBoardProps {
  notes: Note[];
  selectedNoteIds: string[];
  themeVariant?: 'cork' | 'dark_leather' | 'blueprint' | 'grid_paper' | 'vintage_pastel' | 'glassmorphism';
  connections?: NoteConnection[];
  frames?: NoteFrame[];
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
  // Phase 3 Handlers
  onCreateConnection?: (fromId: string, toId: string) => void;
  onUpdateConnection?: (id: string, updates: Partial<NoteConnection>) => void;
  onDeleteConnection?: (id: string) => void;
  onCreateFrame?: () => void;
  onUpdateFrame?: (id: string, updates: Partial<NoteFrame>) => void;
  onDeleteFrame?: (id: string) => void;
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
  themeVariant = 'cork',
  connections = [],
  frames = [],
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
  onCreateConnection,
  onUpdateConnection,
  onDeleteConnection,
  onCreateFrame,
  onUpdateFrame,
  onDeleteFrame,
}) => {
  // Infinite Canvas Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Marquee rubber-band selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Mind-Map Connection Line Draft State
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [editingConnection, setEditingConnection] = useState<NoteConnection | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.25, Number((prev - 0.15).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleFitAll = () => {
    if (notes.length === 0) return handleResetZoom();
    const minX = Math.min(...notes.map((n) => n.position_x));
    const minY = Math.min(...notes.map((n) => n.position_y));
    const maxX = Math.max(...notes.map((n) => n.position_x + 300));
    const maxY = Math.max(...notes.map((n) => n.position_y + 240));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const fitZoom = Math.max(0.35, Math.min(1.2, Math.min(viewportWidth / (contentWidth + 200), viewportHeight / (contentHeight + 200))));
    setZoom(Number(fitZoom.toFixed(2)));
    setPanX(Math.round(viewportWidth / 2 - (minX + contentWidth / 2) * fitZoom));
    setPanY(Math.round(viewportHeight / 2 - (minY + contentHeight / 2) * fitZoom));
  };

  // Convert client screen mouse coordinates into World Canvas coordinates taking pan & zoom into account
  const screenToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!boardRef.current) return { x: clientX, y: clientY };
    const rect = boardRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - panX) / zoom;
    const y = (clientY - rect.top - panY) / zoom;
    return { x, y };
  }, [panX, panY, zoom]);

  // Handle Wheel Events (Zoom on Ctrl/Meta or Pinch, Pan on normal wheel)
  useEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zooming centered on mouse cursor
        const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom((prevZoom) => {
          const newZoom = Math.max(0.25, Math.min(2.0, Number((prevZoom + zoomDelta).toFixed(2))));
          if (newZoom === prevZoom) return prevZoom;

          const rect = boardEl.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const newPanX = mouseX - (mouseX - panX) * (newZoom / prevZoom);
          const newPanY = mouseY - (mouseY - panY) * (newZoom / prevZoom);
          setPanX(Math.round(newPanX));
          setPanY(Math.round(newPanY));

          return newZoom;
        });
      } else {
        // Panning canvas
        setPanX((prev) => prev - e.deltaX);
        setPanY((prev) => prev - e.deltaY);
      }
    };

    boardEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => boardEl.removeEventListener('wheel', handleWheel);
  }, [panX, panY]);

  // Drag End Handler adjusted for Canvas Zoom Scale!
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active || !delta) return;

    const noteId = active.id as string;
    const scaledDeltaX = delta.x / zoom;
    const scaledDeltaY = delta.y / zoom;

    if (selectedNoteIds.includes(noteId)) {
      const updates = selectedNoteIds
        .map((id) => {
          const n = notes.find((item) => item.id === id);
          if (!n) return null;
          return {
            id: n.id,
            newX: Math.max(10, Math.round(n.position_x + scaledDeltaX)),
            newY: Math.max(80, Math.round(n.position_y + scaledDeltaY)),
          };
        })
        .filter(Boolean) as { id: string; newX: number; newY: number }[];

      onBatchUpdatePositions(updates);
    } else {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const newX = Math.max(10, Math.round(note.position_x + scaledDeltaX));
        const newY = Math.max(80, Math.round(note.position_y + scaledDeltaY));
        onUpdateNotePosition(noteId, newX, newY);
      }
    }
  };

  // Canvas Mouse Down Handler (Marquee Selection / Panning / Connection Target)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isBackground =
      target.classList.contains('cork-board') ||
      target.classList.contains('empty-board') ||
      target.classList.contains('canvas-stage') ||
      target.tagName === 'MAIN' ||
      target.classList.contains('connections-svg-layer');

    // Middle click or Pan mode active -> Pan canvas
    if (e.button === 1 || e.buttons === 4 || (isPanMode && isBackground)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
      return;
    }

    // Cancel active connection drafting if background is clicked
    if (connectingFromId && isBackground) {
      setConnectingFromId(null);
      setMouseCanvasPos(null);
      return;
    }

    // Rubber-band marquee selection
    if (isBackground) {
      setIsSelecting(true);
      const coords = screenToCanvasCoords(e.clientX, e.clientY);
      setSelectionBox({ startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y });
      if (!e.shiftKey) {
        onClearSelection();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = screenToCanvasCoords(e.clientX, e.clientY);

    // Update connection draft line mouse position
    if (connectingFromId) {
      setMouseCanvasPos(coords);
    }

    // Handle Canvas Panning
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanX(panStartRef.current.panX + dx);
      setPanY(panStartRef.current.panY + dy);
      return;
    }

    // Handle Rubber-band Marquee Selection
    if (!isSelecting || !selectionBox) return;

    setSelectionBox((prev) => (prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null));

    const boxLeft = Math.min(selectionBox.startX, coords.x);
    const boxTop = Math.min(selectionBox.startY, coords.y);
    const boxRight = Math.max(selectionBox.startX, coords.x);
    const boxBottom = Math.max(selectionBox.startY, coords.y);

    const cardWidth = 280;
    const cardHeight = 220;

    const intersected = notes
      .filter((n) => {
        const noteLeft = n.position_x;
        const noteTop = n.position_y;
        const noteRight = noteLeft + cardWidth;
        const noteBottom = noteTop + cardHeight;

        return noteLeft < boxRight && noteRight > boxLeft && noteTop < boxBottom && noteBottom > boxTop;
      })
      .map((n) => n.id);

    onSetSelection(intersected);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionBox(null);
    setIsPanning(false);
  };

  // Connection Handler
  const handleStartConnect = (noteId: string) => {
    if (!connectingFromId) {
      setConnectingFromId(noteId);
    } else if (connectingFromId !== noteId) {
      if (onCreateConnection) {
        onCreateConnection(connectingFromId, noteId);
      }
      setConnectingFromId(null);
      setMouseCanvasPos(null);
    }
  };

  // Canvas Dropped Image Handler
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile && onCreateNoteWithImage) {
      const coords = screenToCanvasCoords(e.clientX, e.clientY);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          onCreateNoteWithImage(Math.round(coords.x - 100), Math.round(coords.y - 60), base64);
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
        className={`cork-board theme-${themeVariant}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : isPanMode ? 'grab' : isSelecting ? 'crosshair' : 'default',
          userSelect: isSelecting || isPanning ? 'none' : 'auto',
        }}
      >
        {/* Infinite Canvas Scaled Stage Container */}
        <div
          className="canvas-stage"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.05s linear',
          }}
        >
          {/* Marquee Selection Rectangle */}
          {renderSelectionBox()}

          {/* SVG Connection Lines Layer */}
          <ConnectionLinesOverlay
            connections={connections}
            notes={notes}
            onSelectConnection={(conn) => setEditingConnection(conn)}
            connectingFromId={connectingFromId}
            mouseCanvasPos={mouseCanvasPos}
          />

          {/* Swimlane Framing Containers */}
          {frames.map((frame) => (
            <SwimlaneFrame
              key={frame.id}
              frame={frame}
              notes={notes}
              onUpdateFrame={onUpdateFrame || (() => {})}
              onDeleteFrame={onDeleteFrame || (() => {})}
              onBatchUpdateNotePositions={onBatchUpdatePositions}
            />
          ))}

          {/* Sticky Notes List */}
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
                onStartConnect={handleStartConnect}
              />
            ))
          )}
        </div>

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

        {/* Floating Zoom & Canvas Controls Bar */}
        <div className="zoom-controls-bar">
          <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out (Ctrl + Scroll Down)">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-indicator" onClick={handleResetZoom} title="Reset Zoom">
            {Math.round(zoom * 100)}%
          </span>
          <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In (Ctrl + Scroll Up)">
            <ZoomIn size={16} />
          </button>

          <div className="zoom-divider" />

          <button className="zoom-btn" onClick={handleFitAll} title="Fit All Notes in Viewport">
            <Maximize2 size={15} />
          </button>

          <button
            className={`zoom-btn ${isPanMode ? 'active' : ''}`}
            onClick={() => setIsPanMode(!isPanMode)}
            title="Toggle Canvas Pan Mode (Or hold Middle Click)"
          >
            <Move size={15} />
          </button>

          {onCreateFrame && (
            <button className="zoom-btn" onClick={onCreateFrame} title="Add Swimlane Framing Container">
              <LayoutGrid size={15} />
            </button>
          )}
        </div>

        {/* Mini-Map Radar Navigation Widget */}
        <MiniMapRadar
          notes={notes}
          frames={frames}
          connections={connections}
          panX={panX}
          panY={panY}
          zoom={zoom}
          onSetPan={(px, py) => {
            setPanX(px);
            setPanY(py);
          }}
        />

        {/* Connection Line Edit Popover / Modal */}
        <ConnectionModal
          connection={editingConnection}
          isOpen={Boolean(editingConnection)}
          onClose={() => setEditingConnection(null)}
          onSave={(id, updates) => {
            if (onUpdateConnection) onUpdateConnection(id, updates);
            setEditingConnection(null);
          }}
          onDelete={(id) => {
            if (onDeleteConnection) onDeleteConnection(id);
            setEditingConnection(null);
          }}
        />
      </div>
    </DndContext>
  );
};
