'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { CorkBoard, autoArrangeNotes } from '@/components/Board/CorkBoard';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { NoteEditor } from '@/components/Notes/NoteEditor';
import { ShareDialog } from '@/components/Share/ShareDialog';
import { UserManagementModal } from '@/components/Users/UserManagementModal';
import { TrashBinModal } from '@/components/Modals/TrashBinModal';
import { Note, User, Board } from '@/lib/types';
import {
  exportBoardToJSON,
  exportBoardToMarkdown,
  exportBoardToPNG,
  printBoardToPDF,
} from '@/lib/exportUtils';
import { useRouter } from 'next/navigation';

export default function StickyNotesAppPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { notes, loading: notesLoading, isOnline, syncing, createNote, updateNote, deleteNote } = useNotes(user?.id);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Boards state
  const [boards, setBoards] = useState<Board[]>([
    { id: 'board-default', name: 'Main Board', owner_id: user?.id || 'admin', created_at: new Date().toISOString() },
  ]);
  const [currentBoardId, setCurrentBoardId] = useState<string>('board-default');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Workspace Users state
  const [workspaceUsers, setWorkspaceUsers] = useState<User[]>([]);

  // Modals state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showTrashBin, setShowTrashBin] = useState(false);

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch workspace users and boards
  useEffect(() => {
    if (user) {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setWorkspaceUsers(data.users);
        })
        .catch((err) => console.error('Failed to fetch workspace users:', err));

      fetch('/api/boards')
        .then((res) => res.json())
        .then((data) => {
          if (data.boards && data.boards.length > 0) {
            setBoards(data.boards);
          }
        })
        .catch((err) => console.error('Failed to fetch boards:', err));
    }
  }, [user]);

  // Create new board
  const handleCreateBoard = async (name: string) => {
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.board) {
        setBoards([...boards, data.board]);
        setCurrentBoardId(data.board.id);
      }
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  // Bring note to top z-index stack
  const handleBringToFront = (id: string) => {
    const maxZ = Math.max(...notes.map((n) => n.z_index || 1), 10);
    updateNote(id, { z_index: maxZ + 1 });
  };

  // Extract all tags from active notes
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [notes]);

  // Separate active notes from soft-deleted notes
  const deletedNotes = useMemo(() => notes.filter((n) => n.is_deleted), [notes]);

  // Filter active board notes array according to user filters
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Exclude deleted notes
      if (n.is_deleted) return false;

      // Board filter
      if (n.board_id && n.board_id !== currentBoardId) return false;

      // Archive status filter
      if (showArchived) {
        if (!n.is_archived) return false;
      } else {
        if (n.is_archived) return false;
      }

      // Filter by User
      if (selectedUserFilter && n.owner_id !== selectedUserFilter) {
        return false;
      }

      // Filter by Tag
      if (selectedTagFilter) {
        if (!n.tags || !n.tags.includes(selectedTagFilter)) return false;
      }

      // Search query (title or content text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        if (!titleMatch && !contentMatch) return false;
      }

      // Color filter
      if (selectedColor && n.color !== selectedColor) {
        return false;
      }

      // Pinned filter
      if (showPinnedOnly && !n.is_pinned) {
        return false;
      }

      // Shared filter
      if (showSharedOnly && !n.is_shared) {
        return false;
      }

      return true;
    });
  }, [notes, currentBoardId, showArchived, selectedUserFilter, selectedTagFilter, searchQuery, selectedColor, showPinnedOnly, showSharedOnly]);

  // Auto Arrange Grid
  const handleAutoArrange = () => {
    autoArrangeNotes(filteredNotes, (id, x, y) => updateNote(id, { position_x: x, position_y: y }));
  };

  // Trash Bin Handlers
  const handleRestoreNote = (id: string) => {
    updateNote(id, { is_deleted: false });
  };

  const handlePurgeNote = async (id: string) => {
    try {
      await fetch(`/api/notes/${id}?purge=true`, { method: 'DELETE' });
      deleteNote(id);
    } catch (err) {
      console.error('Failed to purge note:', err);
    }
  };

  const handlePurgeAll = async () => {
    for (const note of deletedNotes) {
      await handlePurgeNote(note.id);
    }
  };

  // Get current board name
  const currentBoard = boards.find((b) => b.id === currentBoardId);
  const boardName = currentBoard?.name || 'Main Board';

  if (authLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--board-gradient)',
          color: 'var(--ui-text)',
          gap: '16px',
        }}
      >
        <div className="loading-spinner" />
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ui-text-muted)' }}>
          Loading Sticky Notes...
        </span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Top Header Toolbar */}
      <Toolbar
        user={user}
        notes={notes}
        workspaceUsers={workspaceUsers}
        boards={boards}
        currentBoardId={currentBoardId}
        onSelectBoard={setCurrentBoardId}
        onCreateBoard={handleCreateBoard}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
        selectedUserFilter={selectedUserFilter}
        onUserFilterSelect={setSelectedUserFilter}
        selectedTagFilter={selectedTagFilter}
        onTagFilterSelect={setSelectedTagFilter}
        availableTags={availableTags}
        showPinnedOnly={showPinnedOnly}
        onTogglePinnedOnly={() => setShowPinnedOnly(!showPinnedOnly)}
        showSharedOnly={showSharedOnly}
        onToggleSharedOnly={() => setShowSharedOnly(!showSharedOnly)}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        deletedCount={deletedNotes.length}
        onOpenTrashBin={() => setShowTrashBin(true)}
        onAutoArrange={handleAutoArrange}
        onExportJSON={() => exportBoardToJSON(filteredNotes, boardName)}
        onExportMarkdown={() => exportBoardToMarkdown(filteredNotes, boardName)}
        onExportPNG={() => exportBoardToPNG(boardName)}
        onExportPDF={printBoardToPDF}
        isOnline={isOnline}
        syncing={syncing}
        theme={theme}
        onToggleTheme={toggleTheme}
        onCreateNote={() => createNote({ board_id: currentBoardId })}
        onSelectNote={(note) => setEditingNote(note)}
        onOpenUserManagement={() => setShowUserManagement(true)}
        onLogout={logout}
      />

      {/* Cork Board Canvas */}
      <CorkBoard
        notes={filteredNotes}
        onUpdateNotePosition={(id, x, y) => updateNote(id, { position_x: x, position_y: y })}
        onEditNote={setEditingNote}
        onDeleteNote={deleteNote}
        onPinToggle={(id, isPinned) => updateNote(id, { is_pinned: isPinned })}
        onArchiveToggle={(id, isArchived) => updateNote(id, { is_archived: isArchived })}
        onShareNote={setSharingNote}
        onBringToFront={handleBringToFront}
      />

      {/* Rich Text Note Editor Modal */}
      <NoteEditor
        note={editingNote}
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
        onSave={(id, updates) => updateNote(id, updates)}
        onDelete={deleteNote}
        onShare={setSharingNote}
      />

      {/* Share Dialog Modal */}
      <ShareDialog
        note={sharingNote}
        isOpen={Boolean(sharingNote)}
        onClose={() => setSharingNote(null)}
      />

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        currentUser={user}
      />

      {/* Trash Bin Modal */}
      <TrashBinModal
        isOpen={showTrashBin}
        onClose={() => setShowTrashBin(false)}
        deletedNotes={deletedNotes}
        onRestoreNote={handleRestoreNote}
        onPurgeNote={handlePurgeNote}
        onPurgeAll={handlePurgeAll}
      />
    </main>
  );
}
