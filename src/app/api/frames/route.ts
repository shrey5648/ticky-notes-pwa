import { NextResponse } from 'next/server';
import { mockFrames, saveStore } from '@/lib/mockStore';
import { NoteFrame } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('board_id');

  let filtered = mockFrames;
  if (boardId) {
    filtered = mockFrames.filter((f) => f.board_id === boardId);
  }

  return NextResponse.json({ frames: filtered });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newFrame: NoteFrame = {
      id: body.id || `frame-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      board_id: body.board_id || 'board-default',
      title: body.title || '📌 Swimlane Section',
      position_x: body.position_x ?? 100,
      position_y: body.position_y ?? 100,
      width: body.width ?? 450,
      height: body.height ?? 350,
      color: body.color || '#3b82f6',
      created_at: new Date().toISOString(),
    };

    mockFrames.push(newFrame);
    saveStore();

    return NextResponse.json({ frame: newFrame }, { status: 201 });
  } catch (err) {
    console.error('Failed to create frame:', err);
    return NextResponse.json({ error: 'Failed to create frame' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Frame ID required' }, { status: 400 });
    }

    const index = mockFrames.findIndex((f) => f.id === id);
    if (index !== -1) {
      mockFrames.splice(index, 1);
      saveStore();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete frame:', err);
    return NextResponse.json({ error: 'Failed to delete frame' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Frame ID required' }, { status: 400 });
    }

    const frame = mockFrames.find((f) => f.id === id);
    if (frame) {
      Object.assign(frame, updates);
      saveStore();
      return NextResponse.json({ frame });
    }

    return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
  } catch (err) {
    console.error('Failed to update frame:', err);
    return NextResponse.json({ error: 'Failed to update frame' }, { status: 500 });
  }
}
