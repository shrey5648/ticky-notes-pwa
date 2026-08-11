'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { CorkBoard } from '@/components/Board/CorkBoard';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { NoteEditor } from '@/components/Notes/NoteEditor';
import { ShareDialog } from '@/components/Share/ShareDialog';
import { UserManagementModal } from '@/components/Users/UserManagementModal';
import { Note } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function StickyNotesAppPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { notes, loading: notesLoading, isOnline, syncing, createNote, updateNote, deleteNote } = useNotes(user?.id);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Modals state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Bring note to top z-index stack
  const handleBringToFront = (id: string) => {
    const maxZ = Math.max(...notes.map((n) => n.z_index || 1), 10);
    updateNote(id, { z_index: maxZ + 1 });
  };

  // Filter notes array according to active user filters
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Archive status filter
      if (showArchived) {
        if (!n.is_archived) return false;
      } else {
        if (n.is_archived) return false;
      }

      // Search query (title or content text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title.toLowerCase().includes(q);
        const contentMatch = n.content.toLowerCase().includes(q);
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
  }, [notes, showArchived, searchQuery, selectedColor, showPinnedOnly, showSharedOnly]);

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
        showPinnedOnly={showPinnedOnly}
        onTogglePinnedOnly={() => setShowPinnedOnly(!showPinnedOnly)}
        showSharedOnly={showSharedOnly}
        onToggleSharedOnly={() => setShowSharedOnly(!showSharedOnly)}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        isOnline={isOnline}
        syncing={syncing}
        theme={theme}
        onToggleTheme={toggleTheme}
        onCreateNote={() => createNote()}
        onSelectNote={(note) => setEditingNote(note)}
        onOpenUserManagement={() => setShowUserManagement(true)}
        onLogout={logout}
      />

      {/* Cork Board Area */}
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
    </main>
  );
}
