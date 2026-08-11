'use client';

import React, { useState } from 'react';
import { NoteConnection } from '@/lib/types';

interface ConnectionModalProps {
  connection: NoteConnection | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<NoteConnection>) => void;
  onDelete: (id: string) => void;
}

const COLOR_OPTIONS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Gray', value: '#6b7280' },
];

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  connection,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [label, setLabel] = useState(connection?.label || '');
  const [color, setColor] = useState(connection?.color || '#6366f1');
  const [style, setStyle] = useState<'solid' | 'dashed' | 'dotted'>(connection?.style || 'solid');
  const [arrowType, setArrowType] = useState<'end' | 'both' | 'none'>(connection?.arrow_type || 'end');

  React.useEffect(() => {
    if (connection) {
      setLabel(connection.label || '');
      setColor(connection.color || '#6366f1');
      setStyle(connection.style || 'solid');
      setArrowType(connection.arrow_type || 'end');
    }
  }, [connection]);

  if (!isOpen || !connection) return null;

  const handleSave = () => {
    onSave(connection.id, { label, color, style, arrow_type: arrowType });
    onClose();
  };

  const handleDelete = () => {
    onDelete(connection.id);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '380px',
          background: 'var(--ui-surface-solid)',
          border: '1px solid var(--ui-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--ui-text)' }}>
            🔗 Edit Connection Line
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--ui-text-muted)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Label input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ui-text-muted)' }}>
            Relationship Label (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Depends on, Relates to, Causes..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--ui-border)',
              background: 'var(--ui-bg)',
              color: 'var(--ui-text)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Color picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ui-text-muted)' }}>
            Line Color
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {COLOR_OPTIONS.map((c) => (
              <div
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: c.value,
                  cursor: 'pointer',
                  border: color === c.value ? '2px solid #000' : '2px solid transparent',
                  transform: color === c.value ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Dash Style */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ui-text-muted)' }}>
            Line Style
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['solid', 'dashed', 'dotted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: style === s ? '1.5px solid var(--ui-accent)' : '1px solid var(--ui-border)',
                  background: style === s ? 'var(--ui-accent-light)' : 'var(--ui-surface)',
                  color: style === s ? 'var(--ui-accent)' : 'var(--ui-text)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Arrowheads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ui-text-muted)' }}>
            Arrowhead Type
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['end', 'both', 'none'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setArrowType(a)}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: arrowType === a ? '1.5px solid var(--ui-accent)' : '1px solid var(--ui-border)',
                  background: arrowType === a ? 'var(--ui-accent-light)' : 'var(--ui-surface)',
                  color: arrowType === a ? 'var(--ui-accent)' : 'var(--ui-text)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {a === 'end' ? 'Single →' : a === 'both' ? 'Double ↔' : 'None ―'}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          <button
            onClick={handleDelete}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              background: 'var(--ui-danger-bg)',
              color: 'var(--ui-danger)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            🗑️ Delete Connection
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--ui-border)',
                background: 'transparent',
                color: 'var(--ui-text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: 'var(--ui-accent)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
