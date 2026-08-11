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
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

