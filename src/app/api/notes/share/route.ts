import { NextResponse } from 'next/server';
import { getSessionUserFromHeader } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockNotes, mockShares, mockUsers, saveStore } from '@/lib/mockStore';

// GET list shares for a note
export async function GET(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('note_id');

    if (!noteId) {
      return NextResponse.json({ error: 'note_id is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('note_shares')
        .select('id, note_id, shared_by, shared_with, permission, created_at, users!note_shares_shared_with_fkey(username, display_name)')
        .eq('note_id', noteId);

      if (error) {
        console.error('Fetch shares error:', error);
        return NextResponse.json({ shares: [] });
      }

      const formatted = (data || []).map((s) => ({
        id: s.id,
        note_id: s.note_id,
        shared_by: s.shared_by,
        shared_with: s.shared_with,
        permission: s.permission,
        created_at: s.created_at,
        shared_with_user: s.users ? {
          username: (s.users as any).username,
          display_name: (s.users as any).display_name,
        } : undefined,
      }));

      return NextResponse.json({ shares: formatted });
    } else {
      // Mock Fallback
      const shares = mockShares
        .filter((s) => s.note_id === noteId)
        .map((s) => {
          const target = mockUsers.find((u) => u.id === s.shared_with);
          return {
            ...s,
            shared_with_user: target ? { username: target.username, display_name: target.display_name } : undefined,
          };
        });

      return NextResponse.json({ shares });
    }
  } catch (err) {
    console.error('GET shares error:', err);
    return NextResponse.json({ shares: [] });
  }
}

// POST share note with user
export async function POST(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { note_id, username, permission = 'view' } = await req.json();

    if (!note_id || !username) {
      return NextResponse.json({ error: 'note_id and username are required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      // Verify note ownership
      const { data: note } = await supabaseAdmin
        .from('notes')
        .select('owner_id')
        .eq('id', note_id)
        .single();

      if (!note || note.owner_id !== user.id) {
        return NextResponse.json({ error: 'Only the note owner can share this note' }, { status: 403 });
      }

      // Find recipient user
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name')
        .eq('username', cleanUsername)
        .single();

      if (!targetUser) {
        return NextResponse.json({ error: `User "@${cleanUsername}" not found` }, { status: 404 });
      }

      if (targetUser.id === user.id) {
        return NextResponse.json({ error: 'You cannot share a note with yourself' }, { status: 400 });
      }

      // Insert or update share
      const { data: newShare, error } = await supabaseAdmin
        .from('note_shares')
        .upsert(
          {
            note_id,
            shared_by: user.id,
            shared_with: targetUser.id,
            permission,
          },
          { onConflict: 'note_id,shared_with' }
        )
        .select()
        .single();

      if (error) {
        console.error('Share note error:', error);
        return NextResponse.json({ error: 'Failed to share note' }, { status: 500 });
      }

      return NextResponse.json({
        share: {
          ...newShare,
          shared_with_user: {
            username: targetUser.username,
            display_name: targetUser.display_name,
          },
        },
      });
    } else {
      // Mock Fallback
      const note = mockNotes.find((n) => n.id === note_id);
      if (!note || note.owner_id !== user.id) {
        return NextResponse.json({ error: 'Only the note owner can share this note' }, { status: 403 });
      }

      const targetUser = mockUsers.find((u) => u.username === cleanUsername);
      if (!targetUser) {
        return NextResponse.json({ error: `User "@${cleanUsername}" not found` }, { status: 404 });
      }

      if (targetUser.id === user.id) {
        return NextResponse.json({ error: 'You cannot share a note with yourself' }, { status: 400 });
      }

      const existingIndex = mockShares.findIndex(
        (s) => s.note_id === note_id && s.shared_with === targetUser.id
      );

      const shareData = {
        id: `share-${Date.now()}`,
        note_id,
        shared_by: user.id,
        shared_with: targetUser.id,
        permission: permission as 'view' | 'edit',
        created_at: new Date().toISOString(),
        shared_with_user: {
          username: targetUser.username,
          display_name: targetUser.display_name,
        },
      };

      if (existingIndex > -1) {
        mockShares[existingIndex] = shareData;
      } else {
        mockShares.push(shareData);
      }
      saveStore();

      return NextResponse.json({ share: shareData });
    }
  } catch (err) {
    console.error('POST share error:', err);
    return NextResponse.json({ error: 'Failed to share note' }, { status: 500 });
  }
}

// DELETE revoke share
export async function DELETE(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('share_id');

    if (!shareId) {
      return NextResponse.json({ error: 'share_id is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin.from('note_shares').delete().eq('id', shareId);
      if (error) {
        return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    } else {
      // Mock Fallback
      const idx = mockShares.findIndex((s) => s.id === shareId);
      if (idx > -1) {
        mockShares.splice(idx, 1);
        saveStore();
      }
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error('DELETE share error:', err);
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 });
  }
}
