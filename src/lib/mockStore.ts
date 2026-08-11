import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, Note, NoteShare, Board, NoteConnection, NoteFrame } from './types';

const INITIAL_USERS: User[] = [
  {
    id: 'user-demo-1',
    username: 'Shreyas',
    display_name: 'Shreyas Admin',
    role: 'admin',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_HASHES: Record<string, string> = {
  'user-demo-1': '$2b$10$B/M2SKxNTWL5afegjl/nnuDLkejEsAJvzzll1gJVRU7pluYNHT7Oq', // PIN: 1234
};

const INITIAL_BOARDS: Board[] = [
  {
    id: 'board-default',
    name: 'Main Board',
    owner_id: 'user-demo-1',
    color: '#e65100',
    theme_variant: 'cork',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_NOTES: Note[] = [];
const INITIAL_CONNECTIONS: NoteConnection[] = [];
const INITIAL_FRAMES: NoteFrame[] = [];

function ensureDirSync(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (err) {
    console.warn(`[mockStore] Cannot create directory ${dirPath}:`, err);
    return false;
  }
}

function getWritableStorePath(): { dataDir: string; dataFile: string } {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isVercel) {
    const tmpDir = path.join(os.tmpdir(), 'ticky-notes-data');
    ensureDirSync(tmpDir);
    return { dataDir: tmpDir, dataFile: path.join(tmpDir, 'store.json') };
  }

  const primaryDir = path.join(process.cwd(), 'data');
  if (ensureDirSync(primaryDir)) {
    return { dataDir: primaryDir, dataFile: path.join(primaryDir, 'store.json') };
  }

  const fallbackDir = path.join(os.tmpdir(), 'ticky-notes-data');
  ensureDirSync(fallbackDir);
  return { dataDir: fallbackDir, dataFile: path.join(fallbackDir, 'store.json') };
}

function loadStore() {
  const { dataDir, dataFile } = getWritableStorePath();

  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf-8');
      const data = JSON.parse(raw);
      return {
        users: Array.isArray(data.users) && data.users.length > 0 ? data.users : INITIAL_USERS,
        userHashes: data.userHashes && Object.keys(data.userHashes).length > 0 ? data.userHashes : INITIAL_HASHES,
        boards: Array.isArray(data.boards) && data.boards.length > 0 ? data.boards : INITIAL_BOARDS,
        notes: Array.isArray(data.notes) ? data.notes : INITIAL_NOTES,
        shares: Array.isArray(data.shares) ? data.shares : [],
        connections: Array.isArray(data.connections) ? data.connections : INITIAL_CONNECTIONS,
        frames: Array.isArray(data.frames) ? data.frames : INITIAL_FRAMES,
      };
    }
  } catch (err) {
    console.error('[mockStore] Error reading store file, falling back to initial store:', err);
  }

  const initial = {
    users: INITIAL_USERS,
    userHashes: INITIAL_HASHES,
    boards: INITIAL_BOARDS,
    notes: INITIAL_NOTES,
    shares: [],
    connections: INITIAL_CONNECTIONS,
    frames: INITIAL_FRAMES,
  };

  try {
    ensureDirSync(dataDir);
    fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (err) {
    console.error('[mockStore] Error creating initial store file:', err);
  }

  return initial;
}

const loaded = loadStore();

export const mockUsers: User[] = loaded.users;
export const mockUserHashes: Record<string, string> = loaded.userHashes;
export const mockBoards: Board[] = loaded.boards;
export const mockNotes: Note[] = loaded.notes;
export const mockShares: NoteShare[] = loaded.shares;
export const mockConnections: NoteConnection[] = loaded.connections;
export const mockFrames: NoteFrame[] = loaded.frames;

export function saveStore() {
  try {
    const { dataDir, dataFile } = getWritableStorePath();
    if (ensureDirSync(dataDir)) {
      const data = {
        users: mockUsers,
        userHashes: mockUserHashes,
        boards: mockBoards,
        notes: mockNotes,
        shares: mockShares,
        connections: mockConnections,
        frames: mockFrames,
      };
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[mockStore] Error writing store to disk:', err);
  }
}

