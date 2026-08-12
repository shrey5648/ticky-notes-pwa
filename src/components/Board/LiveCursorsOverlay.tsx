'use client';

import React from 'react';
import { UserPresence } from '@/lib/types';
import { MousePointer2 } from 'lucide-react';

interface LiveCursorsOverlayProps {
  presences: UserPresence[];
  zoomLevel?: number;
  panOffset?: { x: number; y: number };
}

export const LiveCursorsOverlay: React.FC<LiveCursorsOverlayProps> = ({
  presences,
  zoomLevel = 1,
  panOffset = { x: 0, y: 0 },
}) => {
  if (!presences || presences.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {presences.map((p) => {
        const posX = p.cursor_x * zoomLevel + panOffset.x;
        const posY = p.cursor_y * zoomLevel + panOffset.y;

        if (p.cursor_x === 0 && p.cursor_y === 0) return null;

        return (
          <div
            key={p.user_id}
            style={{
              position: 'absolute',
              top: `${posY}px`,
              left: `${posX}px`,
              transition: 'top 0.08s linear, left 0.08s linear',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              pointerEvents: 'none',
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Colored Cursor SVG Pointer */}
            <MousePointer2
              size={18}
              style={{
                color: p.color || '#3b82f6',
                fill: p.color || '#3b82f6',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            />

            {/* User Name Tag Badge */}
            <div
              style={{
                backgroundColor: p.color || '#3b82f6',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                lineHeight: '1.3',
                letterSpacing: '0.02em',
                animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
            >
              @{p.username}
            </div>
          </div>
        );
      })}
    </div>
  );
};
