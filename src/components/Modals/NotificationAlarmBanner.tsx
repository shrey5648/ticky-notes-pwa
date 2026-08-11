'use client';

import React from 'react';
import { Note } from '@/lib/types';
import { Bell, Clock, CheckCircle2, ExternalLink, X } from 'lucide-react';

export interface AlarmItem {
  note: Note;
  isOverdue: boolean;
}

interface NotificationAlarmBannerProps {
  alarms: AlarmItem[];
  onSnooze: (noteId: string, minutes: number) => void;
  onOpenNote: (note: Note) => void;
  onMarkComplete: (noteId: string) => void;
  onDismiss: (noteId: string) => void;
}

export const NotificationAlarmBanner: React.FC<NotificationAlarmBannerProps> = ({
  alarms,
  onSnooze,
  onOpenNote,
  onMarkComplete,
  onDismiss,
}) => {
  if (!alarms || alarms.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
        width: '90vw',
        pointerEvents: 'auto',
      }}
      id="notification-alarm-container"
    >
      {alarms.map(({ note, isOverdue }) => (
        <div
          key={note.id}
          style={{
            background: 'var(--ui-surface)',
            border: isOverdue ? '2px solid var(--ui-danger, #ef4444)' : '2px solid var(--ui-accent, #f97316)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '14px 16px',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                  color: isOverdue ? '#ef4444' : '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Bell size={18} className="animate-bounce" />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: isOverdue ? '#ef4444' : '#f97316',
                  }}
                >
                  {isOverdue ? '🚨 Overdue Reminder' : '🔔 Due Date Reminder'}
                </span>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--ui-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '220px',
                  }}
                >
                  {note.title || 'Untitled Sticky Note'}
                </h4>
              </div>
            </div>
            <button
              onClick={() => onDismiss(note.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ui-text-muted)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
              }}
              title="Dismiss alarm"
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--ui-text-muted)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={14} />
            Due: {note.due_date ? new Date(note.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Today'}
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onSnooze(note.id, 15)}
              className="btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Clock size={12} /> Snooze 15m
            </button>

            <button
              onClick={() => onOpenNote(note)}
              className="btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ExternalLink size={12} /> Open
            </button>

            <button
              onClick={() => onMarkComplete(note.id)}
              className="btn-primary"
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: 'auto',
              }}
            >
              <CheckCircle2 size={12} /> Complete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
