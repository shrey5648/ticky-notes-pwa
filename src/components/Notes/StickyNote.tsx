'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Note } from '@/lib/types';
import { Pin, Share2, Trash2, Edit3, Lock, Archive, User as UserIcon } from 'lucide-react';

interface StickyNoteProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onShare: (note: Note) => void;
  onBringToFront: (id: string) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  onEdit,
  onDelete,
  onPinToggle,
  onArchiveToggle,
  onShare,
  onBringToFront,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    data: { note },
  });

  const colorClassMap: Record<string, string> = {
    '#FFEB3B': 'note-color-yellow',
    '#F48FB1': 'note-color-pink',
    '#81D4FA': 'note-color-blue',
    '#A5D6A7': 'note-color-green',
    '#FFE0B2': 'note-color-orange',
    '#CE93D8': 'note-color-purple',
    '#FFAB91': 'note-color-coral',
    '#FFFFFF': 'note-color-white',
  };

  const noteColorClass = colorClassMap[note.color] || 'note-color-yellow';

  // Slight slight random rotation based on ID string hash for realistic paper look
  const getRotation = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash += id.charCodeAt(i);
    }
    const deg = (hash % 7) - 3; // -3 deg to +3 deg
    return deg;
  };

  const rotation = getRotation(note.id);

  const style: React.CSSProperties = {
    top: `${note.position_y}px`,
    left: `${note.position_x}px`,
    zIndex: isDragging ? 9999 : note.z_index,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.03)`
      : `rotate(${rotation}deg)`,
  };

  const isReadOnly = note.permission === 'view';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sticky-note-card ${noteColorClass}`}
      onClick={() => onBringToFront(note.id)}
      {...attributes}
      {...listeners}
    >
      {/* Tape on top */}
      <div className="sticky-note-tape" />

      {/* Pushpin if pinned */}
      {note.is_pinned && <div className="pushpin" title="Pinned to top" />}

      {/* Note Header */}
      <div className="note-header" style={{ marginTop: note.is_pinned ? '6px' : '0' }}>
        <h3 className="note-title">{note.title || 'Untitled Note'}</h3>
        <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-icon"
            style={{ width: '26px', height: '26px' }}
            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
            onClick={() => onPinToggle(note.id, !note.is_pinned)}
          >
            <Pin size={14} style={{ color: note.is_pinned ? '#d32f2f' : '#666' }} />
          </button>
          {!isReadOnly && (
            <button
              className="btn-icon"
              style={{ width: '26px', height: '26px' }}
              title="Edit note"
              onClick={() => onEdit(note)}
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Note Content */}
      <div
        className="note-body"
        onClick={(e) => {
          e.stopPropagation();
          if (!isReadOnly) onEdit(note);
        }}
        dangerouslySetInnerHTML={{ __html: note.content || '<em>Click to write note...</em>' }}
      />

      {/* Footer / Shared Indicator / Action Menu */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'rgba(0,0,0,0.6)',
          borderTop: '1px dashed rgba(0,0,0,0.12)',
          paddingTop: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shared Badge */}
        {note.is_shared && note.shared_by_user ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(0,0,0,0.06)',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 500,
            }}
          >
            <UserIcon size={12} /> @{note.shared_by_user.username}{' '}
            {isReadOnly && <Lock size={10} style={{ marginLeft: '2px' }} />}
          </span>
        ) : (
          <span style={{ fontSize: '0.7rem' }}>
            {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Action icons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {note.permission === 'owner' && (
            <button
              className="btn-icon"
              style={{ width: '24px', height: '24px' }}
              title="Share sticky note"
              onClick={() => onShare(note)}
            >
              <Share2 size={13} />
            </button>
          )}
          <button
            className="btn-icon"
            style={{ width: '24px', height: '24px' }}
            title={note.is_archived ? 'Unarchive note' : 'Archive note'}
            onClick={() => onArchiveToggle(note.id, !note.is_archived)}
          >
            <Archive size={13} />
          </button>
          {note.permission === 'owner' && (
            <button
              className="btn-icon"
              style={{ width: '24px', height: '24px', color: '#c62828' }}
              title="Delete sticky note"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
