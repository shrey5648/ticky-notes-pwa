import { NextResponse } from 'next/server';
import { mockConnections, saveStore } from '@/lib/mockStore';
import { NoteConnection } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('board_id');

  let filtered = mockConnections;
  if (boardId) {
    filtered = mockConnections.filter((c) => c.board_id === boardId);
  }

  return NextResponse.json({ connections: filtered });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newConnection: NoteConnection = {
      id: body.id || `conn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      board_id: body.board_id || 'board-default',
      from_note_id: body.from_note_id,
      to_note_id: body.to_note_id,
      label: body.label || '',
      color: body.color || '#6366f1',
      style: body.style || 'solid',
      arrow_type: body.arrow_type || 'end',
      created_at: new Date().toISOString(),
    };

    mockConnections.push(newConnection);
    saveStore();

    return NextResponse.json({ connection: newConnection }, { status: 201 });
  } catch (err) {
    console.error('Failed to create connection:', err);
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    const index = mockConnections.findIndex((c) => c.id === id);
    if (index !== -1) {
      mockConnections.splice(index, 1);
      saveStore();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete connection:', err);
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    const conn = mockConnections.find((c) => c.id === id);
    if (conn) {
      Object.assign(conn, updates);
      saveStore();
      return NextResponse.json({ connection: conn });
    }

    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  } catch (err) {
    console.error('Failed to update connection:', err);
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
  }
}
