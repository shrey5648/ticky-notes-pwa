export interface User {
  id: string;
  username: string;
  display_name: string;
  role?: 'admin' | 'user';
  created_at?: string;
}

export interface Board {
  id: string;
  name: string;
  owner_id: string;
  color?: string;
  theme_variant?: 'cork' | 'dark_leather' | 'blueprint' | 'grid_paper' | 'vintage_pastel' | 'glassmorphism';
  created_at: string;
}

export interface NoteConnection {
  id: string;
  board_id: string;
  from_note_id: string;
  to_note_id: string;
  label?: string;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  arrow_type?: 'end' | 'both' | 'none';
  created_at: string;
}

export interface NoteFrame {
  id: string;
  board_id: string;
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color?: string;
  created_at: string;
}

export interface Note {
  id: string;
  owner_id: string;
  board_id?: string;
  title: string;
  content: string; // Tiptap HTML or JSON string
  color: string;
  position_x: number;
  position_y: number;
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted?: boolean;
  is_locked?: boolean;
  z_index: number;
  tags?: string[];
  due_date?: string | null;
  style_variant?: 'default' | 'kraft' | 'grid' | 'lined' | 'neon';
  font_family?: 'sans' | 'handwriting' | 'mono';
  pin_code?: string;
  sticker?: 'star' | 'urgent' | 'fire' | 'check' | 'secret' | 'idea' | 'pin' | 'goal' | string;
  comments_count?: number;
  created_at: string;
  updated_at: string;
  // Metadata for shared or admin views
  shared_by_user?: {
    username: string;
    display_name: string;
  };
  owner_user?: {
    username: string;
    display_name: string;
  };
  permission?: 'view' | 'edit' | 'owner';
  is_shared?: boolean;
  is_admin_view?: boolean;
}

export interface NoteShare {
  id: string;
  note_id: string;
  shared_by: string;
  shared_with: string;
  permission: 'view' | 'edit';
  created_at: string;
  shared_with_user?: {
    username: string;
    display_name: string;
  };
}

export interface PublicShareToken {
  id: string;
  token: string;
  entity_type: 'note' | 'board';
  entity_id: string;
  shared_by: string;
  password_pin?: string;
  expires_at?: string | null;
  created_at: string;
  shared_by_user?: {
    username: string;
    display_name: string;
  };
}

export interface NoteComment {
  id: string;
  note_id: string;
  user_id: string;
  username: string;
  display_name: string;
  comment_text: string;
  mentions?: string[];
  created_at: string;
}

export interface WorkspaceActivity {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  action_type: 'create' | 'update' | 'delete' | 'comment' | 'share' | 'pin' | 'move';
  entity_type: 'note' | 'board' | 'comment' | 'share';
  entity_id: string;
  description: string;
  created_at: string;
}

export interface UserPresence {
  user_id: string;
  username: string;
  display_name: string;
  color: string;
  cursor_x: number;
  cursor_y: number;
  active_board_id: string;
  last_active: number;
}

export interface SyncItem {
  id?: number;
  action: 'create' | 'update' | 'delete';
  entity: 'note';
  data: Partial<Note>;
  timestamp: number;
}

export interface JWTPayload {
  id: string;
  username: string;
  display_name: string;
  role?: 'admin' | 'user';
}

