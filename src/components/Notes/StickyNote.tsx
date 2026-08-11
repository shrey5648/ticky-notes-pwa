'use client';

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Note } from '@/lib/types';
import { Pin, Share2, Trash2, Edit3, Lock, Archive, User as UserIcon } from 'lucide-react';

interface StickyNoteProps {
  note: Note;
  index: number;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onShare: (note: Note) => void;
  onBringToFront: (id: string) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  index,
  onEdit,
  onDelete,
  onPinToggle,
  onArchiveToggle,
  onShare,
  onBringToFront,
}) => {
  const [isHovered, setIsHovered] = useState(false);
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

  // Slight random rotation for realistic paper look
  const getRotation = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash += id.charCodeAt(i);
    }
    return (hash % 7) - 3;
  };

  const rotation = getRotation(note.id);

  const style: React.CSSProperties = {
    top: `${note.position_y}px`,
    left: `${note.position_x}px`,
    zIndex: isDragging ? 9999 : note.z_index,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.04)`
      : `rotate(${rotation}deg)`,
    animation: `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
  };

  const isReadOnly = note.permission === 'view';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sticky-note-card ${noteColorClass}`}
      onClick={() => onBringToFront(note.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        <div
          style={{
            display: 'flex',
            gap: '2px',
            opacity: isHovered ? 1 : 0.3,
            transition: 'opacity 0.2s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="btn-icon"
            style={{ width: '26px', height: '26px' }}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
            onClick={() => onPinToggle(note.id, !note.is_pinned)}
          >
            <Pin size={13} style={{ color: note.is_pinned ? '#d32f2f' : '#666' }} />
          </button>
          {!isReadOnly && (
            <button
              className="btn-icon"
              style={{ width: '26px', height: '26px' }}
              title="Edit note"
              onClick={() => onEdit(note)}
            >
              <Edit3 size={13} />
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
        dangerouslySetInnerHTML={{ __html: note.content || '<em style="opacity:0.5">Click to write...</em>' }}
      />

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.73rem',
          color: 'rgba(0,0,0,0.5)',
          borderTop: '1px dashed rgba(0,0,0,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
      {/* Shared badge, Admin owner badge, or date */}
        {note.is_admin_view && note.owner_user ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(255, 152, 0, 0.15)',
              color: '#bf360c',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.7rem',
              border: '1px solid rgba(255, 152, 0, 0.3)',
            }}
            title={`Owner: ${note.owner_user.display_name} (@${note.owner_user.username})`}
          >
            👑 @{note.owner_user.username}
          </span>
        ) : note.is_shared && note.shared_by_user ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(0,0,0,0.05)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          >
            <UserIcon size={10} /> @{note.shared_by_user.username}
            {isReadOnly && <Lock size={9} style={{ marginLeft: '2px' }} />}
          </span>
        ) : (
          <span style={{ fontSize: '0.68rem' }}>
            {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Action Buttons — appear on hover */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateX(0)' : 'translateX(4px)',
            transition: 'all 0.2s ease',
          }}
        >
          {note.permission === 'owner' && (
            <button
              className="btn-icon"
              style={{ width: '24px', height: '24px' }}
              title="Share"
              onClick={() => onShare(note)}
            >
              <Share2 size={12} />
            </button>
          )}
          <button
            className="btn-icon"
            style={{ width: '24px', height: '24px' }}
            title={note.is_archived ? 'Unarchive' : 'Archive'}
            onClick={() => onArchiveToggle(note.id, !note.is_archived)}
          >
            <Archive size={12} />
          </button>
          {note.permission === 'owner' && (
            <button
              className="btn-icon"
              style={{ width: '24px', height: '24px', color: 'var(--ui-danger)' }}
              title="Delete"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
