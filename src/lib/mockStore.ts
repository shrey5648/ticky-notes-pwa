import { User, Note, NoteShare } from './types';

// Initial demo user
export const mockUsers: User[] = [
  {
    id: 'user-demo-1',
    username: 'ignek',
    display_name: 'Ignek User',
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-demo-2',
    username: 'alex',
    display_name: 'Alex Rivera',
    created_at: new Date().toISOString(),
  }
];

// Hash for PIN "1234"
export const mockUserHashes: Record<string, string> = {
  'user-demo-1': '$2a$10$w8.1Z31P38.k7H7dY1Gg5.0uR0tW7yZ6N5m6O7P8Q9R0S1T2U3V4W',
  'user-demo-2': '$2a$10$w8.1Z31P38.k7H7dY1Gg5.0uR0tW7yZ6N5m6O7P8Q9R0S1T2U3V4W',
};

// Initial demo notes
export const mockNotes: Note[] = [
  {
    id: 'note-1',
    owner_id: 'user-demo-1',
    title: '💡 Welcome to Sticky Notes!',
    content: '<p>Welcome to your <strong>Sticky Notes PWA</strong>! You can drag notes around, pin important items, change colors, edit in rich text, and share notes with team members.</p>',
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
    content: '<ul><li>[x] Design cork board canvas</li><li>[x] Add drag & drop support</li><li>[x] Implement PIN authentication</li><li>[/] PWA desktop app install</li></ul>',
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
    title: '🤝 Shared Team Goal',
    content: '<p>Hey team! Let\'s coordinate on the upcoming release notes. Feel free to edit this sticky note!</p>',
    color: '#A5D6A7', // Green
    position_x: 540,
    position_y: 380,
    is_pinned: true,
    is_archived: false,
    z_index: 8,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    shared_by_user: {
      username: 'alex',
      display_name: 'Alex Rivera'
    },
    permission: 'edit',
    is_shared: true
  }
];

export const mockShares: NoteShare[] = [
  {
    id: 'share-1',
    note_id: 'note-4',
    shared_by: 'user-demo-2',
    shared_with: 'user-demo-1',
    permission: 'edit',
    created_at: new Date().toISOString()
  }
];
