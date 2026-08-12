'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Note, Board } from '@/lib/types';
import { PresenceBar } from './PresenceBar';
import { UserPresence } from '@/lib/types';
import { BoardSelector } from './BoardSelector';
import { ExportMenu } from './ExportMenu';
import { ThemeSelector } from './ThemeSelector';
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
  Activity,
} from 'lucide-react';

interface ToolbarProps {
  user: User | null;
  notes?: Note[];
  workspaceUsers?: User[];
  presences?: UserPresence[];
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
  onOpenActivityFeed?: () => void;
  onAutoArrange?: () => void;
  onExportJSON?: () => void;
  onExportMarkdown?: () => void;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
  isOnline: boolean;
  syncing: boolean;
  theme: 'light' | 'dark';
  themeVariant?: string;
  onSelectThemeVariant?: (variant: string) => void;
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
  presences = [],
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
  onOpenActivityFeed,
  onAutoArrange,
  onExportJSON,
  onExportMarkdown,
  onExportPNG,
  onExportPDF,
  isOnline,
  syncing,
  theme,
  themeVariant = 'cork',
  onSelectThemeVariant,
  onToggleTheme,
  onCreateNote,
  onSelectNote,
  onOpenUserManagement,
  onLogout,
}) => {

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showNotesPicker, setShowNotesPicker] = useState(false);
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const userFilterRef = useRef<HTMLDivElement>(null);
  const tagFilterRef = useRef<HTMLDivElement>(null);

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
      if (tagFilterRef.current && !tagFilterRef.current.contains(e.target as Node)) {
        setShowFiltersMenu(false);
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
      {/* Board Selector */}
      <BoardSelector
        boards={boards || []}
        currentBoardId={currentBoardId || 'board-default'}
        onSelectBoard={onSelectBoard}
        onCreateBoard={onCreateBoard}
      />

      {/* Online Presence Bar */}
      <PresenceBar currentUser={user} presences={presences} />

      {/* Activity Log Button */}
      {onOpenActivityFeed && (
        <button
          className="btn-icon"
          onClick={onOpenActivityFeed}
          title="Workspace Activity Log"
          style={{ width: '32px', height: '32px', color: '#10b981' }}
        >
          <Activity size={15} />
        </button>
      )}

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
      {/* Integrated Filters Dropdown */}
      {(() => {
        const activeFiltersCount = [
          showPinnedOnly ? 1 : 0,
          showSharedOnly ? 1 : 0,
          showArchived ? 1 : 0,
          selectedColor ? 1 : 0,
          selectedUserFilter ? 1 : 0,
          selectedTagFilter ? 1 : 0,
        ].reduce((a, b) => a + b, 0);

        const handleClearAllFilters = () => {
          if (showPinnedOnly) onTogglePinnedOnly();
          if (showSharedOnly) onToggleSharedOnly();
          if (showArchived) onToggleArchived();
          if (selectedColor) onColorSelect(null);
          if (selectedUserFilter) onUserFilterSelect(null);
          if (selectedTagFilter && onTagFilterSelect) onTagFilterSelect(null);
        };

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ position: 'relative' }} ref={tagFilterRef}>
              <button
                className="btn-secondary"
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                title="Filter Board Notes"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '0.8rem',
                  border: activeFiltersCount > 0 ? '1.5px solid var(--ui-accent)' : '1px solid var(--ui-border)',
                  background: activeFiltersCount > 0 ? 'var(--ui-accent-light)' : 'var(--ui-bg)',
                  color: activeFiltersCount > 0 ? 'var(--ui-accent)' : 'var(--ui-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '50px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Filter size={13} style={{ marginRight: '4px' }} /> Filters
                {activeFiltersCount > 0 && (
                  <span
                    style={{
                      background: 'var(--ui-accent)',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      marginLeft: '5px',
                    }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown size={12} style={{ transform: showFiltersMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: '5px' }} />
              </button>

              {showFiltersMenu && (
                <div
                  className="dynamic-island-dropdown"
                  style={{
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '280px',
                    padding: '16px',
                    maxHeight: '480px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    textAlign: 'left',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ui-text)' }}>Filter Notes</span>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={handleClearAllFilters}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ui-accent)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Quick Toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showPinnedOnly} onChange={onTogglePinnedOnly} style={{ accentColor: 'var(--ui-accent)' }} />
                      <span>📌 Pinned Only</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showSharedOnly} onChange={onToggleSharedOnly} style={{ accentColor: 'var(--ui-accent)' }} />
                      <span>👥 Shared Only</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showArchived} onChange={onToggleArchived} style={{ accentColor: 'var(--ui-accent)' }} />
                      <span>📦 Archived Notes</span>
                    </label>
                  </div>

                  <div style={{ height: '1px', background: 'var(--ui-border)' }} />

                  {/* Filter by User */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Filter by User</div>
                    <select
                      value={selectedUserFilter || ''}
                      onChange={(e) => onUserFilterSelect(e.target.value || null)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--ui-border)',
                        background: 'var(--ui-bg)',
                        color: 'var(--ui-text)',
                        fontSize: '0.82rem',
                        outline: 'none',
                      }}
                    >
                      <option value="">All Users</option>
                      {user && <option value={user.id}>Me ({user.display_name || user.username})</option>}
                      {workspaceUsers
                        .filter((u) => u.id !== user?.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name || u.username}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Filter by Tag */}
                  {onTagFilterSelect && availableTags.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Filter by Tag</div>
                      <select
                        value={selectedTagFilter || ''}
                        onChange={(e) => onTagFilterSelect(e.target.value || null)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--ui-border)',
                          background: 'var(--ui-bg)',
                          color: 'var(--ui-text)',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      >
                        <option value="">All Tags</option>
                        {availableTags.map((t) => (
                          <option key={t} value={t}>
                            #{t}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Filter by Color */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Filter by Color</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => onColorSelect(null)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: selectedColor === null ? '1.5px solid var(--ui-accent)' : '1px solid var(--ui-border)',
                          background: selectedColor === null ? 'var(--ui-accent-light)' : 'var(--ui-bg)',
                          color: selectedColor === null ? 'var(--ui-accent)' : 'var(--ui-text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                      {COLOR_PRESETS.map((cp) => (
                        <button
                          key={cp.value}
                          onClick={() => onColorSelect(cp.value)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: cp.value,
                            border: selectedColor === cp.value ? '2px solid var(--ui-accent)' : '1px solid rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                          }}
                          title={cp.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trash Bin Trigger */}
            {onOpenTrashBin && (
              <button
                className="btn-icon"
                onClick={onOpenTrashBin}
                title="Open Trash Bin"
                aria-label="Open Trash Bin"
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
        );
      })()}

      <div style={{ width: '1px', height: '18px', background: 'var(--ui-border)', flexShrink: 0 }} />

      {/* Export Board Menu */}
      <ExportMenu
        onExportJSON={onExportJSON}
        onExportMarkdown={onExportMarkdown}
        onExportPNG={onExportPNG}
        onExportPDF={onExportPDF}
      />

      {/* Canvas Theme Selector */}
      <ThemeSelector
        themeVariant={themeVariant}
        onSelectThemeVariant={onSelectThemeVariant}
      />

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



      {/* PWA Install Modal */}
      {showInstallModal && (
        <div className="modal-overlay">
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
