import { NextResponse } from 'next/server';
import { getSessionUserFromHeader } from '@/lib/auth';
import { mockBoards, mockNotes, saveStore } from '@/lib/mockStore';
import { Board } from '@/lib/types';

// GET list all workspace boards
export async function GET(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure default board exists
    if (mockBoards.length === 0) {
      mockBoards.push({
        id: 'board-default',
        name: 'Main Board',
        owner_id: user.id,
        color: '#e65100',
        created_at: new Date().toISOString(),
      });
      saveStore();
    }

    return NextResponse.json({ boards: mockBoards });
  } catch (err) {
    console.error('GET boards error:', err);
    return NextResponse.json({ error: 'Failed to retrieve boards' }, { status: 500 });
  }
}

// POST create new board
export async function POST(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, color } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
    }

    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name: name.trim(),
      owner_id: user.id,
      color: color || '#e65100',
      created_at: new Date().toISOString(),
    };

    mockBoards.push(newBoard);
    saveStore();

    return NextResponse.json({ board: newBoard });
  } catch (err) {
    console.error('POST board error:', err);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}

// PUT update / rename board
export async function PUT(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, color } = await req.json();
    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Board ID and name are required' }, { status: 400 });
    }

    const index = mockBoards.findIndex((b) => b.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    mockBoards[index].name = name.trim();
    if (color) mockBoards[index].color = color;
    saveStore();

    return NextResponse.json({ board: mockBoards[index] });
  } catch (err) {
    console.error('PUT board error:', err);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE delete board
export async function DELETE(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    if (id === 'board-default' || mockBoards.length <= 1) {
      return NextResponse.json({ error: 'Cannot delete default primary board' }, { status: 400 });
    }

    const index = mockBoards.findIndex((b) => b.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    mockBoards.splice(index, 1);

    // Move notes belonging to deleted board back to default board
    mockNotes.forEach((n) => {
      if (n.board_id === id) {
        n.board_id = 'board-default';
      }
    });

    saveStore();

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('DELETE board error:', err);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
