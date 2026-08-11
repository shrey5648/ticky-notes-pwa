import Dexie, { Table } from 'dexie';
import { Note, SyncItem, NoteConnection, NoteFrame } from './types';

export class StickyNotesDatabase extends Dexie {
  localNotes!: Table<Note, string>;
  localConnections!: Table<NoteConnection, string>;
  localFrames!: Table<NoteFrame, string>;
  syncQueue!: Table<SyncItem, number>;

  constructor() {
    super('StickyNotesDB');
    this.version(2).stores({
      localNotes: 'id, owner_id, is_archived, is_pinned, updated_at',
      localConnections: 'id, board_id, from_note_id, to_note_id',
      localFrames: 'id, board_id',
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

// Connections Offline Persistence Helpers
export async function getLocalConnections(): Promise<NoteConnection[]> {
  try {
    return await db.localConnections.toArray();
  } catch (err) {
    console.error('Error fetching local connections:', err);
    return [];
  }
}

export async function saveLocalConnections(connections: NoteConnection[]): Promise<void> {
  try {
    await db.localConnections.bulkPut(connections);
  } catch (err) {
    console.error('Error bulk saving connections:', err);
  }
}

export async function saveSingleLocalConnection(conn: NoteConnection): Promise<void> {
  try {
    await db.localConnections.put(conn);
  } catch (err) {
    console.error('Error saving connection:', err);
  }
}

export async function deleteLocalConnection(id: string): Promise<void> {
  try {
    await db.localConnections.delete(id);
  } catch (err) {
    console.error('Error deleting connection:', err);
  }
}

// Frames Offline Persistence Helpers
export async function getLocalFrames(): Promise<NoteFrame[]> {
  try {
    return await db.localFrames.toArray();
  } catch (err) {
    console.error('Error fetching local frames:', err);
    return [];
  }
}

export async function saveLocalFrames(frames: NoteFrame[]): Promise<void> {
  try {
    await db.localFrames.bulkPut(frames);
  } catch (err) {
    console.error('Error bulk saving frames:', err);
  }
}

export async function saveSingleLocalFrame(frame: NoteFrame): Promise<void> {
  try {
    await db.localFrames.put(frame);
  } catch (err) {
    console.error('Error saving frame:', err);
  }
}

export async function deleteLocalFrame(id: string): Promise<void> {
  try {
    await db.localFrames.delete(id);
  } catch (err) {
    console.error('Error deleting frame:', err);
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
