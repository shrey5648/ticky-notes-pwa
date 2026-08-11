'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, LayoutGrid, Trash2, Users, Download, Upload, Moon, Sun, Pin, Tag, Sparkles, X, ChevronRight, Bell, Mic } from 'lucide-react';
import { Note } from '@/lib/types';
import { requestNotificationPermission } from '@/lib/notifications';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onAutoArrange: () => void;
  onOpenTrash: () => void;
  onOpenUserManagement?: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleTheme: () => void;
  onFilterTag?: (tag: string) => void;
  isAdmin?: boolean;
}

interface CommandItem {
  id: string;
  category: 'action' | 'note' | 'tag';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  onCreateNote,
  onAutoArrange,
  onOpenTrash,
  onOpenUserManagement,
  onExport,
  onImport,
  onToggleTheme,
  onFilterTag,
  isAdmin = false,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build command items
  const actionItems: CommandItem[] = [
    {
      id: 'cmd-new',
      category: 'action',
      title: 'Create New Sticky Note',
      subtitle: 'Add a new blank note to your current board',
      icon: <Plus size={16} className="text-accent" />,
      action: () => { onCreateNote(); onClose(); },
    },
    {
      id: 'cmd-notifications',
      category: 'action',
      title: 'Enable Push Notifications & Alarms',
      subtitle: 'Receive browser notifications for upcoming note due dates',
      icon: <Bell size={16} />,
      action: () => { requestNotificationPermission(); onClose(); },
    },
    {
      id: 'cmd-dictation',
      category: 'action',
      title: 'Voice Dictation & Speech Notes',
      subtitle: 'Create a note with continuous speech-to-text dictation',
      icon: <Mic size={16} />,
      action: () => { onCreateNote(); onClose(); },
    },
    {
      id: 'cmd-ai-assistant',
      category: 'action',
      title: 'AI Workspace Assistant',
      subtitle: 'Auto-Summarize notes, Smart Tagging, and Idea Expansion',
      icon: <Sparkles size={16} />,
      action: () => { onCreateNote(); onClose(); },
    },
    {
      id: 'cmd-arrange',
      category: 'action',
      title: 'Auto-Arrange Notes',
      subtitle: 'Align all notes neatly in grid layout',
      icon: <LayoutGrid size={16} />,
      action: () => { onAutoArrange(); onClose(); },
    },
    {
      id: 'cmd-trash',
      category: 'action',
      title: 'Open Trash Bin',
      subtitle: 'Restore or permanently delete archived notes',
      icon: <Trash2 size={16} />,
      action: () => { onOpenTrash(); onClose(); },
    },
    {
      id: 'cmd-export',
      category: 'action',
      title: 'Export Notes & Boards',
      subtitle: 'Download backup in JSON / Markdown format',
      icon: <Download size={16} />,
      action: () => { onExport(); onClose(); },
    },
    {
      id: 'cmd-import',
      category: 'action',
      title: 'Import Notes',
      subtitle: 'Restore notes from backup JSON file',
      icon: <Upload size={16} />,
      action: () => { onImport(); onClose(); },
    },
    {
      id: 'cmd-theme',
      category: 'action',
      title: 'Toggle Light / Dark Theme',
      subtitle: 'Switch application color palette mode',
      icon: <Moon size={16} />,
      action: () => { onToggleTheme(); onClose(); },
    },
  ];

  if (isAdmin && onOpenUserManagement) {
    actionItems.push({
      id: 'cmd-users',
      category: 'action',
      title: 'User Management (Admin)',
      subtitle: 'Create users, manage roles, reset PINs',
      icon: <Users size={16} />,
      action: () => { onOpenUserManagement(); onClose(); },
    });
  }

  // Filter notes by search query
  const matchingNotes: CommandItem[] = notes
    .filter((n) => {
      if (!query.trim()) return false;
      const q = query.toLowerCase();
      const titleMatch = n.title?.toLowerCase().includes(q);
      const contentMatch = n.content?.toLowerCase().includes(q);
      const tagMatch = n.tags?.some((t) => t.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagMatch;
    })
    .slice(0, 8)
    .map((n) => ({
      id: `note-${n.id}`,
      category: 'note',
      title: n.title || 'Untitled Note',
      subtitle: n.tags && n.tags.length > 0 ? `Tags: #${n.tags.join(' #')}` : 'Click to open note editor',
      icon: n.is_pinned ? <Pin size={16} style={{ color: '#d32f2f' }} /> : <Sparkles size={16} />,
      action: () => { onSelectNote(n); onClose(); },
    }));

  // Filter actions by query
  const matchingActions = actionItems.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q);
  });

  const allFilteredItems = [...matchingNotes, ...matchingActions];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (allFilteredItems.length > 0 ? (prev + 1) % allFilteredItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (allFilteredItems.length > 0 ? (prev - 1 + allFilteredItems.length) % allFilteredItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allFilteredItems[selectedIndex]) {
        allFilteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '620px',
          width: '90vw',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--ui-border, #eee)',
            background: 'var(--ui-bg, #fff)',
          }}
        >
          <Search size={20} style={{ color: 'var(--ui-accent, #e65100)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search notes... (Cmd+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1.05rem',
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--ui-text, #333)',
            }}
          />
          <button className="btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Command List Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {allFilteredItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ui-text-muted, #888)' }}>
              No matching notes or commands found for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {matchingNotes.length > 0 && (
                <div style={{ padding: '6px 18px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--ui-accent, #e65100)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Matching Sticky Notes ({matchingNotes.length})
                </div>
              )}
              {matchingNotes.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--ui-accent-light, rgba(230,81,0,0.08))' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--ui-accent, #e65100)' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ color: 'var(--ui-accent, #e65100)' }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--ui-text, #333)' }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--ui-text-muted, #777)' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ opacity: isSelected ? 1 : 0.3 }} />
                  </div>
                );
              })}

              {matchingActions.length > 0 && (
                <div style={{ padding: '12px 18px 6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--ui-text-muted, #777)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Quick Actions
                </div>
              )}
              {matchingActions.map((item, idx) => {
                const globalIdx = matchingNotes.length + idx;
                const isSelected = globalIdx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--ui-accent-light, rgba(230,81,0,0.08))' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--ui-accent, #e65100)' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ color: 'var(--ui-accent, #e65100)' }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ui-text, #333)' }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--ui-text-muted, #777)' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ opacity: isSelected ? 1 : 0.3 }} />
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer Shortcut Tips */}
        <div
          style={{
            padding: '10px 20px',
            background: 'var(--ui-surface, #f9f9f9)',
            borderTop: '1px solid var(--ui-border, #eee)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--ui-text-muted, #777)',
          }}
        >
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
          <span>Press <strong>Enter</strong> to select</span>
          <span><strong>Esc</strong> to close</span>
        </div>
      </div>
    </div>
  );
};
