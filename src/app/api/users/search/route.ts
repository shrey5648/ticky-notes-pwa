import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers } from '@/lib/mockStore';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name')
        .neq('id', user.id)
        .ilike('username', `%${query}%`)
        .limit(10);

      if (error) {
        console.error('Search users error:', error);
        return NextResponse.json({ users: [] });
      }

      return NextResponse.json({ users: data || [] });
    } else {
      // Mock Fallback
      const matches = mockUsers
        .filter((u) => u.id !== user.id && u.username.toLowerCase().includes(query))
        .map((u) => ({ id: u.id, username: u.username, display_name: u.display_name }));

      return NextResponse.json({ users: matches });
    }
  } catch (err) {
    console.error('User search error:', err);
    return NextResponse.json({ users: [] });
  }
}
