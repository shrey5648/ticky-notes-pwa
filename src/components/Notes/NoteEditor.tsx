'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Note } from '@/lib/types';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Palette,
  Link as LinkIcon,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
  X,
  Check,
  Share2,
  Trash2,
} from 'lucide-react';

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

const TEXT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#c62828' },
  { name: 'Orange', value: '#e65100' },
  { name: 'Yellow', value: '#f9a825' },
  { name: 'Green', value: '#2e7d32' },
  { name: 'Blue', value: '#1565c0' },
  { name: 'Purple', value: '#6a1b9a' },
  { name: 'Pink', value: '#ad1457' },
  { name: 'Gray', value: '#616161' },
  { name: 'Black', value: '#000000' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fff176' },
  { name: 'Green', value: '#a5d6a7' },
  { name: 'Blue', value: '#81d4fa' },
  { name: 'Pink', value: '#f48fb1' },
  { name: 'Orange', value: '#ffcc80' },
  { name: 'Purple', value: '#ce93d8' },
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
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Subscript,
      Superscript,
    ],
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

  // Close popovers on outside click
  useEffect(() => {
    const handler = () => {
      setShowTextColorPicker(false);
      setShowHighlightPicker(false);
      setShowLinkDialog(false);
    };
    if (showTextColorPicker || showHighlightPicker || showLinkDialog) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [showTextColorPicker, showHighlightPicker, showLinkDialog]);

  const getWordCount = useCallback(() => {
    if (!editor) return { words: 0, chars: 0 };
    const text = editor.state.doc.textContent;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, chars: text.length };
  }, [editor]);

  if (!isOpen || !note) return null;

  const isReadOnly = note.permission === 'view';

  const handleSave = () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
    onSave(note.id, { title, content: htmlContent, color });
    onClose();
  };

  const handleSetLink = () => {
    if (!editor) return;
    if (linkUrl.trim()) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  const { words, chars } = getWordCount();

  // Toolbar button helper
  const ToolBtn = ({
    icon,
    title,
    isActive,
    onClick,
    disabled,
    style,
  }: {
    icon: React.ReactNode;
    title: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
  }) => (
    <button
      type="button"
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{ ...style, opacity: disabled ? 0.3 : 1, cursor: disabled ? 'default' : 'pointer' }}
    >
      {icon}
    </button>
  );

  const Sep = () => <div className="separator" />;

  return (
    <div className="modal-overlay" onClick={handleSave}>
      <div
        className="modal-content note-editor-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `5px solid ${color}` }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--ui-text-muted)',
            }}
          >
            {isReadOnly ? '👁️ Viewing (Read-Only)' : '✏️ Edit Sticky Note'}
          </span>
          <button className="btn-icon" onClick={handleSave} title="Close">
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
          id="note-editor-title"
          style={{
            width: '100%',
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-note)',
            border: 'none',
            borderBottom: '2px dashed var(--ui-border)',
            background: 'transparent',
            outline: 'none',
            padding: '4px 0 10px 0',
            marginBottom: '16px',
            color: 'var(--ui-text)',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--ui-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--ui-border)')}
        />

        {/* Rich Text Formatting Toolbar */}
        {!isReadOnly && editor && (
          <div className="editor-toolbar">
            {/* Text Style Group */}
            <ToolBtn
              icon={<Bold size={15} />}
              title="Bold (Ctrl+B)"
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolBtn
              icon={<Italic size={15} />}
              title="Italic (Ctrl+I)"
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolBtn
              icon={<UnderlineIcon size={15} />}
              title="Underline (Ctrl+U)"
              isActive={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolBtn
              icon={<Strikethrough size={15} />}
              title="Strikethrough"
              isActive={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />

            <Sep />

            {/* Heading Group */}
            <ToolBtn
              icon={<Heading1 size={15} />}
              title="Heading 1"
              isActive={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolBtn
              icon={<Heading2 size={15} />}
              title="Heading 2"
              isActive={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolBtn
              icon={<Heading3 size={15} />}
              title="Heading 3"
              isActive={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />

            <Sep />

            {/* List Group */}
            <ToolBtn
              icon={<List size={15} />}
              title="Bullet List"
              isActive={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolBtn
              icon={<ListOrdered size={15} />}
              title="Ordered List"
              isActive={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
            <ToolBtn
              icon={<CheckSquare size={15} />}
              title="Task List (Checklist)"
              isActive={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            />

            <Sep />

            {/* Block Group */}
            <ToolBtn
              icon={<Quote size={15} />}
              title="Blockquote"
              isActive={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            />
            <ToolBtn
              icon={<Code size={15} />}
              title="Code Block"
              isActive={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            />
            <ToolBtn
              icon={<Minus size={15} />}
              title="Horizontal Rule"
              isActive={false}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            />

            <Sep />

            {/* Alignment Group */}
            <ToolBtn
              icon={<AlignLeft size={15} />}
              title="Align Left"
              isActive={editor.isActive({ textAlign: 'left' })}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            />
            <ToolBtn
              icon={<AlignCenter size={15} />}
              title="Align Center"
              isActive={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            />
            <ToolBtn
              icon={<AlignRight size={15} />}
              title="Align Right"
              isActive={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            />

            <Sep />

            {/* Color & Highlight Group */}
            <div style={{ position: 'relative' }}>
              <ToolBtn
                icon={<Palette size={15} />}
                title="Text Color"
                isActive={showTextColorPicker}
                onClick={(e: any) => {
                  e?.stopPropagation?.();
                  setShowTextColorPicker(!showTextColorPicker);
                  setShowHighlightPicker(false);
                  setShowLinkDialog(false);
                }}
              />
              {showTextColorPicker && (
                <div className="color-picker-popover" onClick={(e) => e.stopPropagation()}>
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.value || 'default'}
                      className="color-swatch"
                      style={{
                        backgroundColor: c.value || 'var(--ui-text)',
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                      title={c.name}
                      onClick={() => {
                        if (c.value) {
                          editor.chain().focus().setColor(c.value).run();
                        } else {
                          editor.chain().focus().unsetColor().run();
                        }
                        setShowTextColorPicker(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <ToolBtn
                icon={<Highlighter size={15} />}
                title="Highlight"
                isActive={editor.isActive('highlight') || showHighlightPicker}
                onClick={(e: any) => {
                  e?.stopPropagation?.();
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowTextColorPicker(false);
                  setShowLinkDialog(false);
                }}
              />
              {showHighlightPicker && (
                <div className="color-picker-popover" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} onClick={(e) => e.stopPropagation()}>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      className="color-swatch"
                      style={{
                        backgroundColor: c.value,
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                      title={c.name}
                      onClick={() => {
                        editor.chain().focus().toggleHighlight({ color: c.value }).run();
                        setShowHighlightPicker(false);
                      }}
                    />
                  ))}
                  <button
                    className="color-swatch"
                    style={{
                      background: 'linear-gradient(135deg, #eee, #ccc)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      gridColumn: 'span 3',
                      width: '100%',
                      height: '22px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: '#666',
                    }}
                    title="Remove highlight"
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run();
                      setShowHighlightPicker(false);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <Sep />

            {/* Link */}
            <div style={{ position: 'relative' }}>
              <ToolBtn
                icon={<LinkIcon size={15} />}
                title="Insert Link"
                isActive={editor.isActive('link') || showLinkDialog}
                onClick={(e: any) => {
                  e?.stopPropagation?.();
                  const existingUrl = editor.getAttributes('link').href || '';
                  setLinkUrl(existingUrl);
                  setShowLinkDialog(!showLinkDialog);
                  setShowTextColorPicker(false);
                  setShowHighlightPicker(false);
                  setTimeout(() => linkInputRef.current?.focus(), 100);
                }}
              />
              {showLinkDialog && (
                <div className="link-dialog" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={linkInputRef}
                    type="text"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSetLink();
                    }}
                  />
                  <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={handleSetLink}>
                    {linkUrl ? 'Set' : 'Remove'}
                  </button>
                </div>
              )}
            </div>

            <Sep />

            {/* Sub / Superscript */}
            <ToolBtn
              icon={<SubIcon size={15} />}
              title="Subscript"
              isActive={editor.isActive('subscript')}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            />
            <ToolBtn
              icon={<SupIcon size={15} />}
              title="Superscript"
              isActive={editor.isActive('superscript')}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            />

            <Sep />

            {/* Undo / Redo / Clear */}
            <ToolBtn
              icon={<Undo2 size={15} />}
              title="Undo (Ctrl+Z)"
              isActive={false}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            />
            <ToolBtn
              icon={<Redo2 size={15} />}
              title="Redo (Ctrl+Shift+Z)"
              isActive={false}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            />
            <ToolBtn
              icon={<RemoveFormatting size={15} />}
              title="Clear Formatting"
              isActive={false}
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            />
          </div>
        )}

        {/* Editor Content Area */}
        <div className="editor-content-area">
          <EditorContent editor={editor} disabled={isReadOnly} />
        </div>

        {/* Word / Character Count */}
        <div className="word-count">
          {words} words · {chars} characters
        </div>

        {/* Note Color Palette */}
        {!isReadOnly && (
          <div style={{ marginBottom: '20px', marginTop: '8px' }}>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'block',
                marginBottom: '8px',
                color: 'var(--ui-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Note Color
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: preset.value,
                    border: color === preset.value ? '2.5px solid var(--ui-accent)' : '1.5px solid rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: color === preset.value ? '0 2px 8px rgba(230, 81, 0, 0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                    transform: color === preset.value ? 'scale(1.1)' : 'scale(1)',
                  }}
                  title={preset.name}
                >
                  {color === preset.value && <Check size={14} style={{ color: '#333' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {onShare && note.permission === 'owner' && (
              <button
                type="button"
                className="btn-secondary"
                title="Share sticky note"
                onClick={() => { onClose(); onShare(note); }}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                <Share2 size={14} /> Share
              </button>
            )}
            {onDelete && note.permission === 'owner' && (
              <button
                type="button"
                className="btn-icon"
                style={{ color: 'var(--ui-danger)' }}
                title="Delete note"
                onClick={() => { onClose(); onDelete(note.id); }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <button type="button" className="btn-primary" onClick={handleSave} id="btn-save-note">
            <Check size={15} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
