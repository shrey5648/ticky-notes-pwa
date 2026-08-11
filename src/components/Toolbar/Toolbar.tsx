'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Note, Board } from '@/lib/types';
import {
  Plus,
  Search,
  Pin,
  Moon,
  Sun,
  Download,
  LogOut,
  Archive,
  Users,
  UserCheck,
  Filter,
  X,
  Laptop,
  CheckCircle2,
  Maximize2,
  Minimize2,
  ChevronDown,
  Edit3,
  StickyNote,
  Clock,
  Sparkles,
  Check,
  Tag,
  LayoutGrid,
  Trash2,
  FileText,
  FileCode,
  Image as ImageIcon,
  Printer,
  FolderPlus,
} from 'lucide-react';

interface ToolbarProps {
  user: User | null;
  notes?: Note[];
  workspaceUsers?: User[];
  boards?: Board[];
  currentBoardId?: string;
  onSelectBoard?: (boardId: string) => void;
  onCreateBoard?: (name: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedColor: string | null;
  onColorSelect: (color: string | null) => void;
  selectedUserFilter: string | null;
  onUserFilterSelect: (userId: string | null) => void;
  selectedTagFilter?: string | null;
  onTagFilterSelect?: (tag: string | null) => void;
  availableTags?: string[];
  showPinnedOnly: boolean;
  onTogglePinnedOnly: () => void;
  showSharedOnly: boolean;
  onToggleSharedOnly: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  deletedCount?: number;
  onOpenTrashBin?: () => void;
  onAutoArrange?: () => void;
  onExportJSON?: () => void;
  onExportMarkdown?: () => void;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
  isOnline: boolean;
  syncing: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onCreateNote: () => void;
  onSelectNote?: (note: Note) => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
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

const stripHtml = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

export const Toolbar: React.FC<ToolbarProps> = ({
  user,
  notes = [],
  workspaceUsers = [],
  boards = [],
  currentBoardId = 'board-default',
  onSelectBoard,
  onCreateBoard,
  searchQuery,
  onSearchChange,
  selectedColor,
  onColorSelect,
  selectedUserFilter,
  onUserFilterSelect,
  selectedTagFilter = null,
  onTagFilterSelect,
  availableTags = [],
  showPinnedOnly,
  onTogglePinnedOnly,
  showSharedOnly,
  onToggleSharedOnly,
  showArchived,
  onToggleArchived,
  deletedCount = 0,
  onOpenTrashBin,
  onAutoArrange,
  onExportJSON,
  onExportMarkdown,
  onExportPNG,
  onExportPDF,
  isOnline,
  syncing,
  theme,
  onToggleTheme,
  onCreateNote,
  onSelectNote,
  onOpenUserManagement,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showNotesPicker, setShowNotesPicker] = useState(false);
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showColorFilter, setShowColorFilter] = useState(false);
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const boardDropdownRef = useRef<HTMLDivElement>(null);
  const userFilterRef = useRef<HTMLDivElement>(null);
  const tagFilterRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      setIsStandalone(!!isStandaloneMode);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onCreateNote();
      } else if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowNotesPicker((prev) => !prev);
      } else if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCreateNote]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowNotesPicker(false);
      }
      if (boardDropdownRef.current && !boardDropdownRef.current.contains(e.target as Node)) {
        setShowBoardDropdown(false);
      }
      if (userFilterRef.current && !userFilterRef.current.contains(e.target as Node)) {
        setShowUserFilter(false);
      }
      if (tagFilterRef.current && !tagFilterRef.current.contains(e.target as Node)) {
        setShowTagFilter(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      } else {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleCreateBoardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardName.trim() && onCreateBoard) {
      onCreateBoard(newBoardName.trim());
      setNewBoardName('');
      setShowNewBoardModal(false);
    }
  };

  const quickFilteredNotes = notes
    .filter((n) => !n.is_archived && !n.is_deleted)
    .filter((n) => {
      if (!quickSearch.trim()) return true;
      const q = quickSearch.toLowerCase();
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const snippetMatch = stripHtml(n.content || '').toLowerCase().includes(q);
      return titleMatch || snippetMatch;
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const currentBoardObj = boards.find((b) => b.id === currentBoardId);

  // Collapsed Dynamic Island View
  if (isCollapsed) {
    return (
      <div className="dynamic-island collapsed" ref={pickerRef}>
        <div
          className="dynamic-island-badge"
          onClick={() => setIsCollapsed(false)}
          title="Click to expand full toolbar (Alt+I)"
        >
          <span className={`status-dot ${isOnline ? (syncing ? 'syncing' : '') : 'offline'}`} />
          <StickyNote size={14} style={{ color: 'var(--ui-accent)' }} />
          <span>Sticky Notes</span>
        </div>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.2)' }} />

        <button
          className="dynamic-island-btn"
          onClick={onCreateNote}
          title="Create New Sticky Note (Alt+N)"
          id="btn-island-new-note"
        >
          <Plus size={14} /> New Note
        </button>

        <button
          className="dynamic-island-btn-secondary"
          onClick={() => setShowNotesPicker(!showNotesPicker)}
          title="Edit Previous Sticky Notes (Alt+E)"
          id="btn-island-edit-previous"
        >
          <Edit3 size={13} /> Edit Note <ChevronDown size={13} style={{ transform: showNotesPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        <button
          className="btn-icon"
          onClick={() => setIsCollapsed(false)}
          title="Expand Full Bar (Alt+I)"
          style={{ width: '28px', height: '28px', color: '#fff', marginLeft: '2px' }}
        >
          <Maximize2 size={13} />
        </button>

        {showNotesPicker && (
          <div className="dynamic-island-dropdown" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} style={{ color: 'var(--ui-accent)' }} /> Edit Previous Notes
              </span>
              <button
                className="btn-icon"
                onClick={() => setShowNotesPicker(false)}
                style={{ width: '24px', height: '24px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', color: 'var(--ui-text-muted)' }} />
              <input
                type="text"
                placeholder="Search note by title..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 28px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--ui-border)',
                  background: 'var(--ui-surface)',
                  color: 'var(--ui-text)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              {quickSearch && (
                <button
                  onClick={() => setQuickSearch('')}
                  style={{ position: 'absolute', right: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ui-text-muted)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', justifyContent: 'center', width: '100%' }}
              onClick={() => {
                setShowNotesPicker(false);
                onCreateNote();
              }}
            >
              <Plus size={14} /> Create Blank Sticky Note
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '280px', paddingRight: '2px' }}>
              {quickFilteredNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '18px 0', fontSize: '0.82rem', color: 'var(--ui-text-muted)' }}>
                  No previous notes found.
                </div>
              ) : (
                quickFilteredNotes.map((note) => {
                  const snippet = stripHtml(note.content);
                  return (
                    <button
                      key={note.id}
                      className="dynamic-island-note-item"
                      onClick={() => {
                        setShowNotesPicker(false);
                        if (onSelectNote) onSelectNote(note);
                      }}
                    >
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: note.color || '#FFEB3B',
                          border: '1px solid rgba(0,0,0,0.15)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {note.title || 'Untitled Note'}
                        </div>
                        {snippet && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--ui-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {snippet}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--ui-text-muted)', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                        <Clock size={10} />
                        {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded Full Toolbar View — Single Clean Horizontal Row
  return (
    <header className="top-toolbar dynamic-island expanded" style={{ flexWrap: 'nowrap', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
      {/* Compact Board Switcher Dropdown */}
      <div style={{ position: 'relative' }} ref={boardDropdownRef}>
        <button
          className="board-tab active"
          onClick={() => setShowBoardDropdown(!showBoardDropdown)}
          title="Switch Workspace Board"
          style={{ padding: '5px 12px', fontSize: '0.82rem', height: '32px' }}
        >
          <StickyNote size={13} /> {currentBoardObj?.name || 'Main Board'}{' '}
          <ChevronDown size={13} style={{ transform: showBoardDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showBoardDropdown && (
          <div
            className="dynamic-island-dropdown"
            style={{
              top: 'calc(100% + 8px)',
              left: 0,
              width: '210px',
              padding: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 4px 6px 4px', color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
              Workspace Boards
            </div>
            {boards.map((b) => (
              <button
                key={b.id}
                className="dynamic-island-note-item"
                style={{
                  background: currentBoardId === b.id ? 'var(--ui-accent-light)' : 'transparent',
                  borderColor: currentBoardId === b.id ? 'var(--ui-accent)' : 'var(--ui-border)',
                }}
                onClick={() => {
                  if (onSelectBoard) onSelectBoard(b.id);
                  setShowBoardDropdown(false);
                }}
              >
                <StickyNote size={13} style={{ color: 'var(--ui-accent)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{b.name}</span>
                {currentBoardId === b.id && <Check size={13} style={{ color: 'var(--ui-accent)' }} />}
              </button>
            ))}
            <div style={{ height: '1px', background: 'var(--ui-border)', margin: '4px 0' }} />
            <button
              className="dynamic-island-note-item"
              onClick={() => {
                setShowBoardDropdown(false);
                setShowNewBoardModal(true);
              }}
            >
              <FolderPlus size={14} style={{ color: 'var(--ui-accent)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Create New Board</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Note Button */}
      <button className="btn-primary" onClick={onCreateNote} title="Create new sticky note" id="btn-create-note" style={{ height: '32px', padding: '0 14px', fontSize: '0.82rem' }}>
        <Plus size={15} /> New Note
      </button>

      {/* Auto-Arrange Grid Button */}
      {onAutoArrange && (
        <button
          className="btn-secondary"
          onClick={onAutoArrange}
          title="Auto-align notes into neat grid columns"
          style={{ height: '32px', padding: '0 10px', fontSize: '0.8rem' }}
        >
          <LayoutGrid size={14} /> Align Grid
        </button>
      )}

      {/* Search Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search
          size={13}
          style={{
            position: 'absolute',
            left: '10px',
            color: searchFocused ? 'var(--ui-accent)' : 'var(--ui-text-muted)',
            transition: 'color 0.15s',
            zIndex: 1,
          }}
        />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          id="search-notes"
          style={{
            padding: '5px 10px 5px 28px',
            borderRadius: 'var(--radius-pill)',
            border: `1.5px solid ${searchFocused ? 'var(--ui-accent)' : 'var(--ui-border)'}`,
            background: 'var(--ui-bg)',
            color: 'var(--ui-text)',
            fontSize: '0.82rem',
            width: searchFocused ? '160px' : '120px',
            height: '32px',
            outline: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {searchQuery && (
          <button
            className="btn-icon"
            style={{ width: '20px', height: '20px', position: 'absolute', right: '6px' }}
            onClick={() => onSearchChange('')}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Filter Toggles Group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Color filter */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowColorFilter(!showColorFilter)}
            title="Filter by color"
            id="btn-filter-color"
            style={{
              background: selectedColor ? selectedColor : 'transparent',
              border: selectedColor ? '2px solid var(--ui-accent)' : 'none',
              width: '32px',
              height: '32px',
            }}
          >
            <Filter size={14} />
          </button>

          {showColorFilter && (
            <div className="color-picker-popover" style={{ gridTemplateColumns: 'repeat(4, 1fr)', minWidth: '140px' }}>
              <button
                onClick={() => { onColorSelect(null); setShowColorFilter(false); }}
                className="color-swatch"
                style={{
                  background: 'linear-gradient(135deg, #eee, #ccc)',
                  gridColumn: 'span 4',
                  width: '100%',
                  height: '24px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ui-border)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#666',
                }}
              >
                All Colors
              </button>
              {COLOR_PRESETS.map((cp) => (
                <button
                  key={cp.value}
                  onClick={() => { onColorSelect(cp.value); setShowColorFilter(false); }}
                  className={`color-swatch ${selectedColor === cp.value ? 'active' : ''}`}
                  style={{ backgroundColor: cp.value, border: '1px solid rgba(0,0,0,0.15)' }}
                  title={cp.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Filter by User */}
        <div style={{ position: 'relative' }} ref={userFilterRef}>
          <button
            className="btn-icon"
            onClick={() => setShowUserFilter(!showUserFilter)}
            title={selectedUserFilter ? 'Filter active by User' : 'Filter notes by user'}
            style={{
              background: selectedUserFilter ? 'var(--ui-accent-light)' : 'transparent',
              color: selectedUserFilter ? 'var(--ui-accent)' : 'inherit',
              border: selectedUserFilter ? '1.5px solid var(--ui-accent)' : 'none',
              width: '32px',
              height: '32px',
            }}
          >
            <UserCheck size={14} />
          </button>

          {showUserFilter && (
            <div
              className="dynamic-island-dropdown"
              style={{
                top: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '240px',
                padding: '10px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 4px 6px 4px', color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
                Filter Notes by User
              </div>
              <button
                className="dynamic-island-note-item"
                style={{
                  background: selectedUserFilter === null ? 'var(--ui-accent-light)' : 'transparent',
                  borderColor: selectedUserFilter === null ? 'var(--ui-accent)' : 'var(--ui-border)',
                }}
                onClick={() => {
                  onUserFilterSelect(null);
                  setShowUserFilter(false);
                }}
              >
                <Users size={14} style={{ color: 'var(--ui-accent)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>All Users Notes</span>
                {selectedUserFilter === null && <Check size={14} style={{ color: 'var(--ui-accent)' }} />}
              </button>

              {user && (
                <button
                  className="dynamic-island-note-item"
                  style={{
                    background: selectedUserFilter === user.id ? 'var(--ui-accent-light)' : 'transparent',
                    borderColor: selectedUserFilter === user.id ? 'var(--ui-accent)' : 'var(--ui-border)',
                  }}
                  onClick={() => {
                    onUserFilterSelect(user.id);
                    setShowUserFilter(false);
                  }}
                >
                  <div className="user-avatar" style={{ width: '20px', height: '20px', fontSize: '0.68rem' }}>
                    {(user.display_name || user.username).charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>My Notes Only</span>
                  {selectedUserFilter === user.id && <Check size={14} style={{ color: 'var(--ui-accent)' }} />}
                </button>
              )}

              {workspaceUsers.length > 1 && (
                <div style={{ height: '1px', background: 'var(--ui-border)', margin: '4px 0' }} />
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                {workspaceUsers
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      className="dynamic-island-note-item"
                      style={{
                        background: selectedUserFilter === u.id ? 'var(--ui-accent-light)' : 'transparent',
                        borderColor: selectedUserFilter === u.id ? 'var(--ui-accent)' : 'var(--ui-border)',
                      }}
                      onClick={() => {
                        onUserFilterSelect(u.id);
                        setShowUserFilter(false);
                      }}
                    >
                      <div className="user-avatar" style={{ width: '20px', height: '20px', fontSize: '0.68rem', background: '#9e9e9e' }}>
                        {(u.display_name || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.display_name || u.username}
                        </div>
                      </div>
                      {selectedUserFilter === u.id && <Check size={14} style={{ color: 'var(--ui-accent)' }} />}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter by Tag */}
        {onTagFilterSelect && availableTags.length > 0 && (
          <div style={{ position: 'relative' }} ref={tagFilterRef}>
            <button
              className="btn-icon"
              onClick={() => setShowTagFilter(!showTagFilter)}
              title="Filter by Tag"
              style={{
                background: selectedTagFilter ? 'var(--ui-accent-light)' : 'transparent',
                color: selectedTagFilter ? 'var(--ui-accent)' : 'inherit',
                border: selectedTagFilter ? '1.5px solid var(--ui-accent)' : 'none',
                width: '32px',
                height: '32px',
              }}
            >
              <Tag size={14} />
            </button>

            {showTagFilter && (
              <div
                className="dynamic-island-dropdown"
                style={{
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '200px',
                  padding: '8px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 4px 6px 4px', color: 'var(--ui-text-muted)', textTransform: 'uppercase' }}>
                  Filter by Tag
                </div>
                <button
                  className="dynamic-island-note-item"
                  onClick={() => {
                    onTagFilterSelect(null);
                    setShowTagFilter(false);
                  }}
                >
                  <Tag size={13} /> All Tags
                </button>
                {availableTags.map((t) => (
                  <button
                    key={t}
                    className="dynamic-island-note-item"
                    style={{
                      background: selectedTagFilter === t ? 'var(--ui-accent-light)' : 'transparent',
                      borderColor: selectedTagFilter === t ? 'var(--ui-accent)' : 'var(--ui-border)',
                    }}
                    onClick={() => {
                      onTagFilterSelect(t);
                      setShowTagFilter(false);
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>#{t}</span>
                    {selectedTagFilter === t && <Check size={13} style={{ color: 'var(--ui-accent)', marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pinned filter */}
        <button
          className="btn-icon"
          onClick={onTogglePinnedOnly}
          title="Pinned notes"
          style={{
            background: showPinnedOnly ? 'var(--ui-accent-light)' : 'transparent',
            color: showPinnedOnly ? 'var(--ui-accent)' : 'inherit',
            width: '32px',
            height: '32px',
          }}
        >
          <Pin size={14} />
        </button>

        {/* Archive toggle */}
        <button
          className="btn-icon"
          onClick={onToggleArchived}
          title={showArchived ? 'View active notes' : 'View archived'}
          style={{
            background: showArchived ? 'var(--ui-accent-light)' : 'transparent',
            color: showArchived ? 'var(--ui-accent)' : 'inherit',
            width: '32px',
            height: '32px',
          }}
        >
          <Archive size={14} />
        </button>

        {/* Trash Bin Trigger */}
        {onOpenTrashBin && (
          <button
            className="btn-icon"
            onClick={onOpenTrashBin}
            title="Open Trash Bin"
            style={{ width: '32px', height: '32px', position: 'relative', color: deletedCount > 0 ? 'var(--ui-danger)' : 'inherit' }}
          >
            <Trash2 size={14} />
            {deletedCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: 'var(--ui-danger)',
                  color: '#fff',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {deletedCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', flexShrink: 0 }} />

      {/* Export Board Menu Dropdown */}
      <div style={{ position: 'relative' }} ref={exportMenuRef}>
        <button
          className="btn-secondary"
          onClick={() => setShowExportMenu(!showExportMenu)}
          title="Export Board Notes"
          style={{ padding: '4px 10px', fontSize: '0.78rem', height: '32px' }}
        >
          <Download size={13} /> Export <ChevronDown size={12} style={{ transform: showExportMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showExportMenu && (
          <div
            className="dynamic-island-dropdown"
            style={{
              top: 'calc(100% + 8px)',
              right: 0,
              width: '190px',
              padding: '6px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="dynamic-island-note-item"
              onClick={() => {
                setShowExportMenu(false);
                if (onExportPNG) onExportPNG();
              }}
            >
              <ImageIcon size={14} /> PNG Image Snapshot
            </button>
            <button
              className="dynamic-island-note-item"
              onClick={() => {
                setShowExportMenu(false);
                if (onExportPDF) onExportPDF();
              }}
            >
              <Printer size={14} /> Print / Save as PDF
            </button>
            <button
              className="dynamic-island-note-item"
              onClick={() => {
                setShowExportMenu(false);
                if (onExportMarkdown) onExportMarkdown();
              }}
            >
              <FileText size={14} /> Markdown Document (.md)
            </button>
            <button
              className="dynamic-island-note-item"
              onClick={() => {
                setShowExportMenu(false);
                if (onExportJSON) onExportJSON();
              }}
            >
              <FileCode size={14} /> JSON Backup (.json)
            </button>
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <button
        className="btn-icon"
        onClick={onToggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        style={{ width: '32px', height: '32px' }}
      >
        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
      </button>

      {/* User Avatar & Admin Menu */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            onClick={onOpenUserManagement}
            title={user.role === 'admin' ? '👑 Super Admin Control Panel' : 'Manage Team Users'}
            style={{ width: '32px', height: '32px', position: 'relative' }}
          >
            <Users size={14} style={{ color: user.role === 'admin' ? '#ffd700' : 'var(--ui-accent)' }} />
          </button>
          <div className="user-avatar" style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}>
            {(user.display_name || user.username).charAt(0).toUpperCase()}
          </div>
          <button className="btn-icon" onClick={onLogout} title="Sign Out" style={{ width: '32px', height: '32px' }}>
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* Collapse to Dynamic Island Toggle */}
      <button
        className="btn-icon"
        onClick={() => setIsCollapsed(true)}
        title="Collapse into Dynamic Island (Alt+I)"
        style={{ width: '32px', height: '32px', color: 'var(--ui-accent)' }}
      >
        <Minimize2 size={14} />
      </button>

      {/* Create New Board Modal */}
      {showNewBoardModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Create New Board</h3>
              <button className="btn-icon" onClick={() => setShowNewBoardModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateBoardSubmit}>
              <input
                type="text"
                placeholder="Board Name (e.g. Sprint 24, Personal...)"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ui-border)',
                  background: 'var(--ui-bg)',
                  color: 'var(--ui-text)',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewBoardModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA Install Modal */}
      {showInstallModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Laptop size={20} color="var(--ui-accent)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Install as Desktop App</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowInstallModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--ui-text-muted)' }}>
              Open Sticky Notes in its own standalone desktop window!
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setShowInstallModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
