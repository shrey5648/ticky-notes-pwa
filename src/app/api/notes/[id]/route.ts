import { NextResponse } from 'next/server';
import { getSessionUserFromHeader } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockNotes, mockShares, saveStore } from '@/lib/mockStore';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const noteId = resolvedParams.id;
    const body = await req.json();
    const isAdmin = user.role === 'admin';

    if (isSupabaseConfigured()) {
      // Check ownership or edit permission unless Super Admin
      const { data: note } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (note.owner_id !== user.id && !isAdmin) {
        // Check share permission
        const { data: share } = await supabaseAdmin
          .from('note_shares')
          .select('permission')
          .eq('note_id', noteId)
          .eq('shared_with', user.id)
          .single();

        if (!share || share.permission !== 'edit') {
          return NextResponse.json({ error: 'Forbidden: Edit permission required' }, { status: 403 });
        }
      }

      // Update fields
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (body.title !== undefined) updatePayload.title = body.title;
      if (body.content !== undefined) updatePayload.content = body.content;
      if (body.color !== undefined) updatePayload.color = body.color;
      if (body.position_x !== undefined) updatePayload.position_x = body.position_x;
      if (body.position_y !== undefined) updatePayload.position_y = body.position_y;
      if (body.is_pinned !== undefined) updatePayload.is_pinned = body.is_pinned;
      if (body.is_archived !== undefined) updatePayload.is_archived = body.is_archived;
      if (body.z_index !== undefined) updatePayload.z_index = body.z_index;
      if (body.board_id !== undefined) updatePayload.board_id = body.board_id;
      if (body.is_deleted !== undefined) updatePayload.is_deleted = body.is_deleted;
      if (body.tags !== undefined) updatePayload.tags = body.tags;
      if (body.due_date !== undefined) updatePayload.due_date = body.due_date;
      if (body.style_variant !== undefined) updatePayload.style_variant = body.style_variant;
      if (body.font_family !== undefined) updatePayload.font_family = body.font_family;

      let { data: updatedNote, error } = await supabaseAdmin
        .from('notes')
        .update(updatePayload)
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        console.warn('Update note full payload error, falling back to core fields:', error.message);
        const corePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (body.title !== undefined) corePayload.title = body.title;
        if (body.content !== undefined) corePayload.content = body.content;
        if (body.color !== undefined) corePayload.color = body.color;
        if (body.position_x !== undefined) corePayload.position_x = body.position_x;
        if (body.position_y !== undefined) corePayload.position_y = body.position_y;
        if (body.is_pinned !== undefined) corePayload.is_pinned = body.is_pinned;
        if (body.is_archived !== undefined) corePayload.is_archived = body.is_archived;
        if (body.z_index !== undefined) corePayload.z_index = body.z_index;

        const { data: fallbackUpdated, error: fallbackErr } = await supabaseAdmin
          .from('notes')
          .update(corePayload)
          .eq('id', noteId)
          .select()
          .single();

        if (fallbackErr) {
          console.error('Update note fallback error:', fallbackErr);
          return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
        }
        updatedNote = fallbackUpdated;
      }

      return NextResponse.json({ note: updatedNote });
    } else {
      // Mock Fallback
      const noteIndex = mockNotes.findIndex((n) => n.id === noteId);
      if (noteIndex === -1) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      const note = mockNotes[noteIndex];
      const isOwner = note.owner_id === user.id;
      const share = mockShares.find((s) => s.note_id === noteId && s.shared_with === user.id);
      const canEdit = isOwner || isAdmin || (share && share.permission === 'edit');

      if (!canEdit) {
        return NextResponse.json({ error: 'Forbidden: Edit permission required' }, { status: 403 });
      }

      const updated = {
        ...note,
        ...body,
        updated_at: new Date().toISOString(),
      };
      mockNotes[noteIndex] = updated;
      saveStore();

      return NextResponse.json({ note: updated });
    }
  } catch (err) {
    console.error('PUT note error:', err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const noteId = resolvedParams.id;
    const isAdmin = user.role === 'admin';

    const { searchParams } = new URL(req.url);
    const purge = searchParams.get('purge') === 'true';

    if (isSupabaseConfigured()) {
      // Check ownership
      const { data: note } = await supabaseAdmin
        .from('notes')
        .select('owner_id')
        .eq('id', noteId)
        .single();

      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (note.owner_id !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only owner or Super Admin can delete' }, { status: 403 });
      }

      if (purge) {
        const { error } = await supabaseAdmin.from('notes').delete().eq('id', noteId);
        if (error) return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
      } else {
        const { error } = await supabaseAdmin.from('notes').update({ is_deleted: true }).eq('id', noteId);
        if (error) {
          console.warn('Soft delete failed (column may not exist), hard deleting note:', error.message);
          const { error: deleteErr } = await supabaseAdmin.from('notes').delete().eq('id', noteId);
          if (deleteErr) return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, id: noteId });
    } else {
      // Mock Fallback
      const noteIndex = mockNotes.findIndex((n) => n.id === noteId);
      if (noteIndex === -1) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (mockNotes[noteIndex].owner_id !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only owner or Super Admin can delete' }, { status: 403 });
      }

      if (purge) {
        mockNotes.splice(noteIndex, 1);
      } else {
        mockNotes[noteIndex].is_deleted = true;
        mockNotes[noteIndex].updated_at = new Date().toISOString();
      }
      saveStore();
      return NextResponse.json({ success: true, id: noteId });
    }
  } catch (err) {
    console.error('DELETE note error:', err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
