import { NextResponse } from 'next/server';
import { getSessionUserFromHeader } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers, mockNotes, mockShares, mockUserHashes } from '@/lib/mockStore';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUserFromHeader(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;

    if (targetUserId === sessionUser.id) {
      return NextResponse.json({ error: 'You cannot delete your own active session account.' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // Delete user from Supabase (cascades to notes and note_shares via foreign keys)
      const { error } = await supabaseAdmin.from('users').delete().eq('id', targetUserId);
      if (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
      }

      return NextResponse.json({ success: true, id: targetUserId });
    } else {
      // Mock Fallback
      const userIndex = mockUsers.findIndex((u) => u.id === targetUserId);
      if (userIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      mockUsers.splice(userIndex, 1);
      delete mockUserHashes[targetUserId];

      // Purge owned notes
      for (let i = mockNotes.length - 1; i >= 0; i--) {
        if (mockNotes[i].owner_id === targetUserId) {
          mockNotes.splice(i, 1);
        }
      }

      // Purge shares
      for (let i = mockShares.length - 1; i >= 0; i--) {
        if (mockShares[i].shared_by === targetUserId || mockShares[i].shared_with === targetUserId) {
          mockShares.splice(i, 1);
        }
      }

      return NextResponse.json({ success: true, id: targetUserId });
    }
  } catch (err) {
    console.error('DELETE user error:', err);
    return NextResponse.json({ error: 'Server error deleting user' }, { status: 500 });
  }
}
