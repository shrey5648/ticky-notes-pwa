import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hashPin } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers, mockUserHashes, mockNotes, mockShares, saveStore } from '@/lib/mockStore';

// GET list all users
export async function GET(req: Request) {
  try {
    const sessionUser = await getAuthenticatedUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can list all users
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (isSupabaseConfigured()) {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      // Fetch note counts per user
      const { data: notes } = await supabaseAdmin.from('notes').select('owner_id');
      const noteCountMap: Record<string, number> = {};
      (notes || []).forEach((n) => {
        noteCountMap[n.owner_id] = (noteCountMap[n.owner_id] || 0) + 1;
      });

      const formatted = (users || []).map((u) => ({
        ...u,
        role: u.role || 'user',
        note_count: noteCountMap[u.id] || 0,
      }));

      return NextResponse.json({ users: formatted });
    } else {
      // Mock Fallback
      const formatted = mockUsers.map((u) => {
        const noteCount = mockNotes.filter((n) => n.owner_id === u.id).length;
        return {
          ...u,
          role: u.role || 'user',
          note_count: noteCount,
        };
      });

      return NextResponse.json({ users: formatted });
    }
  } catch (err) {
    console.error('GET users error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST create new user (Admin Add User)
export async function POST(req: Request) {
  try {
    const sessionUser = await getAuthenticatedUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create users
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { username, pin, display_name, role } = await req.json();

    if (!username || !pin || pin.length < 4) {
      return NextResponse.json(
        { error: 'Username and a 4-digit PIN are required' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const pinHash = await hashPin(pin);
    const displayName = display_name?.trim() || cleanUsername;
    const userRole = role === 'admin' ? 'admin' : 'user';

    if (isSupabaseConfigured()) {
      // Check duplicate
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: `Username "@${cleanUsername}" already exists.` },
          { status: 409 }
        );
      }

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          username: cleanUsername,
          pin_hash: pinHash,
          display_name: displayName,
          role: userRole,
        })
        .select('id, username, display_name, role, created_at')
        .single();

      if (error || !newUser) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      return NextResponse.json({ user: { ...newUser, note_count: 0 } });
    } else {
      // Mock Fallback
      const existing = mockUsers.find((u) => u.username === cleanUsername);
      if (existing) {
        return NextResponse.json(
          { error: `Username "@${cleanUsername}" already exists.` },
          { status: 409 }
        );
      }

      const newUser = {
        id: `user-${Date.now()}`,
        username: cleanUsername,
        display_name: displayName,
        role: userRole as 'admin' | 'user',
        created_at: new Date().toISOString(),
        note_count: 0,
      };

      mockUsers.push(newUser);
      mockUserHashes[newUser.id] = pinHash;
      saveStore();

      return NextResponse.json({ user: newUser });
    }
  } catch (err) {
    console.error('POST user error:', err);
    return NextResponse.json({ error: 'Server error creating user' }, { status: 500 });
  }
}
