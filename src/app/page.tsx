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
import { CommandPaletteModal } from '@/components/Modals/CommandPaletteModal';
import { NotificationAlarmBanner, AlarmItem } from '@/components/Modals/NotificationAlarmBanner';
import { triggerNativeNotification, requestNotificationPermission } from '@/lib/notifications';
import { Note, User, Board, NoteConnection, NoteFrame } from '@/lib/types';
import {
  getLocalConnections,
  saveSingleLocalConnection,
  deleteLocalConnection,
  saveLocalConnections,
  getLocalFrames,
  saveSingleLocalFrame,
  deleteLocalFrame,
  saveLocalFrames,
} from '@/lib/db';
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

  // Phase 3 Canvas State
  const [connections, setConnections] = useState<NoteConnection[]>([]);
  const [frames, setFrames] = useState<NoteFrame[]>([]);
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

  // Modals state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Due Date Alarm State
  const [activeAlarms, setActiveAlarms] = useState<AlarmItem[]>([]);
  const [dismissedAlarmIds, setDismissedAlarmIds] = useState<Record<string, number>>({});

  // Due Date Monitor Effect (runs every 30s)
  useEffect(() => {
    if (!notes || notes.length === 0) return;

    const checkDueDates = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const newAlarms: AlarmItem[] = [];

      notes.forEach((note) => {
        if (!note.due_date || note.is_deleted || note.is_archived) return;

        // Check if snooze timer is active
        const snoozedUntil = dismissedAlarmIds[note.id];
        if (snoozedUntil && Date.now() < snoozedUntil) return;

        const dueTime = new Date(note.due_date);
        const isOverdue = dueTime < new Date(todayStr);
        const isDueToday = note.due_date === todayStr || dueTime <= now;

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

  // Global Keyboard Listener for Cmd+K / Ctrl+K Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if (e.key === 'Escape' && selectedNoteIds.length > 0) {
        setSelectedNoteIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds.length]);

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

  // Phase 3 Connections & Frames Fetch & Persistence Effect
  useEffect(() => {
    if (user) {
      getLocalConnections().then((localConns) => {
        if (localConns.length > 0) setConnections(localConns);
      });
      getLocalFrames().then((localFrs) => {
        if (localFrs.length > 0) setFrames(localFrs);
      });

      fetch(`/api/connections?board_id=${currentBoardId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.connections) {
            setConnections(data.connections);
            saveLocalConnections(data.connections);
          }
        })
        .catch((err) => console.error('Failed to fetch connections:', err));

      fetch(`/api/frames?board_id=${currentBoardId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.frames) {
            setFrames(data.frames);
            saveLocalFrames(data.frames);
          }
        })
        .catch((err) => console.error('Failed to fetch frames:', err));
    }
  }, [user, currentBoardId]);

  // Phase 3 Handlers for Connections & Frames
  const handleCreateConnection = async (from_note_id: string, to_note_id: string) => {
    const newConn: NoteConnection = {
      id: `conn-${Date.now()}`,
      board_id: currentBoardId,
      from_note_id,
      to_note_id,
      color: '#6366f1',
      style: 'solid',
      arrow_type: 'end',
      created_at: new Date().toISOString(),
    };
    setConnections((prev) => [...prev, newConn]);
    await saveSingleLocalConnection(newConn);
    fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConn),
    }).catch((err) => console.error('Failed to save connection:', err));
  };

  const handleUpdateConnection = async (id: string, updates: Partial<NoteConnection>) => {
    setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      await saveSingleLocalConnection({ ...conn, ...updates });
    }
    fetch('/api/connections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch((err) => console.error('Failed to update connection:', err));
  };

  const handleDeleteConnection = async (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    await deleteLocalConnection(id);
    fetch(`/api/connections?id=${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete connection:', err)
    );
  };

  const handleCreateFrame = async () => {
    const newFrame: NoteFrame = {
      id: `frame-${Date.now()}`,
      board_id: currentBoardId,
      title: '📌 Swimlane Section',
      position_x: 120,
      position_y: 120,
      width: 450,
      height: 350,
      color: '#3b82f6',
      created_at: new Date().toISOString(),
    };
    setFrames((prev) => [...prev, newFrame]);
    await saveSingleLocalFrame(newFrame);
    fetch('/api/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFrame),
    }).catch((err) => console.error('Failed to create frame:', err));
  };

  const handleUpdateFrame = async (id: string, updates: Partial<NoteFrame>) => {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    const frame = frames.find((f) => f.id === id);
    if (frame) {
      await saveSingleLocalFrame({ ...frame, ...updates });
    }
    fetch('/api/frames', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch((err) => console.error('Failed to update frame:', err));
  };

  const handleDeleteFrame = async (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
    await deleteLocalFrame(id);
    fetch(`/api/frames?id=${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete frame:', err)
    );
  };

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
    updates.forEach((u) => {
      updateNote(u.id, { position_x: u.newX, position_y: u.newY });
    });
  };

  const handleBatchDeleteNotes = () => {
    selectedNoteIds.forEach((id) => {
      updateNote(id, { is_deleted: true });
    });
    setSelectedNoteIds([]);
  };

  const handleBatchPinToggle = (pinState: boolean) => {
    selectedNoteIds.forEach((id) => {
      updateNote(id, { is_pinned: pinState });
    });
  };

  const handleBatchLockToggle = (lockState: boolean) => {
    selectedNoteIds.forEach((id) => {
      updateNote(id, { is_locked: lockState });
    });
  };

  const handleBatchRecolor = (color: string) => {
    selectedNoteIds.forEach((id) => {
      updateNote(id, { color });
    });
  };

  const handleBatchTag = (tag: string) => {
    selectedNoteIds.forEach((id) => {
      const note = notes.find((n) => n.id === id);
      if (note) {
        const existingTags = note.tags || [];
        if (!existingTags.includes(tag)) {
          updateNote(id, { tags: [...existingTags, tag] });
        }
      }
    });
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
      selectedNotes.forEach((n, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        updateNote(n.id, {
          position_x: startX + col * cardWidth,
          position_y: startY + row * cardHeight,
        });
      });
    }
  };

  // Create Note with Dropped Image
  const handleCreateNoteWithImage = (x: number, y: number, base64Image: string) => {
    createNote({
      board_id: currentBoardId,
      position_x: x,
      position_y: y,
      title: '🖼️ Image Note',
      content: `<img src="${base64Image}" alt="Attached Image" style="max-width:100%; border-radius:8px; margin:8px 0;" />`,
    });
  };

  // Attach Image to existing Note
  const handleAttachImageToNote = (id: string, base64Image: string) => {
    const existing = notes.find((n) => n.id === id);
    if (existing) {
      const newContent = `${existing.content || ''}<br/><img src="${base64Image}" alt="Attached Image" style="max-width:100%; border-radius:8px; margin:8px 0;" />`;
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

  const handleCreateNewNote = async () => {
    const newNote = await createNote({ board_id: currentBoardId });
    setEditingNote(newNote);
  };

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
        themeVariant={themeVariant}
        onSelectThemeVariant={(variant: any) => setThemeVariant(variant)}
        onToggleTheme={toggleTheme}
        onCreateNote={handleCreateNewNote}
        onSelectNote={(note) => setEditingNote(note)}
        onOpenUserManagement={() => setShowUserManagement(true)}
        onLogout={logout}
      />

      {/* Cork Board Canvas */}
      <CorkBoard
        notes={filteredNotes}
        selectedNoteIds={selectedNoteIds}
        themeVariant={themeVariant}
        connections={connections}
        frames={frames}
        onSelectNote={handleSelectNote}
        onClearSelection={handleClearSelection}
        onSetSelection={handleSetSelection}
        onUpdateNotePosition={(id, x, y) => updateNote(id, { position_x: x, position_y: y })}
        onBatchUpdatePositions={handleBatchUpdatePositions}
        onEditNote={setEditingNote}
        onDeleteNote={deleteNote}
        onBatchDeleteNotes={handleBatchDeleteNotes}
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
        onCreateConnection={handleCreateConnection}
        onUpdateConnection={handleUpdateConnection}
        onDeleteConnection={handleDeleteConnection}
        onCreateFrame={handleCreateFrame}
        onUpdateFrame={handleUpdateFrame}
        onDeleteFrame={handleDeleteFrame}
      />

      {/* Rich Text Note Editor Modal */}
      <NoteEditor
        note={editingNote}
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
        onSave={(id, updates) => {
          updateNote(id, updates);
          setEditingNote((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
        }}
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
        onImport={() => {}}
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
    </main>
  );
}
