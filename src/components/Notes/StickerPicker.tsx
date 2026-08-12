'use client';

import React from 'react';
import { Sparkles, X } from 'lucide-react';

export const PRESET_STICKERS = [
  { id: 'star', label: 'Star', icon: '⭐️' },
  { id: 'urgent', label: 'Urgent', icon: '🚨' },
  { id: 'fire', label: 'High Priority', icon: '🔥' },
  { id: 'check', label: 'Completed', icon: '✅' },
  { id: 'secret', label: 'Secret', icon: '🔒' },
  { id: 'idea', label: 'Idea', icon: '💡' },
  { id: 'pin', label: 'Important', icon: '📌' },
  { id: 'goal', label: 'Goal', icon: '🎯' },
];

interface StickerPickerProps {
  currentSticker?: string;
  onSelectSticker: (stickerId: string | null) => void;
  onClose?: () => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  currentSticker,
  onSelectSticker,
  onClose,
}) => {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--ui-bg)',
        border: '1px solid var(--ui-border)',
        boxShadow: 'var(--shadow-md)',
        animation: 'slideDown 0.15s ease both',
        minWidth: '200px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
          Stamp Sticker Badge
        </span>
        {onClose && (
          <button className="btn-icon" style={{ width: '20px', height: '20px' }} onClick={onClose}>
            <X size={12} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
        {PRESET_STICKERS.map((s) => {
          const isSelected = currentSticker === s.id;
          return (
            <button
              key={s.id}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: isSelected ? '2px solid var(--ui-accent)' : '1px solid var(--ui-border)',
                background: isSelected ? 'var(--ui-accent-light)' : 'var(--ui-surface)',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
              title={s.label}
              onClick={() => {
                onSelectSticker(isSelected ? null : s.id);
                if (onClose) onClose();
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {s.icon}
            </button>
          );
        })}
      </div>

      {currentSticker && (
        <button
          style={{
            width: '100%',
            padding: '4px',
            fontSize: '0.72rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--ui-danger)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          onClick={() => {
            onSelectSticker(null);
            if (onClose) onClose();
          }}
        >
          Remove Sticker Stamp
        </button>
      )}
    </div>
  );
};
