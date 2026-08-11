'use client';

import React from 'react';
import { Note, NoteConnection } from '@/lib/types';

interface ConnectionLinesOverlayProps {
  connections: NoteConnection[];
  notes: Note[];
  onSelectConnection: (conn: NoteConnection) => void;
  connectingFromId?: string | null;
  mouseCanvasPos?: { x: number; y: number } | null;
}

export const ConnectionLinesOverlay: React.FC<ConnectionLinesOverlayProps> = ({
  connections,
  notes,
  onSelectConnection,
  connectingFromId,
  mouseCanvasPos,
}) => {
  // Helper to calculate note card center point
  const getNoteCenter = (n: Note) => {
    const cardWidth = 280;
    const cardHeight = 220;
    return {
      x: n.position_x + cardWidth / 2,
      y: n.position_y + cardHeight / 2,
    };
  };

  const connectingFromNote = connectingFromId ? notes.find((n) => n.id === connectingFromId) : null;

  return (
    <svg className="connections-svg-layer">
      <defs>
        {/* SVG Arrowhead Markers for custom colors */}
        {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280', '#e65100'].map((col) => (
          <React.Fragment key={col}>
            <marker
              id={`arrow-end-${col.replace('#', '')}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill={col} />
            </marker>
            <marker
              id={`arrow-start-${col.replace('#', '')}`}
              viewBox="0 0 10 10"
              refX="2"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 10 1 L 0 5 L 10 9 z" fill={col} />
            </marker>
          </React.Fragment>
        ))}
      </defs>

      {/* Render active temporary draft line when in "Connect Mode" */}
      {connectingFromNote && mouseCanvasPos && (
        <line
          x1={getNoteCenter(connectingFromNote).x}
          y1={getNoteCenter(connectingFromNote).y}
          x2={mouseCanvasPos.x}
          y2={mouseCanvasPos.y}
          stroke="#e65100"
          strokeWidth="2.5"
          strokeDasharray="4,4"
        />
      )}

      {/* Render stored note connections */}
      {connections.map((conn) => {
        const fromNote = notes.find((n) => n.id === conn.from_note_id);
        const toNote = notes.find((n) => n.id === conn.to_note_id);

        if (!fromNote || !toNote) return null;

        const p1 = getNoteCenter(fromNote);
        const p2 = getNoteCenter(toNote);

        // Calculate smooth curve control points
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Offset curvature depending on distance
        const cx1 = p1.x + dx * 0.25;
        const cy1 = p1.y + dy * 0.25 - (dist > 100 ? 30 : 0);
        const cx2 = p2.x - dx * 0.25;
        const cy2 = p2.y - dy * 0.25 - (dist > 100 ? 30 : 0);

        const pathData = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 - (dist > 100 ? 15 : 0);

        const lineColor = conn.color || '#6366f1';
        const strokeDash =
          conn.style === 'dashed' ? '6,6' : conn.style === 'dotted' ? '2,4' : undefined;

        const colorClean = lineColor.replace('#', '');
        const markerEnd =
          conn.arrow_type === 'end' || conn.arrow_type === 'both'
            ? `url(#arrow-end-${colorClean})`
            : undefined;
        const markerStart =
          conn.arrow_type === 'both' ? `url(#arrow-start-${colorClean})` : undefined;

        return (
          <g key={conn.id} className="connection-group">
            <path
              d={pathData}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.5"
              strokeDasharray={strokeDash}
              markerStart={markerStart}
              markerEnd={markerEnd}
              className="connection-path"
              onClick={() => onSelectConnection(conn)}
            />

            {/* Clickable text label badge along curve */}
            {conn.label && (
              <g
                className="connection-label-group"
                onClick={() => onSelectConnection(conn)}
                transform={`translate(${midX}, ${midY})`}
              >
                <rect
                  x={-(conn.label.length * 4.5 + 8)}
                  y="-12"
                  width={conn.label.length * 9 + 16}
                  height="24"
                  rx="12"
                  fill="var(--ui-surface-solid)"
                  stroke={lineColor}
                  strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="var(--ui-text)"
                  fontSize="12"
                  fontWeight="600"
                >
                  {conn.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
