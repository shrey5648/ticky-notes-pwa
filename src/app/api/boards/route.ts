import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockBoards, mockNotes, saveStore } from '@/lib/mockStore';
import { Board } from '@/lib/types';

const DEFAULT_BOARD: Board = {
  id: 'board-default',
  name: 'Main Board',
  owner_id: 'system',
  color: '#e65100',
  created_at: new Date().toISOString(),
};

// GET list all workspace boards
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isSupabaseConfigured()) {
      const { data: dbBoards, error } = await supabaseAdmin
        .from('boards')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !dbBoards || dbBoards.length === 0) {
        return NextResponse.json({ boards: [DEFAULT_BOARD, ...(dbBoards || [])] });
      }

      return NextResponse.json({ boards: dbBoards });
    } else {
      if (mockBoards.length === 0) {
        mockBoards.push({ ...DEFAULT_BOARD, owner_id: user.id });
        saveStore();
      }
      return NextResponse.json({ boards: mockBoards });
    }
  } catch (err) {
    console.error('GET boards error:', err);
    return NextResponse.json({ error: 'Failed to retrieve boards' }, { status: 500 });
  }
}

// POST create new board
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, color } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
    }

    const newBoard = {
      name: name.trim(),
      owner_id: user.id,
      color: color || '#e65100',
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('boards')
        .insert(newBoard)
        .select()
        .single();

      if (error) {
        console.warn('Supabase create board failed, using fallback:', error.message);
        const fallbackBoard: Board = {
          id: `board-${Date.now()}`,
          ...newBoard,
          created_at: new Date().toISOString(),
        };
        return NextResponse.json({ board: fallbackBoard });
      }

      return NextResponse.json({ board: data });
    } else {
      const created: Board = {
        id: `board-${Date.now()}`,
        ...newBoard,
        created_at: new Date().toISOString(),
      };
      mockBoards.push(created);
      saveStore();
      return NextResponse.json({ board: created });
    }
  } catch (err) {
    console.error('POST board error:', err);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}

// PUT update / rename board
export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, color, theme_variant } = await req.json();
    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Board ID and name are required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // Verify ownership before updating
      const { data: board } = await supabaseAdmin
        .from('boards')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!board) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }

      if (board.owner_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only board owner or admin can update' }, { status: 403 });
      }

      const updates: any = { name: name.trim() };
      if (color) updates.color = color;
      if (theme_variant) updates.theme_variant = theme_variant;

      const { data, error } = await supabaseAdmin
        .from('boards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
      }

      return NextResponse.json({ board: data });
    } else {
      const index = mockBoards.findIndex((b) => b.id === id);
      if (index === -1) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }

      if (mockBoards[index].owner_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only board owner or admin can update' }, { status: 403 });
      }

      mockBoards[index].name = name.trim();
      if (color) mockBoards[index].color = color;
      if (theme_variant) mockBoards[index].theme_variant = theme_variant;
      saveStore();

      return NextResponse.json({ board: mockBoards[index] });
    }
  } catch (err) {
    console.error('PUT board error:', err);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE delete board
export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    if (id === 'board-default') {
      return NextResponse.json({ error: 'Cannot delete default primary board' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // Verify ownership before deleting
      const { data: board } = await supabaseAdmin
        .from('boards')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (board && board.owner_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only board owner or admin can delete' }, { status: 403 });
      }

      const { error } = await supabaseAdmin.from('boards').delete().eq('id', id);
      if (error) {
        console.error('Delete board error:', error);
      }
      return NextResponse.json({ success: true, id });
    } else {
      const index = mockBoards.findIndex((b) => b.id === id);
      if (index > -1) {
        if (mockBoards[index].owner_id !== user.id && user.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden: Only board owner or admin can delete' }, { status: 403 });
        }
        mockBoards.splice(index, 1);
        mockNotes.forEach((n) => {
          if (n.board_id === id) {
            n.board_id = 'board-default';
          }
        });
        saveStore();
      }
      return NextResponse.json({ success: true, id });
    }
  } catch (err) {
    console.error('DELETE board error:', err);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
