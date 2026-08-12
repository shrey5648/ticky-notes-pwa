import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockPublicShares, mockNotes, mockBoards, mockUsers } from '@/lib/mockStore';

// GET retrieve public share item by token
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    let shareRecord: any = null;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('public_shares')
        .select('*, users!public_shares_shared_by_fkey(username, display_name)')
        .eq('token', token)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
      }
      shareRecord = data;
    } else {
      shareRecord = mockPublicShares.find((s) => s.token === token);
    }

    if (!shareRecord) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    // Check expiration
    if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Check if password PIN is required
    const requiresPassword = Boolean(shareRecord.password_pin);

    // If password PIN is set, return metadata indicating PIN is required (without revealing content until verified)
    if (requiresPassword) {
      return NextResponse.json({
        requiresPassword: true,
        entity_type: shareRecord.entity_type,
        shared_by: shareRecord.shared_by_user || { username: 'creator', display_name: 'Workspace Member' },
      });
    }

    // Return payload
    const payload = await getPublicPayload(shareRecord);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('GET public share by token error:', err);
    return NextResponse.json({ error: 'Server error retrieving shared content' }, { status: 500 });
  }
}

// POST verify PIN password for public share token
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { password_pin } = await req.json();


    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    let shareRecord: any = null;

    if (isSupabaseConfigured()) {
      const { data } = await supabaseAdmin
        .from('public_shares')
        .select('*')
        .eq('token', token)
        .single();
      shareRecord = data;
    } else {
      shareRecord = mockPublicShares.find((s) => s.token === token);
    }

    if (!shareRecord) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    if (shareRecord.password_pin && String(shareRecord.password_pin).trim() !== String(password_pin).trim()) {
      return NextResponse.json({ error: 'Incorrect Password PIN' }, { status: 401 });
    }

    const payload = await getPublicPayload(shareRecord);
    return NextResponse.json({ success: true, ...payload });
  } catch (err) {
    console.error('POST verify public PIN error:', err);
    return NextResponse.json({ error: 'Server error verifying PIN' }, { status: 500 });
  }
}

async function getPublicPayload(shareRecord: any) {
  const { entity_type, entity_id } = shareRecord;

  if (entity_type === 'note') {
    let note: any = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabaseAdmin.from('notes').select('*').eq('id', entity_id).single();
      note = data;
    } else {
      note = mockNotes.find((n) => n.id === entity_id);
    }

    if (!note) return { error: 'Shared note not found' };

    return {
      entity_type: 'note',
      note: {
        ...note,
        permission: 'view',
        is_shared: true,
      },
    };
  } else {
    // Board view
    let board: any = null;
    let boardNotes: any[] = [];

    if (isSupabaseConfigured()) {
      const { data: b } = await supabaseAdmin.from('boards').select('*').eq('id', entity_id).single();
      board = b;
      const { data: n } = await supabaseAdmin.from('notes').select('*').eq('board_id', entity_id).eq('is_deleted', false);
      boardNotes = n || [];
    } else {
      board = mockBoards.find((b) => b.id === entity_id);
      boardNotes = mockNotes.filter((n) => n.board_id === entity_id && !n.is_deleted);
    }

    return {
      entity_type: 'board',
      board: board || { id: entity_id, name: 'Shared Canvas Board' },
      notes: boardNotes.map((n) => ({ ...n, permission: 'view' })),
    };
  }
}
