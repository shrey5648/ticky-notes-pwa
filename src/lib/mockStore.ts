import fs from 'fs';
import path from 'path';
import { User, Note, NoteShare, Board } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

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
    created_at: new Date().toISOString(),
  },
];

const INITIAL_NOTES: Note[] = [];

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return {
        users: Array.isArray(data.users) && data.users.length > 0 ? data.users : INITIAL_USERS,
        userHashes: data.userHashes && Object.keys(data.userHashes).length > 0 ? data.userHashes : INITIAL_HASHES,
        boards: Array.isArray(data.boards) && data.boards.length > 0 ? data.boards : INITIAL_BOARDS,
        notes: Array.isArray(data.notes) ? data.notes : INITIAL_NOTES,
        shares: Array.isArray(data.shares) ? data.shares : [],
      };
    }
  } catch (err) {
    console.error('Error reading store file, falling back to initial store:', err);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const initial = {
    users: INITIAL_USERS,
    userHashes: INITIAL_HASHES,
    boards: INITIAL_BOARDS,
    notes: INITIAL_NOTES,
    shares: [],
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error creating initial store file:', err);
  }

  return initial;
}

const loaded = loadStore();

export const mockUsers: User[] = loaded.users;
export const mockUserHashes: Record<string, string> = loaded.userHashes;
export const mockBoards: Board[] = loaded.boards;
export const mockNotes: Note[] = loaded.notes;
export const mockShares: NoteShare[] = loaded.shares;

export function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      users: mockUsers,
      userHashes: mockUserHashes,
      boards: mockBoards,
      notes: mockNotes,
      shares: mockShares,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store to disk:', err);
  }
}
