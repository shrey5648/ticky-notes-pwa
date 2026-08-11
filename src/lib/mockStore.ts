import { User, Note, NoteShare } from './types';

// Initial users with role definition (ignek is Super Admin)
export const mockUsers: User[] = [
  {
    id: 'user-demo-1',
    username: 'ignek',
    display_name: 'Ignek User',
    role: 'admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-demo-2',
    username: 'alex',
    display_name: 'Alex Rivera',
    role: 'user',
    created_at: new Date().toISOString(),
  }
];

// Bcrypt Hash for user initial authentication
export const mockUserHashes: Record<string, string> = {
  'user-demo-1': '$2b$10$B/M2SKxNTWL5afegjl/nnuDLkejEsAJvzzll1gJVRU7pluYNHT7Oq',
  'user-demo-2': '$2b$10$B/M2SKxNTWL5afegjl/nnuDLkejEsAJvzzll1gJVRU7pluYNHT7Oq',
};

// Initial notes
export const mockNotes: Note[] = [
  {
    id: 'note-1',
    owner_id: 'user-demo-1',
    title: '💡 Welcome Super Admin!',
    content: '<p>As a <strong>Super Admin</strong>, you can see and manage all user sticky notes across the workspace, manage user accounts, change user roles, and reset PINs!</p>',
    color: '#FFEB3B', // Yellow
    position_x: 60,
    position_y: 60,
    is_pinned: true,
    is_archived: false,
    z_index: 10,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    permission: 'owner'
  },
  {
    id: 'note-2',
    owner_id: 'user-demo-1',
    title: '📌 Project Roadmap',
    content: '<ul><li>[x] Design cork board canvas</li><li>[x] Add drag & drop support</li><li>[x] Implement PIN authentication</li><li>[x] Super Admin Workspace Controls</li></ul>',
    color: '#81D4FA', // Blue
    position_x: 420,
    position_y: 60,
    is_pinned: false,
    is_archived: false,
    z_index: 5,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    permission: 'owner'
  },
  {
    id: 'note-3',
    owner_id: 'user-demo-1',
    title: '🛒 Shopping List',
    content: '<p>Remember to buy:</p><ol><li>Coffee beans ☕</li><li>Fresh sticky notes 📝</li><li>Snacks 🍿</li></ol>',
    color: '#F48FB1', // Pink
    position_x: 180,
    position_y: 380,
    is_pinned: false,
    is_archived: false,
    z_index: 2,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    permission: 'owner'
  },
  {
    id: 'note-4',
    owner_id: 'user-demo-2',
    title: '🤝 Alex\'s Project Note',
    content: '<p>This is a sticky note created by Alex. Super Admins can view, move, edit, or manage this note directly from the admin canvas!</p>',
    color: '#A5D6A7', // Green
    position_x: 540,
    position_y: 380,
    is_pinned: true,
    is_archived: false,
    z_index: 8,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    permission: 'owner'
  }
];

export const mockShares: NoteShare[] = [];
