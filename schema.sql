-- Create users table (custom username + PIN authentication with role support)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'admin' or 'user'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create boards table
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#e65100',
  theme_variant TEXT DEFAULT 'cork',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  board_id TEXT DEFAULT 'board-default',
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#FFEB3B',
  position_x INTEGER DEFAULT 100,
  position_y INTEGER DEFAULT 100,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  z_index INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ,
  style_variant TEXT DEFAULT 'default',
  font_family TEXT DEFAULT 'sans',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migration commands for databases initialized with earlier schema
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS theme_variant TEXT DEFAULT 'cork';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS board_id TEXT DEFAULT 'board-default';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS style_variant TEXT DEFAULT 'default';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'sans';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS sticker TEXT;

-- Create note_shares table
CREATE TABLE IF NOT EXISTS public.note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(note_id, shared_with)
);

-- Create public_shares table for secret link sharing
CREATE TABLE IF NOT EXISTS public.public_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('note', 'board')) DEFAULT 'note',
  entity_id TEXT NOT NULL,
  shared_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  password_pin TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create note_comments table
CREATE TABLE IF NOT EXISTS public.note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create workspace_activities table
CREATE TABLE IF NOT EXISTS public.workspace_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create note_connections table
CREATE TABLE IF NOT EXISTS public.note_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id TEXT DEFAULT 'board-default',
  from_note_id TEXT NOT NULL,
  to_note_id TEXT NOT NULL,
  label TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  style TEXT DEFAULT 'solid',
  arrow_type TEXT DEFAULT 'end',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create board_frames table
CREATE TABLE IF NOT EXISTS public.board_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id TEXT DEFAULT 'board-default',
  title TEXT DEFAULT 'Framed Group',
  position_x INTEGER DEFAULT 100,
  position_y INTEGER DEFAULT 100,
  width INTEGER DEFAULT 400,
  height INTEGER DEFAULT 300,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notes_owner ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON public.notes(is_archived);
CREATE INDEX IF NOT EXISTS idx_notes_board ON public.notes(board_id);
CREATE INDEX IF NOT EXISTS idx_connections_board ON public.note_connections(board_id);
CREATE INDEX IF NOT EXISTS idx_frames_board ON public.board_frames(board_id);
CREATE INDEX IF NOT EXISTS idx_shares_with ON public.note_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_shares_note ON public.note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_token ON public.public_shares(token);
CREATE INDEX IF NOT EXISTS idx_comments_note ON public.note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON public.workspace_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);


