import { NextResponse } from 'next/server';
import { getSessionUserFromHeader, hashPin } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers, mockNotes, mockShares, mockUserHashes, saveStore } from '@/lib/mockStore';

// PUT update user (role / PIN)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUserFromHeader(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;
    const { role, pin, display_name } = await req.json();

    const updates: Record<string, any> = {};
    if (role && (role === 'admin' || role === 'user')) updates.role = role;
    if (display_name) updates.display_name = display_name.trim();
    if (pin && pin.length >= 4) {
      updates.pin_hash = await hashPin(pin);
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', targetUserId)
        .select('id, username, display_name, role')
        .single();

      if (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      return NextResponse.json({ user: data });
    } else {
      // Mock Fallback
      const userIndex = mockUsers.findIndex((u) => u.id === targetUserId);
      if (userIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (updates.role) mockUsers[userIndex].role = updates.role;
      if (updates.display_name) mockUsers[userIndex].display_name = updates.display_name;
      if (updates.pin_hash) mockUserHashes[targetUserId] = updates.pin_hash;
      saveStore();

      return NextResponse.json({ user: mockUsers[userIndex] });
    }
  } catch (err) {
    console.error('PUT user error:', err);
    return NextResponse.json({ error: 'Server error updating user' }, { status: 500 });
  }
}

// DELETE remove user
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
      saveStore();

      return NextResponse.json({ success: true, id: targetUserId });
    }
  } catch (err) {
    console.error('DELETE user error:', err);
    return NextResponse.json({ error: 'Server error deleting user' }, { status: 500 });
  }
}
