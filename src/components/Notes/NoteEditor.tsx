'use client';

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Note } from '@/lib/types';
import { Bold, Italic, List, ListOrdered, Heading2, X, Check, Share2, Trash2 } from 'lucide-react';

interface NoteEditorProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Note>) => void;
  onDelete?: (id: string) => void;
  onShare?: (note: Note) => void;
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

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onShare,
}) => {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#FFEB3B');

  const editor = useEditor({
    extensions: [StarterKit],
    content: note?.content || '',
    immediatelyRender: false,
  });

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setColor(note.color || '#FFEB3B');
      if (editor && editor.getHTML() !== note.content) {
        editor.commands.setContent(note.content || '');
      }
    }
  }, [note, editor]);

  if (!isOpen || !note) return null;

  const isReadOnly = note.permission === 'view';

  const handleSave = () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
    onSave(note.id, {
      title,
      content: htmlContent,
      color,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleSave}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderTop: `6px solid ${color}`,
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ui-text-muted)' }}>
            {isReadOnly ? 'Viewing Sticky Note (Read-Only)' : 'Edit Sticky Note'}
          </span>
          <button className="btn-icon" onClick={handleSave}>
            <X size={20} />
          </button>
        </div>

        {/* Title Input */}
        <input
          type="text"
          placeholder="Note title..."
          value={title}
          disabled={isReadOnly}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-note)',
            border: 'none',
            borderBottom: '2px dashed var(--ui-border)',
            background: 'transparent',
            outline: 'none',
            padding: '4px 0 8px 0',
            marginBottom: '16px',
            color: 'var(--ui-text)',
          }}
        />

        {/* Formatting Bar */}
        {!isReadOnly && editor && (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '6px',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: '8px',
              marginBottom: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-icon"
              style={{ width: '32px', height: '32px', background: editor.isActive('bold') ? 'rgba(0,0,0,0.15)' : 'transparent' }}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              className="btn-icon"
              style={{ width: '32px', height: '32px', background: editor.isActive('italic') ? 'rgba(0,0,0,0.15)' : 'transparent' }}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              className="btn-icon"
              style={{ width: '32px', height: '32px', background: editor.isActive('heading', { level: 2 }) ? 'rgba(0,0,0,0.15)' : 'transparent' }}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading"
            >
              <Heading2 size={16} />
            </button>
            <button
              type="button"
              className="btn-icon"
              style={{ width: '32px', height: '32px', background: editor.isActive('bulletList') ? 'rgba(0,0,0,0.15)' : 'transparent' }}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className="btn-icon"
              style={{ width: '32px', height: '32px', background: editor.isActive('orderedList') ? 'rgba(0,0,0,0.15)' : 'transparent' }}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
          </div>
        )}

        {/* Tiptap Rich Text Editor Area */}
        <div
          style={{
            minHeight: '180px',
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--ui-surface)',
            border: '1px solid var(--ui-border)',
            marginBottom: '16px',
            fontFamily: 'var(--font-note)',
            fontSize: '1.25rem',
          }}
        >
          <EditorContent editor={editor} disabled={isReadOnly} />
        </div>

        {/* Color Palette Selector */}
        {!isReadOnly && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--ui-text-muted)' }}>
              Note Color Palette
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: preset.value,
                    border: color === preset.value ? '2px solid var(--ui-accent)' : '1px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  title={preset.name}
                >
                  {color === preset.value && <Check size={14} style={{ color: '#000' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onShare && note.permission === 'owner' && (
              <button
                type="button"
                className="btn-icon"
                title="Share sticky note"
                onClick={() => {
                  onClose();
                  onShare(note);
                }}
              >
                <Share2 size={18} />
              </button>
            )}
            {onDelete && note.permission === 'owner' && (
              <button
                type="button"
                className="btn-icon"
                style={{ color: '#c62828' }}
                title="Delete note"
                onClick={() => {
                  onClose();
                  onDelete(note.id);
                }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Check size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
