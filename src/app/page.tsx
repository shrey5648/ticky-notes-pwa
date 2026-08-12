'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { CorkBoard, autoArrangeNotes } from '@/components/Board/CorkBoard';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { NoteEditor } from '@/components/Notes/NoteEditor';
import { ShareDialog } from '@/components/Share/ShareDialog';
import { UserManagementModal } from '@/components/Users/UserManagementModal';
import { TrashBinModal } from '@/components/Modals/TrashBinModal';
import { CommandPaletteModal } from '@/components/Modals/CommandPaletteModal';
import { NotificationAlarmBanner, AlarmItem } from '@/components/Modals/NotificationAlarmBanner';
import { NoteCommentsDrawer } from '@/components/Notes/NoteCommentsDrawer';
import { ActivityFeedModal } from '@/components/Modals/ActivityFeedModal';
import { PWAInstallBanner } from '@/components/PWA/PWAInstallBanner';
import { triggerNativeNotification, requestNotificationPermission } from '@/lib/notifications';
import { Note, User, Board, NoteConnection, NoteFrame } from '@/lib/types';
import { useConnections } from '@/hooks/useConnections';
import { useFrames } from '@/hooks/useFrames';
import { useBoards } from '@/hooks/useBoards';
import {
  exportBoardToJSON,
  exportBoardToMarkdown,
  exportBoardToPNG,
  printBoardToPDF,
} from '@/lib/exportUtils';
import { useRouter } from 'next/navigation';
import { generateUUID } from '@/lib/uuid';
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';

export default function StickyNotesAppPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const {
    notes,
    loading: notesLoading,
    isOnline,
    syncing,
    createNote,
    updateNote,
    deleteNote,
    batchUpdateNotes,
    batchCreateNotes,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useNotes(user?.id);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Boards & Canvas Hooks
  const { boards, setBoards, currentBoardId, onSelectBoard: handleSelectBoard, onCreateBoard: handleCreateBoard } = useBoards(user);
  const { connections, onCreateConnection: handleCreateConnection, onUpdateConnection: handleUpdateConnection, onDeleteConnection: handleDeleteConnection } = useConnections(user, currentBoardId);
  const { frames, onCreateFrame: handleCreateFrame, onUpdateFrame: handleUpdateFrame, onDeleteFrame: handleDeleteFrame } = useFrames(user, currentBoardId);
  const [themeVariant, setThemeVariant] = useState<'cork' | 'dark_leather' | 'blueprint' | 'grid_paper' | 'vintage_pastel' | 'glassmorphism'>('cork');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Multi-Selection State
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Workspace Users state
  const [workspaceUsers, setWorkspaceUsers] = useState<User[]>([]);

  const handleRemoteNoteMove = useCallback((noteId: string, x: number, y: number) => {
    updateNote(noteId, { position_x: x, position_y: y });
  }, [updateNote]);

  // Phase 4 Real-time Presence
  const { activePresences, broadcastCursorMove, broadcastNoteMove } = useRealtimePresence({
    currentUser: user,
    activeBoardId: currentBoardId,
    onRemoteNoteMove: handleRemoteNoteMove,
  });

  // Track mouse movement on window for live cursor broadcast
  useEffect(() => {
    let lastBroadcast = 0;
    const throttleMs = 80; // Broadcast at most once every 80ms

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastBroadcast >= throttleMs) {
        broadcastCursorMove(e.clientX, e.clientY);
        lastBroadcast = now;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [broadcastCursorMove]);

  // Modals state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [commentingNote, setCommentingNote] = useState<Note | null>(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Pending Delete Confirmation State
  const [pendingDelete, setPendingDelete] = useState<{ id?: string; ids?: string[] } | null>(null);



  // Due Date Alarm State
  const [activeAlarms, setActiveAlarms] = useState<AlarmItem[]>([]);
  const [dismissedAlarmIds, setDismissedAlarmIds] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('snoozed-alarms');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.error('Failed to load snoozed alarms:', e);
      }
    }
    return {};
  });

  // Persist snooze alarms on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('snoozed-alarms', JSON.stringify(dismissedAlarmIds));
      } catch (e) {
        console.error('Failed to save snoozed alarms:', e);
      }
    }
  }, [dismissedAlarmIds]);

  // Due Date Monitor Effect (runs every 30s)
  useEffect(() => {
    if (!notes || notes.length === 0) return;

    const checkDueDates = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const newAlarms: AlarmItem[] = [];

      notes.forEach((note) => {
        if (!note.due_date || note.is_deleted || note.is_archived) return;

        // Check if snooze timer is active
        const snoozedUntil = dismissedAlarmIds[note.id];
        if (snoozedUntil && Date.now() < snoozedUntil) return;

        const isDueToday = note.due_date === todayStr;
        const isOverdue = note.due_date < todayStr;

        if (isDueToday || isOverdue) {
          newAlarms.push({ note, isOverdue });
        }
      });

      setActiveAlarms(newAlarms);

      // Trigger native web notification for new alarms
      newAlarms.forEach(({ note, isOverdue }) => {
        if (!dismissedAlarmIds[note.id]) {
          triggerNativeNotification(
            isOverdue ? `🚨 Overdue Note: ${note.title || 'Sticky Note'}` : `🔔 Due Today: ${note.title || 'Sticky Note'}`,
            { body: note.title ? `Note "${note.title}" is due!` : 'Click to view sticky note.', noteId: note.id }
          );
        }
      });
    };

    checkDueDates();
    const interval = setInterval(checkDueDates, 30000);
    return () => clearInterval(interval);
  }, [notes, dismissedAlarmIds]);

  const handleSnoozeAlarm = (noteId: string, minutes: number) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    setDismissedAlarmIds((prev) => ({ ...prev, [noteId]: snoozeUntil }));
    setActiveAlarms((prev) => prev.filter((a) => a.note.id !== noteId));
  };

  const handleDismissAlarm = (noteId: string) => {
    // Dismiss for current 24-hour session
    const snoozeUntil = Date.now() + 24 * 60 * 60 * 1000;
    setDismissedAlarmIds((prev) => ({ ...prev, [noteId]: snoozeUntil }));
    setActiveAlarms((prev) => prev.filter((a) => a.note.id !== noteId));
  };

  const handleMarkCompleteAlarm = (noteId: string) => {
    updateNote(noteId, { due_date: null });
    setActiveAlarms((prev) => prev.filter((a) => a.note.id !== noteId));
  };

  const handleOpenAlarmNote = (note: Note) => {
    setEditingNote(note);
    handleDismissAlarm(note.id);
  };

  // Redirect unauthenticated user to /login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Global Keyboard Listener for Cmd+K / Ctrl+K Command Palette, and Undo/Redo (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape' && selectedNoteIds.length > 0) {
        setSelectedNoteIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds.length, undo, redo]);

  // Fetch workspace users
  useEffect(() => {
    if (user) {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setWorkspaceUsers(data.users);
        })
        .catch((err) => console.error('Failed to fetch workspace users:', err));
    }
  }, [user]);



  // Load saved canvas theme variant from localStorage on mount & when board changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBoardTheme = localStorage.getItem(`canvas-theme-${currentBoardId}`);
      const savedGlobalTheme = localStorage.getItem('canvas-theme-global');
      const boardObj = boards.find((b) => b.id === currentBoardId);
      const activeVariant = (savedBoardTheme || boardObj?.theme_variant || savedGlobalTheme || 'cork') as any;
      setThemeVariant(activeVariant);
    }
  }, [currentBoardId, boards]);

  const handleSelectThemeVariant = (variant: 'cork' | 'dark_leather' | 'blueprint' | 'grid_paper' | 'vintage_pastel' | 'glassmorphism') => {
    setThemeVariant(variant);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`canvas-theme-${currentBoardId}`, variant);
      localStorage.setItem('canvas-theme-global', variant);
    }
    setBoards((prev) =>
      prev.map((b) => (b.id === currentBoardId ? { ...b, theme_variant: variant } : b))
    );
    const currBoard = boards.find((b) => b.id === currentBoardId);
    if (currBoard) {
      fetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentBoardId, name: currBoard.name, theme_variant: variant }),
      }).catch((err) => console.error('Failed to update board theme:', err));
    }
  };



  // Bring note to top z-index stack with normalization to prevent z-index inflation
  const handleBringToFront = (id: string) => {
    const maxZ = Math.max(...notes.map((n) => n.z_index || 1), 1);
    if (maxZ > 500) {
      const sortedNotes = [...notes].sort((a, b) => (a.z_index || 1) - (b.z_index || 1));
      sortedNotes.forEach((n, idx) => {
        if (n.id !== id) {
          updateNote(n.id, { z_index: idx + 1 });
        }
      });
      updateNote(id, { z_index: sortedNotes.length + 1 });
    } else {
      updateNote(id, { z_index: maxZ + 1 });
    }
  };

  // Multi-Selection Handlers
  const handleSelectNote = (id: string, isShift: boolean) => {
    if (isShift) {
      setSelectedNoteIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setSelectedNoteIds((prev) => (prev.includes(id) && prev.length === 1 ? [] : [id]));
    }
  };

  const handleClearSelection = () => {
    setSelectedNoteIds([]);
  };

  const handleSetSelection = (ids: string[]) => {
    setSelectedNoteIds(ids);
  };

  // Batch Operations Handlers
  const handleBatchUpdatePositions = (updates: { id: string; newX: number; newY: number }[]) => {
    const batchUpdates = updates.map((u) => ({
      id: u.id,
      updates: { position_x: u.newX, position_y: u.newY },
    }));
    batchUpdateNotes(batchUpdates);
  };

  const handleBatchDeleteNotes = () => {
    const batchUpdates = selectedNoteIds.map((id) => ({
      id,
      updates: { is_deleted: true },
    }));
    batchUpdateNotes(batchUpdates);
    setSelectedNoteIds([]);
  };

  const requestDeleteNote = (id: string) => {
    setPendingDelete({ id });
  };

  const requestBatchDeleteNotes = () => {
    if (selectedNoteIds.length === 0) return;
    setPendingDelete({ ids: selectedNoteIds });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.id) {
      deleteNote(pendingDelete.id);
    } else if (pendingDelete.ids) {
      handleBatchDeleteNotes();
    }
    setPendingDelete(null);
  };

  const handleBatchPinToggle = (pinState: boolean) => {
    const batchUpdates = selectedNoteIds.map((id) => ({
      id,
      updates: { is_pinned: pinState },
    }));
    batchUpdateNotes(batchUpdates);
  };

  const handleBatchLockToggle = (lockState: boolean) => {
    const batchUpdates = selectedNoteIds.map((id) => ({
      id,
      updates: { is_locked: lockState },
    }));
    batchUpdateNotes(batchUpdates);
  };

  const handleBatchRecolor = (color: string) => {
    const batchUpdates = selectedNoteIds.map((id) => ({
      id,
      updates: { color },
    }));
    batchUpdateNotes(batchUpdates);
  };

  const handleBatchTag = (tag: string) => {
    const batchUpdates = selectedNoteIds
      .map((id) => {
        const note = notes.find((n) => n.id === id);
        if (note) {
          const existingTags = note.tags || [];
          if (!existingTags.includes(tag)) {
            return {
              id,
              updates: { tags: [...existingTags, tag] },
            };
          }
        }
        return null;
      })
      .filter(Boolean) as { id: string; updates: Partial<Note> }[];

    if (batchUpdates.length > 0) {
      batchUpdateNotes(batchUpdates);
    }
  };

  const handleBatchAlign = (mode: 'row' | 'column' | 'grid') => {
    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    if (selectedNotes.length < 2) return;

    const cardWidth = 300;
    const cardHeight = 240;
    const startX = Math.min(...selectedNotes.map((n) => n.position_x));
    const startY = Math.min(...selectedNotes.map((n) => n.position_y));

    if (mode === 'grid') {
      const cols = Math.ceil(Math.sqrt(selectedNotes.length));
      const batchUpdates = selectedNotes.map((n, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
          id: n.id,
          updates: {
            position_x: startX + col * cardWidth,
            position_y: startY + row * cardHeight,
          },
        };
      });
      batchUpdateNotes(batchUpdates);
    }
  };

  // Import Notes from Backup JSON File
  const handleImportNotes = () => {
    if (typeof document === 'undefined') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const raw = event.target?.result as string;
          const payload = JSON.parse(raw);

          if (!payload || !Array.isArray(payload.notes)) {
            alert('Invalid backup file. Could not find notes list.');
            return;
          }

          const importedNotes = payload.notes as Note[];
          if (importedNotes.length === 0) {
            alert('No notes found in the backup file.');
            return;
          }

          // Process notes to generate unique IDs and associate with the current board
          const processedNotes = importedNotes.map((note) => ({
            ...note,
            id: generateUUID(),
            board_id: currentBoardId,
            owner_id: user?.id || 'local-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            permission: 'owner' as const,
          }));

          await batchCreateNotes(processedNotes);
          alert(`Successfully imported ${processedNotes.length} notes into your current board!`);
        } catch (err) {
          console.error('Failed to import backup file:', err);
          alert('Failed to parse the backup JSON file. Ensure it is a valid Sticky Notes backup.');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  // Create Note with Dropped Image URL
  const handleCreateNoteWithImage = (x: number, y: number, imageUrl: string) => {
    createNote({
      board_id: currentBoardId,
      position_x: x,
      position_y: y,
      title: '🖼️ Image Note',
      content: `<img src="${imageUrl}" alt="Attached Image" style="max-width:100%; border-radius:8px; margin:8px 0;" />`,
    });
  };

  // Attach Image URL to existing Note
  const handleAttachImageToNote = (id: string, imageUrl: string) => {
    const existing = notes.find((n) => n.id === id);
    if (existing) {
      const newContent = `${existing.content || ''}<br/><img src="${imageUrl}" alt="Attached Image" style="max-width:100%; border-radius:8px; margin:8px 0;" />`;
      updateNote(id, { content: newContent });
    }
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

  const handleCreateNewNote = async (x?: number, y?: number) => {
    const newNote = await createNote({ board_id: currentBoardId, position_x: x, position_y: y });
    setEditingNote(newNote);
  };

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Accessibility Skip Link */}
      <a href="#corkboard-canvas" className="skip-to-content-link">
        Skip to board content
      </a>

      {/* Top Header Toolbar */}
      <ErrorBoundary errorMessage="Something went wrong while rendering the header toolbar. Please try reloading it.">
        <Toolbar
          user={user}
          notes={notes}
          workspaceUsers={workspaceUsers}
          presences={activePresences}
          boards={boards}
          currentBoardId={currentBoardId}
          onSelectBoard={handleSelectBoard}
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
          onOpenActivityFeed={() => setShowActivityFeed(true)}
          onAutoArrange={handleAutoArrange}
          onExportJSON={() => exportBoardToJSON(filteredNotes, boardName)}
          onExportMarkdown={() => exportBoardToMarkdown(filteredNotes, boardName)}
          onExportPNG={() => exportBoardToPNG(boardName)}
          onExportPDF={printBoardToPDF}
          isOnline={isOnline}
          syncing={syncing}
          theme={theme}
          themeVariant={themeVariant}
          onSelectThemeVariant={(variant: any) => handleSelectThemeVariant(variant)}
          onToggleTheme={toggleTheme}
          onCreateNote={handleCreateNewNote}
          onSelectNote={(note) => setEditingNote(note)}
          onOpenUserManagement={() => setShowUserManagement(true)}
          onLogout={logout}
        />
      </ErrorBoundary>

      {/* Cork Board Canvas */}
      <ErrorBoundary errorMessage="An error occurred rendering the CorkBoard infinite canvas. You can reload the canvas stage to recover your session.">
        <CorkBoard
          notes={filteredNotes}
          selectedNoteIds={selectedNoteIds}
          themeVariant={themeVariant}
          connections={connections}
          frames={frames}
          presences={activePresences}
          onCreateNote={handleCreateNewNote}
          onSelectNote={handleSelectNote}
          onClearSelection={handleClearSelection}
          onSetSelection={handleSetSelection}
          onUpdateNotePosition={(id, x, y) => {
            updateNote(id, { position_x: x, position_y: y });
            broadcastNoteMove(id, x, y);
          }}
          onBatchUpdatePositions={handleBatchUpdatePositions}
          onEditNote={setEditingNote}
          onDeleteNote={requestDeleteNote}
          onBatchDeleteNotes={requestBatchDeleteNotes}
          onPinToggle={(id, isPinned) => updateNote(id, { is_pinned: isPinned })}
          onBatchPinToggle={handleBatchPinToggle}
          onLockToggle={(id, isLocked) => updateNote(id, { is_locked: isLocked })}
          onBatchLockToggle={handleBatchLockToggle}
          onArchiveToggle={(id, isArchived) => updateNote(id, { is_archived: isArchived })}
          onShareNote={setSharingNote}
          onBringToFront={handleBringToFront}
          onBatchRecolor={handleBatchRecolor}
          onBatchTag={handleBatchTag}
          onBatchAlign={handleBatchAlign}
          onCreateNoteWithImage={handleCreateNoteWithImage}
          onAttachImage={handleAttachImageToNote}
          onOpenComments={(note) => setCommentingNote(note)}
          onStickerChange={(id, sticker) => updateNote(id, { sticker: sticker || undefined })}
          onCreateConnection={handleCreateConnection}
          onUpdateConnection={handleUpdateConnection}
          onDeleteConnection={handleDeleteConnection}
          onCreateFrame={handleCreateFrame}
          onUpdateFrame={handleUpdateFrame}
          onDeleteFrame={handleDeleteFrame}
        />
      </ErrorBoundary>

      {/* Rich Text Note Editor Modal */}
      <NoteEditor
        note={editingNote}
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
        onSave={(id, updates) => {
          updateNote(id, updates);
          setEditingNote((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
        }}
        onDelete={requestDeleteNote}
        onShare={setSharingNote}
      />

      {/* Share Dialog Modal */}
      <ShareDialog
        note={sharingNote}
        isOpen={Boolean(sharingNote)}
        onClose={() => setSharingNote(null)}
      />

      {/* Note Comments Drawer Modal */}
      <NoteCommentsDrawer
        note={commentingNote}
        isOpen={Boolean(commentingNote)}
        onClose={() => setCommentingNote(null)}
        workspaceUsers={workspaceUsers}
      />

      {/* Workspace Activity Feed Modal */}
      <ActivityFeedModal
        isOpen={showActivityFeed}
        onClose={() => setShowActivityFeed(false)}
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

      {/* Global Command Palette Modal (Cmd+K / Ctrl+K) */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        notes={filteredNotes}
        onSelectNote={(note) => setEditingNote(note)}
        onCreateNote={() => createNote({ board_id: currentBoardId })}
        onAutoArrange={handleAutoArrange}
        onOpenTrash={() => setShowTrashBin(true)}
        onOpenUserManagement={() => setShowUserManagement(true)}
        onExport={() => exportBoardToJSON(filteredNotes, boardName)}
        onImport={handleImportNotes}
        onToggleTheme={toggleTheme}
        isAdmin={user.role === 'admin'}
      />

      {/* Due Date Notification Alarm Banner */}
      <NotificationAlarmBanner
        alarms={activeAlarms}
        onSnooze={handleSnoozeAlarm}
        onOpenNote={handleOpenAlarmNote}
        onMarkComplete={handleMarkCompleteAlarm}
        onDismiss={handleDismissAlarm}
      />

      {/* Custom PWA Install Experience Banner */}
      <PWAInstallBanner />

      {/* Delete Confirmation Dialog */}
      {pendingDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗑️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--ui-text)' }}>
              {pendingDelete.ids ? 'Delete Selected Notes?' : 'Delete Sticky Note?'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ui-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              {pendingDelete.ids 
                ? `Are you sure you want to move these ${pendingDelete.ids.length} notes to the Trash Bin?`
                : 'Are you sure you want to move this note to the Trash Bin? You can restore it later.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setPendingDelete(null)}
                style={{ padding: '8px 20px', minWidth: '100px' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ 
                  padding: '8px 20px', 
                  minWidth: '100px',
                  background: 'var(--ui-danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

