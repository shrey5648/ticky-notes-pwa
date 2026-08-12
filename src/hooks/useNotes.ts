import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, SyncItem } from '@/lib/types';
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
  } catch (e) {}
  return new Set();
}

function saveLockedIdsToStorage(lockedIds: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('locked-note-ids', JSON.stringify(Array.from(lockedIds)));
  } catch (e) {}
}

function mergeLockStates(notesList: Note[]): Note[] {
  const lockedIds = getLockedIdsFromStorage();
  return notesList.map((n) => {
    const isLocked = Boolean(n.is_locked || lockedIds.has(n.id));
    if (isLocked) lockedIds.add(n.id);
    return { ...n, is_locked: isLocked };
  });
}

function getCachedNotesFromLocalStorage(): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cached-notes-v3');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveNotesToLocalStorage(notesList: Note[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('cached-notes-v3', JSON.stringify(notesList));
  } catch (e) {}
}

export function useNotes(userId?: string) {
  const [notes, setNotes] = useState<Note[]>(() => {
    const initial = getCachedNotesFromLocalStorage();
    return mergeLockStates(initial);
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

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
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

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
    const localStoreNotes = getCachedNotesFromLocalStorage();

    const noteMap = new Map<string, Note>();
    localStoreNotes.forEach((n) => noteMap.set(n.id, n));
    cachedIndexedDB.forEach((n) => {
      const existing = noteMap.get(n.id);
      if (!existing || new Date(n.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
        noteMap.set(n.id, n);
      }
    });

    const localMerged = mergeLockStates(Array.from(noteMap.values()));
    if (localMerged.length > 0) {
      setNotes(localMerged);
      saveNotesToLocalStorage(localMerged);
    }

    // Step 2: Fetch remote API if online
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/notes');
        if (res.ok) {
          const data = await res.json();
          if (data.notes && Array.isArray(data.notes)) {
            data.notes.forEach((remoteNote: Note) => {
              const localNote = noteMap.get(remoteNote.id);
              if (!localNote || new Date(remoteNote.updated_at).getTime() >= new Date(localNote.updated_at).getTime()) {
                noteMap.set(remoteNote.id, remoteNote);
              }
            });
            const finalMerged = mergeLockStates(Array.from(noteMap.values()));
            setNotes(finalMerged);
            saveNotesToLocalStorage(finalMerged);
            await saveLocalNotes(finalMerged);
          }
        }
      } catch (err) {
        console.error('Remote fetch error, falling back to local cache:', err);
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
    const tempId = `note-${Date.now()}`;
    const newNote: Note = {
      id: tempId,
      owner_id: userId || 'local-user',
      title: partialNote?.title || '📝 New Sticky Note',
      content: partialNote?.content || '<p>Write your thoughts here...</p>',
      color: partialNote?.color || '#FFEB3B',
      position_x: partialNote?.position_x ?? Math.floor(Math.random() * 200) + 80,
      position_y: partialNote?.position_y ?? Math.floor(Math.random() * 200) + 80,
      is_pinned: false,
      is_archived: false,
      z_index: Date.now() % 10000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permission: 'owner',
    };

    // Optimistic UI & LocalStorage update
    setNotes((prev) => {
      const updated = [newNote, ...prev];
      saveNotesToLocalStorage(updated);
      return updated;
    });
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
            setNotes((prev) => {
              const updated = prev.map((n) => (n.id === tempId ? data.note : n));
              saveNotesToLocalStorage(updated);
              return updated;
            });
            await deleteLocalNote(tempId);
            await saveSingleLocalNote(data.note);
            return data.note;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('Create note API server error:', res.status, errData);
        }
      } catch (err) {
        console.error('Create note network error, queueing offline:', err);
      }
    }

    // Queue for sync if offline or request failed
    await addPendingSync('create', newNote);
    return newNote;
  };

  // Update Note (Optimistic)
  const updateNote = async (id: string, updates: Partial<Note>) => {
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
      saveNotesToLocalStorage(updatedList);
      return updatedList;
    });

    if (updatedNoteObject) {
      await saveSingleLocalNote(updatedNoteObject);
    }

    if (navigator.onLine) {
      try {
        await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.error('Update note network error, queueing offline:', err);
        await addPendingSync('update', { id, ...updates });
      }
    } else {
      await addPendingSync('update', { id, ...updates });
    }
  };

  // Delete Note (Optimistic)
  const deleteNote = async (id: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveNotesToLocalStorage(updated);
      return updated;
    });
    await deleteLocalNote(id);

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

  return {
    notes,
    loading,
    isOnline,
    syncing,
    createNote,
    updateNote,
    deleteNote,
    refetchNotes: fetchNotes,
  };
}
