import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, SyncItem } from '@/lib/types';
import { generateUUID } from '@/lib/uuid';
import { useToast } from '@/context/ToastContext';
import {
  getLocalNotes,
  saveLocalNotes,
  saveSingleLocalNote,
  deleteLocalNote,
  addPendingSync,
  processOfflineQueue,
} from '@/lib/db';

function getLockedIdsFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('locked-note-ids');
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) { }
  return new Set();
}

function saveLockedIdsToStorage(lockedIds: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('locked-note-ids', JSON.stringify(Array.from(lockedIds)));
  } catch (e) { }
}

function mergeLockStates(notesList: Note[]): Note[] {
  const lockedIds = getLockedIdsFromStorage();
  return notesList.map((n) => {
    const isLocked = Boolean(n.is_locked || lockedIds.has(n.id));
    if (isLocked) lockedIds.add(n.id);
    return { ...n, is_locked: isLocked };
  });
}

export function useNotes(userId?: string) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // History stacks for undo/redo
  const undoStackRef = useRef<Note[][]>([]);
  const redoStackRef = useRef<Note[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushUndoSnapshot = useCallback((currentState: Note[]) => {
    const snapshot = JSON.parse(JSON.stringify(currentState));
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  // Sync handler for processing offline queue items
  const syncQueueItemHandler = useCallback(async (item: SyncItem): Promise<boolean> => {
    try {
      if (item.action === 'create') {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        return res.ok;
      } else if (item.action === 'update') {
        if (!item.data.id) return true;
        const res = await fetch(`/api/notes/${item.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        return res.ok;
      } else if (item.action === 'delete') {
        if (!item.data.id) return true;
        const res = await fetch(`/api/notes/${item.data.id}`, {
          method: 'DELETE',
        });
        return res.ok;
      }
      return true;
    } catch (err) {
      console.error('Failed to sync queue item:', err);
      return false;
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    await processOfflineQueue(syncQueueItemHandler);
    setSyncing(false);
  }, [syncQueueItemHandler]);

  // Network online/offline event listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      showToast('You are back online! Syncing changes...', 'success');
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Changes will be saved locally.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  // Load local notes & fetch API notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    // Step 1: Load from local IndexedDB instantly
    const cachedIndexedDB = await getLocalNotes();
    const localMerged = mergeLockStates(cachedIndexedDB);
    setNotes(localMerged);

    // Step 2: Fetch remote API if online
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/notes');
        if (res.ok) {
          const data = await res.json();
          if (data.notes && Array.isArray(data.notes)) {
            const dbMap = new Map(cachedIndexedDB.map((n) => [n.id, n]));
            
            data.notes.forEach((remoteNote: Note) => {
              const localNote = dbMap.get(remoteNote.id);
              if (!localNote || new Date(remoteNote.updated_at).getTime() >= new Date(localNote.updated_at).getTime()) {
                dbMap.set(remoteNote.id, remoteNote);
              }
            });

            const finalMerged = mergeLockStates(Array.from(dbMap.values()));
            setNotes(finalMerged);
            await saveLocalNotes(finalMerged);
          }
        }
      } catch (err) {
        console.error('Fetch notes remote API failed, using local only:', err);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchNotes();
    }
  }, [userId, fetchNotes]);

  // Create Note
  const createNote = async (partialNote?: Partial<Note>): Promise<Note> => {
    pushUndoSnapshot(notes);
    const tempId = generateUUID();
    const targetBoardId = partialNote?.board_id || 'board-default';

    // Smart placement to avoid overlaps
    let posX = partialNote?.position_x;
    let posY = partialNote?.position_y;

    if (posX === undefined || posY === undefined) {
      const boardNotes = notes.filter(
        (n) =>
          !n.is_deleted &&
          !n.is_archived &&
          (n.board_id === targetBoardId || (!n.board_id && targetBoardId === 'board-default'))
      );
      if (boardNotes.length === 0) {
        posX = 120;
        posY = 120;
      } else {
        // Sort by creation time descending to find the last created note
        const sorted = [...boardNotes].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const refNote = sorted[0];
        let nextX = refNote.position_x + 35;
        let nextY = refNote.position_y + 35;

        // Wrap around if it goes too far right/down
        if (nextX > 800 || nextY > 600) {
          nextX = 120;
          nextY = 120;
        }

        // Collision avoidance: keep shifting if there is another card close by
        let collision = true;
        let attempts = 0;
        while (collision && attempts < 10) {
          const overlap = boardNotes.some(
            (n) => Math.abs(n.position_x - nextX) < 15 && Math.abs(n.position_y - nextY) < 15
          );
          if (overlap) {
            nextX += 35;
            nextY += 35;
            if (nextX > 800 || nextY > 600) {
              nextX = 120 + attempts * 10;
              nextY = 120;
            }
            attempts++;
          } else {
            collision = false;
          }
        }
        posX = nextX;
        posY = nextY;
      }
    }

    const newNote: Note = {
      id: tempId,
      owner_id: userId || 'local-user',
      board_id: targetBoardId,
      title: partialNote?.title || 'New Sticky Note',
      content: partialNote?.content || '<p>Write your thoughts here...</p>',
      color: partialNote?.color || '#FFEB3B',
      position_x: posX,
      position_y: posY,
      is_pinned: false,
      is_archived: false,
      z_index: Date.now() % 10000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permission: 'owner',
    };

    // Optimistic UI update
    setNotes((prev) => [newNote, ...prev]);
    await saveSingleLocalNote(newNote);

    if (navigator.onLine) {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newNote),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.note) {
            setNotes((prev) => prev.map((n) => (n.id === tempId ? data.note : n)));
            await deleteLocalNote(tempId);
            await saveSingleLocalNote(data.note);
            return data.note;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('Create note API server error:', res.status, errData);
          showToast('Failed to sync new note with server.', 'error');
        }
      } catch (err) {
        console.error('Create note network error, queueing offline:', err);
      }
    }

    // Queue for sync if offline or request failed
    await addPendingSync('create', newNote);
    showToast('Created new sticky note!', 'success');
    return newNote;
  };

  // Update Note (Optimistic)
  const updateNote = async (id: string, updates: Partial<Note>, skipHistory = false) => {
    if (!skipHistory) {
      pushUndoSnapshot(notes);
    }
    let updatedNoteObject: Note | null = null;

    if (updates.is_locked !== undefined) {
      const lockedIds = getLockedIdsFromStorage();
      if (updates.is_locked) {
        lockedIds.add(id);
      } else {
        lockedIds.delete(id);
      }
      saveLockedIdsToStorage(lockedIds);
    }

    setNotes((prev) => {
      const updatedList = prev.map((n) => {
        if (n.id === id) {
          updatedNoteObject = { ...n, ...updates, updated_at: new Date().toISOString() };
          return updatedNoteObject;
        }
        return n;
      });
      return updatedList;
    });

    if (updatedNoteObject) {
      await saveSingleLocalNote(updatedNoteObject);
    }

    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          console.error('Update note API server error:', res.status);
          showToast('Failed to save note changes to server.', 'error');
        }
      } catch (err) {
        console.error('Update note network error, queueing offline:', err);
        await addPendingSync('update', { id, ...updates });
      }
    } else {
      await addPendingSync('update', { id, ...updates });
    }

    const keys = Object.keys(updates);
    const isPositionOnly = keys.length === 0 || (keys.length <= 2 && keys.every(k => k === 'position_x' || k === 'position_y'));
    if (!isPositionOnly) {
      if (updates.is_archived !== undefined) {
        showToast(updates.is_archived ? 'Note archived' : 'Note unarchived', 'success');
      } else if (updates.is_pinned !== undefined) {
        showToast(updates.is_pinned ? 'Note pinned' : 'Note unpinned', 'success');
      } else if (updates.is_locked !== undefined) {
        showToast(updates.is_locked ? 'Note locked' : 'Note unlocked', 'success');
      } else {
        showToast('Note saved successfully!', 'success');
      }
    }
  };

  // Delete Note (Optimistic)
  const deleteNote = async (id: string) => {
    pushUndoSnapshot(notes);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteLocalNote(id);
    showToast('Note moved to Trash Bin', 'info');

    if (navigator.onLine) {
      try {
        await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Delete note network error, queueing offline:', err);
        await addPendingSync('delete', { id });
      }
    } else {
      await addPendingSync('delete', { id });
    }
  };

  // Batch Update Notes (Optimistic, counts as single history step)
  const batchUpdateNotes = async (updates: { id: string; updates: Partial<Note> }[]) => {
    pushUndoSnapshot(notes);
    let updatedObjects: Note[] = [];
    setNotes((prev) => {
      const updatedList = prev.map((n) => {
        const match = updates.find((u) => u.id === n.id);
        if (match) {
          const updatedObj = { ...n, ...match.updates, updated_at: new Date().toISOString() };
          updatedObjects.push(updatedObj);
          return updatedObj;
        }
        return n;
      });
      return updatedList;
    });

    if (updatedObjects.length > 0) {
      await saveLocalNotes(updatedObjects);
    }

    if (navigator.onLine) {
      fetch('/api/notes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      }).catch((err) => console.error('Batch update API error:', err));
    } else {
      updates.forEach((item) => {
        addPendingSync('update', { id: item.id, ...item.updates });
      });
    }

    const isPositionOnly = updates.every(u => {
      const keys = Object.keys(u.updates);
      return keys.length === 0 || (keys.length <= 2 && keys.every(k => k === 'position_x' || k === 'position_y'));
    });
    if (!isPositionOnly) {
      showToast('Notes updated successfully!', 'success');
    }
  };

  // Batch Create Notes (Optimistic, counts as single history step)
  const batchCreateNotes = async (newNotes: Note[]) => {
    pushUndoSnapshot(notes);
    setNotes((prev) => [...newNotes, ...prev]);
    await saveLocalNotes(newNotes); // Bulk put in Dexie

    if (navigator.onLine) {
      fetch('/api/notes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creates: newNotes }),
      }).catch((err) => console.error('Batch create API error:', err));
    } else {
      newNotes.forEach((n) => {
        addPendingSync('create', n);
      });
    }

    showToast(`Successfully imported ${newNotes.length} notes!`, 'success');
  };

  // Undo Function
  const undo = useCallback(async () => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current.pop();
    if (!previous) return;

    // Push current state to redo stack
    redoStackRef.current.push(JSON.parse(JSON.stringify(notes)));
    setCanRedo(true);
    setCanUndo(undoStackRef.current.length > 0);

    // Apply previous state
    setNotes(previous);
    await saveLocalNotes(previous);

    // Sync state differences in batch
    const currentMap = new Map(notes.map((n) => [n.id, n]));
    const previousMap = new Map(previous.map((n) => [n.id, n]));

    const creates: Note[] = [];
    const updates: { id: string; updates: Partial<Note> }[] = [];
    const deletes: string[] = [];

    for (const prevNote of previous) {
      const currNote = currentMap.get(prevNote.id);
      if (!currNote) {
        creates.push(prevNote);
      } else if (JSON.stringify(prevNote) !== JSON.stringify(currNote)) {
        updates.push({ id: prevNote.id, updates: prevNote });
      }
    }

    for (const currNote of notes) {
      if (!previousMap.has(currNote.id)) {
        deletes.push(currNote.id);
      }
    }

    if (creates.length > 0 || updates.length > 0 || deletes.length > 0) {
      if (navigator.onLine) {
        fetch('/api/notes/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creates, updates, deletes }),
        }).catch((err) => console.error('Undo batch sync failed:', err));
      } else {
        creates.forEach((n) => addPendingSync('create', n));
        updates.forEach((item) => addPendingSync('update', { id: item.id, ...item.updates }));
        deletes.forEach((id) => addPendingSync('delete', { id }));
      }
    }

    showToast('Action undone', 'info');
  }, [notes]);

  // Redo Function
  const redo = useCallback(async () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    if (!next) return;

    // Push current state to undo stack
    undoStackRef.current.push(JSON.parse(JSON.stringify(notes)));
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    // Apply next state
    setNotes(next);
    await saveLocalNotes(next);

    // Sync state differences in batch
    const currentMap = new Map(notes.map((n) => [n.id, n]));
    const nextMap = new Map(next.map((n) => [n.id, n]));

    const creates: Note[] = [];
    const updates: { id: string; updates: Partial<Note> }[] = [];
    const deletes: string[] = [];

    for (const nextNote of next) {
      const currNote = currentMap.get(nextNote.id);
      if (!currNote) {
        creates.push(nextNote);
      } else if (JSON.stringify(nextNote) !== JSON.stringify(currNote)) {
        updates.push({ id: nextNote.id, updates: nextNote });
      }
    }

    for (const currNote of notes) {
      if (!nextMap.has(currNote.id)) {
        deletes.push(currNote.id);
      }
    }

    if (creates.length > 0 || updates.length > 0 || deletes.length > 0) {
      if (navigator.onLine) {
        fetch('/api/notes/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creates, updates, deletes }),
        }).catch((err) => console.error('Redo batch sync failed:', err));
      } else {
        creates.forEach((n) => addPendingSync('create', n));
        updates.forEach((item) => addPendingSync('update', { id: item.id, ...item.updates }));
        deletes.forEach((id) => addPendingSync('delete', { id }));
      }
    }

    showToast('Action redone', 'info');
  }, [notes]);

  return {
    notes,
    loading,
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
    refetchNotes: fetchNotes,
  };
}
