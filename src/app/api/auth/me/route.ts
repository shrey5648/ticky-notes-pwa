import { NextResponse } from 'next/server';
import { getSessionUserFromHeader } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers } from '@/lib/mockStore';

export async function GET(req: Request) {
  const sessionUser = await getSessionUserFromHeader(req);
  if (!sessionUser) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  let role = sessionUser.role || 'user';

  // Resolve fresh role from database if available
  if (isSupabaseConfigured()) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', sessionUser.id)
      .single();

    if (data && data.role) {
      role = data.role;
    }
  } else {
    const found = mockUsers.find((u) => u.id === sessionUser.id || u.username === sessionUser.username);
    if (found && found.role) {
      role = found.role;
    }
  }

  const fullUser = {
    id: sessionUser.id,
    username: sessionUser.username,
    display_name: sessionUser.display_name,
    role,
  };

  return NextResponse.json({ authenticated: true, user: fullUser });
}
