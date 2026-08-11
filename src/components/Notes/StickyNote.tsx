'use client';

import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Note } from '@/lib/types';
import { Pin, Share2, Trash2, Edit3, Lock, Unlock, Archive, User as UserIcon, Calendar, Tag } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';

interface StickyNoteProps {
  note: Note;
  index: number;
  isSelected?: boolean;
  onSelectToggle?: (id: string, isShift: boolean) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onPinToggle: (id: string, isPinned: boolean) => void;
  onLockToggle?: (id: string, isLocked: boolean) => void;
  onArchiveToggle: (id: string, isArchived: boolean) => void;
  onShare: (note: Note) => void;
  onBringToFront: (id: string) => void;
  onAttachImage?: (id: string, base64Image: string) => void;
  onStartConnect?: (id: string) => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  index,
  isSelected = false,
  onSelectToggle,
  onEdit,
  onDelete,
  onPinToggle,
  onLockToggle,
  onArchiveToggle,
  onShare,
  onBringToFront,
  onAttachImage,
  onStartConnect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(note.is_locked || false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (note.is_locked !== undefined) {
      setIsLocked(note.is_locked);
    }
  }, [note.is_locked]);

  const handleLockToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    if (onLockToggle) {
      onLockToggle(note.id, nextLocked);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.shiftKey || isSelected) {
      e.stopPropagation();
      if (onSelectToggle) {
        onSelectToggle(note.id, e.shiftKey);
      }
    }
    onBringToFront(note.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile && onAttachImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          onAttachImage(note.id, base64);
        }
      };
      reader.readAsDataURL(imageFile);
    }
  };

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

  const isCustomColor = !colorClassMap[note.color];
  const noteColorClass = colorClassMap[note.color] || '';
  const styleVariantClass = note.style_variant ? `note-style-${note.style_variant}` : '';
  const fontFamilyClass = note.font_family ? `font-${note.font_family}` : 'font-sans';

  // Check if content contains image
  const hasImage = note.content && (note.content.includes('<img') || note.content.includes('data:image'));

  // Calculate checklist completion progress
  const getChecklistStats = (html: string) => {
    if (!html || (!html.includes('type="checkbox"') && !html.includes('data-type="taskItem"'))) {
      return null;
    }
    const total = (html.match(/type="checkbox"/g) || []).length;
    const checked = (html.match(/checked/g) || []).length;
    if (total === 0) return null;
    const percent = Math.round((checked / total) * 100);
    return { total, checked, percent };
  };

  const checklistStats = getChecklistStats(note.content);

  // Calculate due date status badge
  const getDueDateBadge = (dueDateStr?: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { type: 'overdue', label: `Overdue (${Math.abs(diffDays)}d)` };
    } else if (diffDays === 0) {
      return { type: 'today', label: 'Due Today' };
    } else if (diffDays <= 3) {
      return { type: 'soon', label: `Due in ${diffDays}d` };
    }
    return { type: 'normal', label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
  };

  const dueBadge = getDueDateBadge(note.due_date);

  // Rotation for realistic look
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
    zIndex: isDragging ? 999 : isSelected ? 950 : (note.z_index || 1),
    backgroundColor: isCustomColor ? note.color : undefined,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.04)`
      : `rotate(${isSelected ? 0 : rotation}deg)`,
    boxShadow: isSelected
      ? '0 0 0 3px #1976d2, 0 12px 28px rgba(25, 118, 210, 0.35)'
      : isDragOver
      ? '0 0 0 3px #4caf50, 0 8px 20px rgba(76, 175, 80, 0.3)'
      : undefined,
    transition: transform ? 'none' : 'box-shadow 0.2s ease, transform 0.2s ease',
    animation: `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
  };

  const isReadOnly = note.permission === 'view';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sticky-note-card ${noteColorClass} ${styleVariantClass} ${fontFamilyClass} ${isSelected ? 'is-selected' : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      {...attributes}
      {...listeners}
    >
      {/* Tape on top */}
      <div className="sticky-note-tape" />

      {/* Pushpin if pinned */}
      {note.is_pinned && <div className="pushpin" title="Pinned to top" />}

      {/* Selection Checkbox Toggle */}
      {onSelectToggle && (isHovered || isSelected) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectToggle(note.id, e.shiftKey);
          }}
          title={isSelected ? 'Deselect note' : 'Select note (Shift+Click to multi-select)'}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: isSelected ? '#1976d2' : 'rgba(255,255,255,0.85)',
            border: isSelected ? '2px solid #fff' : '2px solid rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          }}
        >
          {isSelected && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
        </div>
      )}

      {/* Note Header */}
      <div className="note-header" style={{ marginTop: note.is_pinned ? '6px' : '0', paddingLeft: (isHovered || isSelected) && onSelectToggle ? '24px' : '0' }}>
        <h3 className="note-title">{note.title || 'Untitled Note'}</h3>
        <div
          style={{
            display: 'flex',
            gap: '2px',
            opacity: isHovered || isSelected ? 1 : 0.3,
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
          <button
            className="btn-icon"
            style={{ width: '26px', height: '26px' }}
            title={isLocked ? 'Unlock description' : 'Lock description (Hide content)'}
            onClick={handleLockToggle}
          >
            {isLocked ? (
              <Lock size={13} style={{ color: '#d32f2f', fontWeight: 'bold' }} />
            ) : (
              <Unlock size={13} style={{ color: '#666' }} />
            )}
          </button>
          {onStartConnect && (
            <button
              className="btn-icon"
              style={{ width: '26px', height: '26px' }}
              title="Connect to another note"
              onClick={() => onStartConnect(note.id)}
            >
              <span style={{ fontSize: '12px' }}>🔗</span>
            </button>
          )}
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

      {/* Due Date, Image Indicator & Tag Badges Bar */}
      {(dueBadge || hasImage || (note.tags && note.tags.length > 0)) && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          {dueBadge && (
            <span className={`due-badge ${dueBadge.type}`} title={`Due Date: ${note.due_date}`}>
              <Calendar size={10} /> {dueBadge.label}
            </span>
          )}
          {hasImage && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '8px',
                padding: '1px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Contains image attachment"
            >
              🖼️ Image
            </span>
          )}
          {note.tags &&
            note.tags.map((tag) => (
              <span key={tag} className="tag-pill" title={`Tag: #${tag}`}>
                #{tag}
              </span>
            ))}
        </div>
      )}

      {/* Checklist Progress Bar */}
      {checklistStats && !isLocked && (
        <div className="checklist-progress-bar" title={`Checklist: ${checklistStats.checked}/${checklistStats.total} completed (${checklistStats.percent}%)`}>
          <div className="checklist-progress-fill" style={{ width: `${checklistStats.percent}%` }} />
        </div>
      )}

      {/* Note Content */}
      {isLocked ? (
        <div
          className="note-body-locked"
          onClick={(e) => {
            e.stopPropagation();
            handleLockToggle(e);
          }}
          title="Click to reveal note description"
        >
          <Lock size={22} style={{ opacity: 0.55, marginBottom: '4px' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.85 }}>Description Hidden</span>
          <span style={{ fontSize: '0.68rem', opacity: 0.6, marginTop: '3px' }}>Click lock icon or here to reveal</span>
        </div>
      ) : (
        <div
          className="note-body"
          onClick={(e) => {
            e.stopPropagation();
            if (!isReadOnly) onEdit(note);
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content || '<em style="opacity:0.5">Click to write...</em>') }}
        />
      )}

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

        {/* Action Buttons — appear on hover or when selected */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            opacity: isHovered || isSelected ? 1 : 0,
            transform: isHovered || isSelected ? 'translateX(0)' : 'translateX(4px)',
            transition: 'all 0.2s ease',
          }}
        >
          {(note.permission === 'owner' || note.is_admin_view) && (
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
          {(note.permission === 'owner' || note.is_admin_view) && (
            <button
              className="btn-icon"
              style={{ width: '24px', height: '24px', color: 'var(--ui-danger)' }}
              title="Delete note (Move to Trash Bin)"
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

