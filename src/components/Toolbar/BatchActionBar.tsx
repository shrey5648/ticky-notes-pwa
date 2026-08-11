'use client';

import React, { useState } from 'react';
import { Palette, Tag, Pin, Lock, Trash2, X, LayoutGrid, AlignLeft, Check } from 'lucide-react';

interface BatchActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchRecolor: (color: string) => void;
  onBatchTag: (tag: string) => void;
  onBatchPinToggle: (pinState: boolean) => void;
  onBatchLockToggle: (lockState: boolean) => void;
  onBatchAlign: (mode: 'row' | 'column' | 'grid') => void;
  onBatchDelete: () => void;
}

const COLOR_PRESETS = [
  { name: 'Yellow', value: '#FFEB3B' },
  { name: 'Pink', value: '#F48FB1' },
  { name: 'Blue', value: '#81D4FA' },
  { name: 'Green', value: '#A5D6A7' },
  { name: 'Orange', value: '#FFE0B2' },
  { name: 'Purple', value: '#CE93D8' },
  { name: 'Coral', value: '#FFAB91' },
  { name: 'White', value: '#FFFFFF' },
];

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBatchRecolor,
  onBatchTag,
  onBatchPinToggle,
  onBatchLockToggle,
  onBatchAlign,
  onBatchDelete,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagText, setTagText] = useState('');

  if (selectedCount < 2) return null;

  const handleApplyTag = () => {
    if (tagText.trim()) {
      const cleanTag = tagText.trim().replace(/^#/, '');
      onBatchTag(cleanTag);
      setTagText('');
      setShowTagInput(false);
    }
  };

  return (
    <div
      className="batch-action-bar"
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        backgroundColor: 'var(--ui-surface, #ffffff)',
        border: '1.5px solid var(--ui-accent, #e65100)',
        borderRadius: '16px',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.22), 0 4px 12px rgba(230,81,0,0.15)',
        animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}
    >
      {/* Selected Count Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px', borderRight: '1px solid var(--ui-border, #e0e0e0)' }}>
        <span
          style={{
            backgroundColor: 'var(--ui-accent, #e65100)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.8rem',
            padding: '2px 8px',
            borderRadius: '12px',
          }}
        >
          {selectedCount}
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ui-text, #333)' }}>
          Notes Selected
        </span>
      </div>

      {/* Recolor Option */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowTagInput(false);
          }}
          title="Change color of selected notes"
        >
          <Palette size={14} /> Color
        </button>

        {showColorPicker && (
          <div
            style={{
              position: 'absolute',
              bottom: '120%',
              left: '0',
              backgroundColor: 'var(--ui-surface, #fff)',
              border: '1px solid var(--ui-border, #ddd)',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              gap: '6px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              zIndex: 1200,
            }}
          >
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  onBatchRecolor(preset.value);
                  setShowColorPicker(false);
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: preset.value,
                  border: '1px solid rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                }}
                title={preset.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Batch Tagging */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => {
            setShowTagInput(!showTagInput);
            setShowColorPicker(false);
          }}
          title="Add tag to selected notes"
        >
          <Tag size={14} /> Tag
        </button>

        {showTagInput && (
          <div
            style={{
              position: 'absolute',
              bottom: '120%',
              left: '0',
              backgroundColor: 'var(--ui-surface, #fff)',
              border: '1px solid var(--ui-border, #ddd)',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              gap: '6px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              zIndex: 1200,
            }}
          >
            <input
              type="text"
              placeholder="Tag name..."
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyTag()}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--ui-border, #ccc)',
                fontSize: '0.8rem',
                width: '110px',
              }}
              autoFocus
            />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
              onClick={handleApplyTag}
            >
              <Check size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Pin / Lock Toggles */}
      <button
        type="button"
        className="btn-secondary"
        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
        onClick={() => onBatchPinToggle(true)}
        title="Pin selected notes"
      >
        <Pin size={14} /> Pin
      </button>

      <button
        type="button"
        className="btn-secondary"
        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
        onClick={() => onBatchLockToggle(true)}
        title="Lock selected notes"
      >
        <Lock size={14} /> Lock
      </button>

      {/* Auto-Align Selection */}
      <button
        type="button"
        className="btn-secondary"
        style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
        onClick={() => onBatchAlign('grid')}
        title="Align selected notes in grid"
      >
        <LayoutGrid size={14} /> Align
      </button>

      {/* Batch Delete */}
      <button
        type="button"
        className="btn-icon"
        style={{ color: 'var(--ui-danger, #d32f2f)', padding: '6px' }}
        onClick={onBatchDelete}
        title="Move selected notes to Trash Bin"
      >
        <Trash2 size={16} />
      </button>

      <div style={{ width: '1px', height: '20px', background: 'var(--ui-border, #e0e0e0)' }} />

      {/* Clear Selection */}
      <button
        type="button"
        className="btn-icon"
        style={{ color: 'var(--ui-text-muted, #777)', padding: '4px' }}
        onClick={onClearSelection}
        title="Clear Selection (Esc)"
      >
        <X size={18} />
      </button>
    </div>
  );
};
