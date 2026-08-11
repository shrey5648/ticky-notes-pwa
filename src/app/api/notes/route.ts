import { NextResponse } from 'next/server';
import { getSessionUserFromHeader } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockNotes, mockShares, mockUsers } from '@/lib/mockStore';
import { Note } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';

    if (isSupabaseConfigured()) {
      if (isAdmin) {
        // Super Admin gets ALL notes across all users
        const { data: allNotes, error } = await supabaseAdmin
          .from('notes')
          .select('*, users!notes_owner_id_fkey(username, display_name)');

        if (error) {
          console.error('Error fetching all notes for admin:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const formatted = (allNotes || []).map((n) => {
          const ownerInfo = n.users ? { username: n.users.username, display_name: n.users.display_name } : undefined;
          const isOtherUserNote = n.owner_id !== user.id;
          return {
            ...n,
            permission: 'owner' as const,
            is_shared: false,
            is_admin_view: isOtherUserNote,
            owner_user: ownerInfo,
          };
        });

        return NextResponse.json({ notes: formatted });
      }

      // Standard user view: owned + shared
      const { data: ownedNotes, error: ownedErr } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedErr) {
        console.error('Error fetching owned notes:', ownedErr);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      const { data: shares, error: shareErr } = await supabaseAdmin
        .from('note_shares')
        .select('permission, note_id, shared_by, users!note_shares_shared_by_fkey(username, display_name), notes(*)')
        .eq('shared_with', user.id);

      if (shareErr) {
        console.error('Error fetching shared notes:', shareErr);
      }

      const formattedOwned = (ownedNotes || []).map((n) => ({
        ...n,
        permission: 'owner' as const,
        is_shared: false,
      }));

      const formattedShared = (shares || [])
        .filter((s) => s.notes)
        .map((s) => ({
          ...(s.notes as unknown as Note),
          permission: s.permission as 'view' | 'edit',
          is_shared: true,
          shared_by_user: s.users ? {
            username: (s.users as any).username,
            display_name: (s.users as any).display_name,
          } : undefined,
        }));

      return NextResponse.json({ notes: [...formattedOwned, ...formattedShared] });
    } else {
      // Mock Store Fallback
      if (isAdmin) {
        // Super Admin sees ALL notes
        const allFormatted = mockNotes.map((n) => {
          const owner = mockUsers.find((u) => u.id === n.owner_id);
          const isOtherUserNote = n.owner_id !== user.id;
          return {
            ...n,
            permission: 'owner' as const,
            is_admin_view: isOtherUserNote,
            owner_user: owner ? { username: owner.username, display_name: owner.display_name } : undefined,
          };
        });

        return NextResponse.json({ notes: allFormatted });
      }

      // Regular User view
      const userOwned = mockNotes.filter((n) => n.owner_id === user.id);
      const userShared = mockShares
        .filter((s) => s.shared_with === user.id)
        .map((s) => {
          const originalNote = mockNotes.find((n) => n.id === s.note_id);
          const owner = mockUsers.find((u) => u.id === s.shared_by);
          if (!originalNote) return null;
          return {
            ...originalNote,
            permission: s.permission,
            is_shared: true,
            shared_by_user: owner ? { username: owner.username, display_name: owner.display_name } : undefined,
          };
        })
        .filter(Boolean) as Note[];

      return NextResponse.json({ notes: [...userOwned, ...userShared] });
    }
  } catch (err) {
    console.error('GET notes error:', err);
    return NextResponse.json({ error: 'Failed to retrieve notes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, color, position_x, position_y, is_pinned } = body;

    const newNoteData = {
      owner_id: user.id,
      title: title || '📝 New Note',
      content: content || '<p></p>',
      color: color || '#FFEB3B',
      position_x: position_x ?? 100,
      position_y: position_y ?? 100,
      is_pinned: is_pinned ?? false,
      is_archived: false,
      z_index: Date.now() % 10000,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('notes')
        .insert(newNoteData)
        .select()
        .single();

      if (error) {
        console.error('Create note Supabase error:', error);
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
      }

      return NextResponse.json({ note: { ...data, permission: 'owner' } });
    } else {
      // Mock store fallback
      const createdNote: Note = {
        id: `note-${Date.now()}`,
        ...newNoteData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permission: 'owner',
      };
      mockNotes.push(createdNote);
      return NextResponse.json({ note: createdNote });
    }
  } catch (err) {
    console.error('POST note error:', err);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
