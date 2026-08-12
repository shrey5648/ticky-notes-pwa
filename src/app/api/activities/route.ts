import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockActivities } from '@/lib/mockStore';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('workspace_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Fetch activities error:', error);
        return NextResponse.json({ activities: [] });
      }
      return NextResponse.json({ activities: data || [] });
    } else {
      return NextResponse.json({ activities: mockActivities.slice(0, 50) });
    }
  } catch (err) {
    console.error('GET activities error:', err);
    return NextResponse.json({ activities: [] });
  }
}
