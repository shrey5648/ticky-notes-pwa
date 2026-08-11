export interface User {
  id: string;
  username: string;
  display_name: string;
  created_at?: string;
}

export interface Note {
  id: string;
  owner_id: string;
  title: string;
  content: string; // Tiptap HTML or JSON string
  color: string;
  position_x: number;
  position_y: number;
  is_pinned: boolean;
  is_archived: boolean;
  z_index: number;
  created_at: string;
  updated_at: string;
  // Shared metadata if populated
  shared_by_user?: {
    username: string;
    display_name: string;
  };
  permission?: 'view' | 'edit' | 'owner';
  is_shared?: boolean;
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
}
