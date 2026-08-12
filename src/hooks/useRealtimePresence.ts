'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User, UserPresence } from '@/lib/types';

const USER_COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7',
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
  '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#eab308', '#f97316', '#ef4444',
];

function getUserColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash += username.charCodeAt(i);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

interface RealtimePresenceProps {
  currentUser: User | null;
  activeBoardId: string;
  onRemoteNoteMove?: (noteId: string, x: number, y: number) => void;
}

export function useRealtimePresence({
  currentUser,
  activeBoardId,
  onRemoteNoteMove,
}: RealtimePresenceProps) {
  const [presences, setPresences] = useState<Map<string, UserPresence>>(new Map());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const userColor = useRef<string>('#3b82f6');

  useEffect(() => {
    if (currentUser) {
      userColor.current = getUserColor(currentUser.username);
    }
  }, [currentUser]);

  // Setup BroadcastChannel for real-time multi-tab / multi-session sync
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;

    const channel = new BroadcastChannel('ticky-notes-presence-v1');
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (!payload || payload.user_id === currentUser.id) return;

      if (type === 'PRESENCE_UPDATE' || type === 'CURSOR_MOVE') {
        setPresences((prev) => {
          const next = new Map(prev);
          next.set(payload.user_id, {
            ...payload,
            last_active: Date.now(),
          });
          return next;
        });
      } else if (type === 'USER_LEAVE') {
        setPresences((prev) => {
          const next = new Map(prev);
          next.delete(payload.user_id);
          return next;
        });
      } else if (type === 'NOTE_DRAG_MOVE' && onRemoteNoteMove) {
        if (payload.noteId && typeof payload.x === 'number' && typeof payload.y === 'number') {
          onRemoteNoteMove(payload.noteId, payload.x, payload.y);
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    // Announce Join
    channel.postMessage({
      type: 'PRESENCE_UPDATE',
      payload: {
        user_id: currentUser.id,
        username: currentUser.username,
        display_name: currentUser.display_name,
        color: userColor.current,
        cursor_x: 0,
        cursor_y: 0,
        active_board_id: activeBoardId,
        last_active: Date.now(),
      },
    });

    // Cleanup stale presences every 4 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      setPresences((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, presence] of next.entries()) {
          if (now - presence.last_active > 8000) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      // Send periodic heartbeat
      if (channelRef.current && currentUser) {
        channelRef.current.postMessage({
          type: 'PRESENCE_UPDATE',
          payload: {
            user_id: currentUser.id,
            username: currentUser.username,
            display_name: currentUser.display_name,
            color: userColor.current,
            active_board_id: activeBoardId,
            last_active: Date.now(),
          },
        });
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (channelRef.current && currentUser) {
        channelRef.current.postMessage({
          type: 'USER_LEAVE',
          payload: { user_id: currentUser.id },
        });
        channelRef.current.close();
      }
    };
  }, [currentUser, activeBoardId, onRemoteNoteMove]);

  // Broadcast Mouse Move Cursor Position
  const broadcastCursorMove = useCallback(
    (x: number, y: number) => {
      if (!channelRef.current || !currentUser) return;
      channelRef.current.postMessage({
        type: 'CURSOR_MOVE',
        payload: {
          user_id: currentUser.id,
          username: currentUser.username,
          display_name: currentUser.display_name,
          color: userColor.current,
          cursor_x: x,
          cursor_y: y,
          active_board_id: activeBoardId,
          last_active: Date.now(),
        },
      });
    },
    [currentUser, activeBoardId]
  );

  // Broadcast Note Dragging Movement
  const broadcastNoteMove = useCallback(
    (noteId: string, x: number, y: number) => {
      if (!channelRef.current) return;
      channelRef.current.postMessage({
        type: 'NOTE_DRAG_MOVE',
        payload: { noteId, x, y },
      });
    },
    []
  );

  const activePresences = Array.from(presences.values()).filter(
    (p) => p.active_board_id === activeBoardId
  );

  return {
    activePresences,
    broadcastCursorMove,
    broadcastNoteMove,
    userColor: userColor.current,
  };
}
