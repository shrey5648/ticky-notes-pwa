import Dexie, { Table } from 'dexie';
import { Note, SyncItem } from './types';

export class StickyNotesDatabase extends Dexie {
  localNotes!: Table<Note, string>;
  syncQueue!: Table<SyncItem, number>;

  constructor() {
    super('StickyNotesDB');
    this.version(1).stores({
      localNotes: 'id, owner_id, is_archived, is_pinned, updated_at',
      syncQueue: '++id, action, timestamp'
    });
  }
}

export const db = new StickyNotesDatabase();

// Helper functions for offline persistence
export async function getLocalNotes(): Promise<Note[]> {
  try {
    return await db.localNotes.toArray();
  } catch (err) {
    console.error('Error fetching local notes from IndexedDB:', err);
    return [];
  }
}

export async function saveLocalNotes(notes: Note[]): Promise<void> {
  try {
    await db.localNotes.bulkPut(notes);
  } catch (err) {
    console.error('Error bulk saving local notes:', err);
  }
}

export async function saveSingleLocalNote(note: Note): Promise<void> {
  try {
    await db.localNotes.put(note);
  } catch (err) {
    console.error('Error saving local note:', err);
  }
}

export async function deleteLocalNote(id: string): Promise<void> {
  try {
    await db.localNotes.delete(id);
  } catch (err) {
    console.error('Error deleting local note:', err);
  }
}

export async function addPendingSync(action: 'create' | 'update' | 'delete', data: Partial<Note>): Promise<void> {
  try {
    await db.syncQueue.add({
      action,
      entity: 'note',
      data,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error adding pending sync item:', err);
  }
}

export async function processOfflineQueue(
  syncHandler: (item: SyncItem) => Promise<boolean>
): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  
  try {
    const queue = await db.syncQueue.orderBy('timestamp').toArray();
    for (const item of queue) {
      const success = await syncHandler(item);
      if (success && item.id) {
        await db.syncQueue.delete(item.id);
      }
    }
  } catch (err) {
    console.error('Error processing offline sync queue:', err);
  }
}
