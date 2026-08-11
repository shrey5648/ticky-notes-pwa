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

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notes_owner ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON public.notes(is_archived);
CREATE INDEX IF NOT EXISTS idx_notes_board ON public.notes(board_id);
CREATE INDEX IF NOT EXISTS idx_shares_with ON public.note_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_shares_note ON public.note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

