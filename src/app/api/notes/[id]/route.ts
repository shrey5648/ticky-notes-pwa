import { NextResponse } from 'next/server';
import { getSessionUserFromHeader } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockNotes, mockShares } from '@/lib/mockStore';

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

    if (isSupabaseConfigured()) {
      // Check ownership or edit permission
      const { data: note } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (note.owner_id !== user.id) {
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

      const { data: updatedNote, error } = await supabaseAdmin
        .from('notes')
        .update(updatePayload)
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        console.error('Update note error:', error);
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
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
      const canEdit = isOwner || (share && share.permission === 'edit');

      if (!canEdit) {
        return NextResponse.json({ error: 'Forbidden: Edit permission required' }, { status: 403 });
      }

      const updated = {
        ...note,
        ...body,
        updated_at: new Date().toISOString(),
      };
      mockNotes[noteIndex] = updated;

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

      if (note.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden: Only owner can delete' }, { status: 403 });
      }

      const { error } = await supabaseAdmin.from('notes').delete().eq('id', noteId);
      if (error) {
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
      }

      return NextResponse.json({ success: true, id: noteId });
    } else {
      // Mock Fallback
      const noteIndex = mockNotes.findIndex((n) => n.id === noteId);
      if (noteIndex === -1) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (mockNotes[noteIndex].owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden: Only owner can delete' }, { status: 403 });
      }

      mockNotes.splice(noteIndex, 1);
      return NextResponse.json({ success: true, id: noteId });
    }
  } catch (err) {
    console.error('DELETE note error:', err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
