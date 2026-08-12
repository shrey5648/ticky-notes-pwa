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
import { Extension, Node, mergeAttributes } from '@tiptap/core';

// Custom TipTap Extension for Image Node
const TiptapImageNode = Node.create({
  name: 'image',
  group: 'block',
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      style: { default: 'max-width: 100%; border-radius: 8px; margin: 8px 0;' },
    };
  },
  parseHTML() {
    return [{ tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes({ style: 'max-width: 100%; border-radius: 8px; margin: 8px 0;' }, HTMLAttributes)];
  },
});
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
  Plus,
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
  Pipette,
  Calendar,
  Tag as TagIcon,
  Image as ImageIcon,
  Type,
  Grid,
  Sparkles,
  Upload,
  Mic,
  MicOff,
} from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { AIAssistantMenu } from '@/components/Notes/AIAssistantMenu';

// Custom TipTap Extension for Font Size attribute
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

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

const STYLE_VARIANTS = [
  { id: 'default', name: 'Default' },
  { id: 'kraft', name: 'Kraft Paper' },
  { id: 'grid', name: 'Grid Paper' },
  { id: 'lined', name: 'Lined Notebook' },
  { id: 'neon', name: 'Neon Glow' },
];

const FONT_FAMILIES = [
  { id: 'poppins', name: 'Poppins' },
  { id: 'roboto', name: 'Roboto' },
  { id: 'handwriting', name: 'Handwriting' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

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
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [styleVariant, setStyleVariant] = useState<'default' | 'kraft' | 'grid' | 'lined' | 'neon'>('default');
  const [fontFamily, setFontFamily] = useState<'poppins' | 'roboto' | 'handwriting'>('poppins');
  const [currentFontSizeIdx, setCurrentFontSizeIdx] = useState(3); // 18px default


  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const linkInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Write your thoughts here...',
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
      TiptapImageNode,
    ],
    content: note?.content || '',
    immediatelyRender: false,
  });

  const processedWordCountRef = useRef(0);

  const handleSpeechResult = useCallback(
    (currentSpeechText: string, isFinal: boolean) => {
      if (!editor || editor.isDestroyed || !currentSpeechText.trim()) return;

      const words = currentSpeechText.trim().split(/\s+/).filter(Boolean);
      const currentCount = processedWordCountRef.current;

      if (words.length > currentCount) {
        const newWords = words.slice(currentCount).join(' ');
        if (newWords) {
          editor.commands.insertContent(`${newWords} `);
          processedWordCountRef.current = words.length;
        }
      }

      if (isFinal) {
        processedWordCountRef.current = 0;
      }
    },
    [editor]
  );

  const {
    isListening,
    isSupported: isSpeechSupported,
    toggleListening,
    interimTranscript,
    error: speechError,
  } = useSpeechRecognition({ onResult: handleSpeechResult });

  const handleApplyAISummary = (summaryHtml: string) => {
    if (editor) {
      editor.chain().focus().insertContent(summaryHtml).run();
    }
  };

  const handleApplyAITags = (newTags: string[]) => {
    setTags((prev) => Array.from(new Set([...prev, ...newTags])));
  };

  const handleApplyAIIdeas = (ideasHtml: string) => {
    if (editor) {
      editor.chain().focus().insertContent(ideasHtml).run();
    }
  };

  const currentNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (note && note.id !== currentNoteIdRef.current) {
      currentNoteIdRef.current = note.id;
      setTitle(note.title || '');
      setColor(note.color || '#FFEB3B');
      setDueDate(note.due_date || '');
      setTags(note.tags || []);
      setStyleVariant(note.style_variant || 'default');
      setFontFamily((note.font_family as any) || 'poppins');
      if (editor) {
        editor.commands.setContent(note.content || '');
      }
    }
  }, [note, editor]);

  useEffect(() => {
    if (showLinkDialog && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkDialog]);

  const getWordCount = useCallback(() => {
    if (!editor) return { words: 0, chars: 0 };
    const text = editor.state.doc.textContent;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, chars: text.length };
  }, [editor]);

  const isReadOnly = Boolean(note && note.permission === 'view' && !note.is_admin_view);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Execute Save
  const executeSave = useCallback(() => {
    if (!editor || !note) return;
    const htmlContent = editor.getHTML();
    onSave(note.id, {
      title,
      content: htmlContent,
      color,
      due_date: dueDate || null,
      tags,
      style_variant: styleVariant,
      font_family: fontFamily as any,
    });
    setSaveStatus('saved');
  }, [editor, note, onSave, title, color, dueDate, tags, styleVariant, fontFamily]);

  const handleSaveAndClose = () => {
    executeSave();
    onClose();
  };

  const handleSave = () => {
    handleSaveAndClose();
  };

  // Real-time Debounced Auto-Save
  useEffect(() => {
    if (!isOpen || !note || isReadOnly) return;
    setSaveStatus('dirty');
    const timer = setTimeout(() => {
      executeSave();
    }, 800);
    return () => clearTimeout(timer);
  }, [title, color, dueDate, tags, styleVariant, fontFamily, isOpen, note, isReadOnly, executeSave]);

  if (!isOpen || !note) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Local Device Image Selection (FileReader -> Base64 Data URL)
  const handleLocalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        editor
          .chain()
          .focus()
          .insertContent(`<img src="${base64}" alt="${file.name}" style="max-width:100%; border-radius:8px; margin:8px 0;" />`)
          .run();
        setShowImageDialog(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // URL Image Insertion
  const handleInsertImageUrl = () => {
    if (!editor || !imageUrl.trim()) return;
    editor
      .chain()
      .focus()
      .insertContent(`<img src="${imageUrl.trim()}" alt="Image" style="max-width:100%; border-radius:8px; margin:8px 0;" />`)
      .run();
    setImageUrl('');
    setShowImageDialog(false);
  };

  const handleSetLink = () => {
    if (!editor) return;
    if (linkUrl.trim()) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  // Font Size + / - Control Handlers
  const handleIncreaseFontSize = () => {
    if (!editor) return;
    const nextIdx = Math.min(FONT_SIZES.length - 1, currentFontSizeIdx + 1);
    setCurrentFontSizeIdx(nextIdx);
    const size = FONT_SIZES[nextIdx];
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  };

  const handleDecreaseFontSize = () => {
    if (!editor) return;
    const prevIdx = Math.max(0, currentFontSizeIdx - 1);
    setCurrentFontSizeIdx(prevIdx);
    const size = FONT_SIZES[prevIdx];
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  };

  const { words, chars } = getWordCount();

  const ToolBtn = ({
    icon,
    title,
    isActive,
    onClick,
    disabled = false,
  }: {
    icon: React.ReactNode;
    title: string;
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      className={`editor-toolbar-btn ${isActive ? 'active' : ''}`}
      title={title}
      onClick={onClick}
      disabled={disabled || isReadOnly}
      style={{
        padding: '4px 8px',
        border: isActive ? '1.5px solid var(--ui-accent)' : '1px solid var(--ui-border)',
        borderRadius: '5px',
        background: isActive ? 'var(--ui-accent-light)' : 'var(--ui-bg)',
        color: isActive ? 'var(--ui-accent)' : 'var(--ui-text)',
        cursor: 'pointer',
        fontWeight: isActive ? 700 : 400,
        boxShadow: isActive ? '0 1px 3px rgba(230,81,0,0.2)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
    </button>
  );

  return (
    <div className="modal-overlay" onClick={handleSaveAndClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '740px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Title Input */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>📝</span>
            <input
              type="text"
              className="editor-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New Sticky Note"
              disabled={isReadOnly}
              id="input-note-title"
              style={{
                padding: '6px 12px',
                border: '1px solid var(--ui-border)',
                borderRadius: '8px',
                fontSize: '20px',
                fontWeight: 700,
                width: '260px',
                background: 'var(--ui-bg)',
                color: 'var(--ui-text)',
                outline: 'none',
              }}

            />
            {/* Real-time Auto-Save Badge */}
            {!isReadOnly && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: saveStatus === 'saved' ? '#10b981' : '#f97316',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: saveStatus === 'saved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: saveStatus === 'saved' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(249, 115, 22, 0.3)',
                }}
              >
                {saveStatus === 'saved' ? '✓ Auto-Saved' : '⏳ Saving...'}
              </span>
            )}
          </div>
          <button className="btn-icon" onClick={handleSaveAndClose} title="Save & Close editor" id="btn-close-editor">
            <X size={20} />
          </button>
        </div>

        {/* Rich Text Toolbar with single click toggle, font size +/-, and image from device */}
        {!isReadOnly && editor && (
          <div
            className="editor-toolbar"
            style={{
              position: 'relative',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexWrap: 'wrap',
              padding: '8px 12px',
              borderRadius: '12px',
              border: '1px solid var(--ui-border)',
              background: 'var(--ui-bg)',
              marginBottom: '14px',
            }}
          >
            {/* Bold (Single click toggle ON/OFF) */}
            <ToolBtn
              icon={<Bold size={15} />}
              title="Bold (Click to toggle ON/OFF)"
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            {/* Italic */}
            <ToolBtn
              icon={<Italic size={15} />}
              title="Italic (Click to toggle ON/OFF)"
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            {/* Underline */}
            <ToolBtn
              icon={<UnderlineIcon size={15} />}
              title="Underline (Click to toggle ON/OFF)"
              isActive={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            {/* Strikethrough */}
            <ToolBtn
              icon={<Strikethrough size={15} />}
              title="Strikethrough (Click to toggle ON/OFF)"
              isActive={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />

            <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', margin: '0 2px' }} />

            {/* Font Size + / - Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--ui-surface)', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--ui-border)' }}>
              <button
                type="button"
                className="btn-icon"
                style={{ width: '22px', height: '22px' }}
                onClick={handleDecreaseFontSize}
                title="Decrease Font Size (-)"
              >
                <Minus size={12} />
              </button>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0 4px', minWidth: '34px', textAlign: 'center' }}>
                {FONT_SIZES[currentFontSizeIdx]}
              </span>
              <button
                type="button"
                className="btn-icon"
                style={{ width: '22px', height: '22px' }}
                onClick={handleIncreaseFontSize}
                title="Increase Font Size (+)"
              >
                <Plus size={12} />
              </button>
            </div>

            <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', margin: '0 2px' }} />

            {/* Headings */}
            <ToolBtn
              icon={<Heading1 size={15} />}
              title="Heading 1 (Click to toggle ON/OFF)"
              isActive={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolBtn
              icon={<Heading2 size={15} />}
              title="Heading 2 (Click to toggle ON/OFF)"
              isActive={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolBtn
              icon={<Heading3 size={15} />}
              title="Heading 3 (Click to toggle ON/OFF)"
              isActive={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />

            <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', margin: '0 2px' }} />

            {/* Lists */}
            <ToolBtn
              icon={<List size={15} />}
              title="Bullet List (Click to toggle ON/OFF)"
              isActive={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolBtn
              icon={<ListOrdered size={15} />}
              title="Numbered List (Click to toggle ON/OFF)"
              isActive={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
            <ToolBtn
              icon={<CheckSquare size={15} />}
              title="Task Checklist (Click to toggle ON/OFF)"
              isActive={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            />

            <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', margin: '0 2px' }} />

            {/* Image (URL & Local Device Upload) */}
            <ToolBtn
              icon={<ImageIcon size={15} />}
              title="Insert Image (Local device or URL)"
              isActive={showImageDialog}
              onClick={() => setShowImageDialog(!showImageDialog)}
            />
            {/* Link */}
            <ToolBtn
              icon={<LinkIcon size={15} />}
              title="Insert Link"
              isActive={editor.isActive('link')}
              onClick={() => {
                setLinkUrl(editor.getAttributes('link').href || '');
                setShowLinkDialog(!showLinkDialog);
              }}
            />

            <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', margin: '0 2px' }} />

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

            <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', margin: '0 2px' }} />

            {/* Web Speech Dictation Mic Button */}
            {isSpeechSupported ? (
              <ToolBtn
                icon={isListening ? <MicOff size={15} style={{ color: '#ef4444' }} /> : <Mic size={15} />}
                title={isListening ? 'Stop Voice Dictation' : 'Start Voice Dictation (Speak into mic)'}
                isActive={isListening}
                onClick={toggleListening}
              />
            ) : (
              <ToolBtn
                icon={<Mic size={15} style={{ opacity: 0.4 }} />}
                title="Voice dictation (Click for info)"
                isActive={false}
                onClick={() =>
                  alert(
                    'Speech Recognition is supported on Chrome, Chromium, Edge, and Safari! Please ensure microphone permissions are allowed in your browser.'
                  )
                }
              />
            )}

            {/* AI Assistant Menu */}
            <AIAssistantMenu
              noteTitle={title}
              noteContent={editor ? editor.getHTML() : ''}
              onApplySummary={handleApplyAISummary}
              onApplyTags={handleApplyAITags}
              onApplyIdeas={handleApplyAIIdeas}
            />
          </div>
        )}

        {/* Live Speech Dictation Banner Indicator & Error Display */}
        {isListening && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'inline-block',
                animation: 'pulse 1s infinite',
              }}
            />
            🎙️ Listening... {interimTranscript ? `"${interimTranscript}"` : 'Speak into your microphone...'}
          </div>
        )}

        {speechError && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            ⚠️ Speech Error: {speechError}
          </div>
        )}

        {/* Image Dialog (Device Upload + URL Option) */}
        {showImageDialog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'var(--ui-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--ui-border)', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={14} style={{ color: 'var(--ui-accent)' }} /> Add Image
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Option A: Select Image from Local Device */}
              <label
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} /> Select Image from Device
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLocalImageSelect}
                  hidden
                />
              </label>

              <span style={{ fontSize: '0.78rem', color: 'var(--ui-text-muted)', fontWeight: 600 }}>OR</span>

              {/* Option B: Insert via URL */}
              <input
                type="text"
                placeholder="Paste Web Image URL (https://...)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInsertImageUrl()}
                style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--ui-border)', fontSize: '0.82rem', background: 'var(--ui-bg)' }}
              />
              {imageUrl.trim() && (
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleInsertImageUrl}>
                  Insert URL
                </button>
              )}
              <button type="button" className="btn-icon" onClick={() => setShowImageDialog(false)}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Link Dialog */}
        {showLinkDialog && (
          <div style={{ display: 'flex', gap: '8px', padding: '8px', background: 'var(--ui-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
            <input
              ref={linkInputRef}
              type="text"
              placeholder="Enter URL (https://...)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--ui-border)', fontSize: '0.82rem' }}
            />
            <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleSetLink}>
              Save Link
            </button>
            <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => setShowLinkDialog(false)}>
              Cancel
            </button>
          </div>
        )}

        {/* Editor Content Box */}
        <div
          className={`editor-content-area font-${fontFamily}`}
          style={{
            border: '1px solid var(--ui-border)',
            borderRadius: '12px',
            padding: '14px 16px',
            minHeight: '220px',
            background: 'var(--ui-bg)',
            marginBottom: '8px',
          }}
        >
          <EditorContent editor={editor} disabled={isReadOnly} />
        </div>

        {/* Word / Character Count */}
        <div style={{ fontSize: '0.82rem', color: 'var(--ui-text-muted)', marginBottom: '14px' }}>
          {words} words · {chars} characters
        </div>

        {/* Due Date & Tags Row */}
        {!isReadOnly && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ui-border)',
                  background: 'var(--ui-bg)',
                  color: 'var(--ui-text)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
                <TagIcon size={12} style={{ display: 'inline', marginRight: '4px' }} /> Tags (Press Enter)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag (e.g. urgent, todo)"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ui-border)',
                  background: 'var(--ui-bg)',
                  color: 'var(--ui-text)',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            {tags.length > 0 && (
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {tags.map((tag) => (
                  <span key={tag} className="tag-pill" style={{ cursor: 'pointer' }} onClick={() => handleRemoveTag(tag)}>
                    #{tag} <X size={10} style={{ marginLeft: '2px' }} />
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Note Color & Font Option Row */}
        {!isReadOnly && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            {/* Note Color Palette */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
                Note Color
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: preset.value,
                      border: color.toLowerCase() === preset.value.toLowerCase() ? '2.5px solid var(--ui-accent)' : '1px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={preset.name}
                  >
                    {color.toLowerCase() === preset.value.toLowerCase() && <Check size={12} style={{ color: '#333' }} />}
                  </button>
                ))}
                <label
                  title="Pick custom note color..."
                  style={{
                    position: 'relative',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: !COLOR_PRESETS.some((p) => p.value.toLowerCase() === color.toLowerCase())
                      ? color
                      : 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                    border: '1.5px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <input
                    type="color"
                    value={color.startsWith('#') ? color : '#FFEB3B'}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <Pipette size={12} style={{ color: '#fff' }} />
                </label>
              </div>
            </div>

            {/* Font Option Selector */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
                Font Option
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`font-${f.id}`}
                    onClick={() => setFontFamily(f.id as any)}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: fontFamily === f.id ? '2px solid var(--ui-accent)' : '1px solid var(--ui-border)',
                      background: fontFamily === f.id ? 'var(--ui-accent-light)' : 'var(--ui-bg)',
                      color: fontFamily === f.id ? 'var(--ui-accent)' : 'var(--ui-text)',
                      fontWeight: 600,
                      fontSize: f.id === 'handwriting' ? '1rem' : '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {onShare && (note.permission === 'owner' || note.is_admin_view) && (
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
            {onDelete && (note.permission === 'owner' || note.is_admin_view) && (
              <button
                type="button"
                className="btn-icon"
                style={{ color: 'var(--ui-danger)' }}
                title="Move note to Trash Bin"
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
