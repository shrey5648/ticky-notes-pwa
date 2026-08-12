import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockPublicShares, mockNotes, mockBoards, mockUsers, saveStore } from '@/lib/mockStore';

// Random token generator helper
function generateToken(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// GET list public shares for entity
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entity_id');

    if (!entityId) {
      return NextResponse.json({ error: 'entity_id is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('public_shares')
        .select('*')
        .eq('entity_id', entityId);

      if (error) {
        return NextResponse.json({ shares: [] });
      }
      return NextResponse.json({ shares: data || [] });
    } else {
      const shares = mockPublicShares.filter((s) => s.entity_id === entityId);
      return NextResponse.json({ shares });
    }
  } catch (err) {
    console.error('GET public shares error:', err);
    return NextResponse.json({ shares: [] });
  }
}

// POST create a public share token
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type = 'note', entity_id, password_pin, expires_in_hours } = await req.json();

    if (!entity_id) {
      return NextResponse.json({ error: 'entity_id is required' }, { status: 400 });
    }

    const token = generateToken(16);
    let expires_at: string | null = null;

    if (expires_in_hours && typeof expires_in_hours === 'number') {
      const expDate = new Date();
      expDate.setHours(expDate.getHours() + expires_in_hours);
      expires_at = expDate.toISOString();
    }

    const shareObject = {
      id: `pshare-${Date.now()}`,
      token,
      entity_type: entity_type as 'note' | 'board',
      entity_id,
      shared_by: user.id,
      password_pin: password_pin ? String(password_pin).trim() : undefined,
      expires_at,
      created_at: new Date().toISOString(),
      shared_by_user: {
        username: user.username,
        display_name: user.display_name,
      },
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('public_shares')
        .insert({
          token,
          entity_type,
          entity_id,
          shared_by: user.id,
          password_pin: shareObject.password_pin,
          expires_at,
        })
        .select()
        .single();

      if (error) {
        console.error('Create public share error:', error);
        return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
      }
      return NextResponse.json({ share: data });
    } else {
      mockPublicShares.push(shareObject);
      saveStore();
      return NextResponse.json({ share: shareObject });
    }
  } catch (err) {
    console.error('POST public share error:', err);
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}

// DELETE revoke a public share link
export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin.from('public_shares').delete().eq('id', shareId);
      if (error) {
        return NextResponse.json({ error: 'Failed to revoke link' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    } else {
      const idx = mockPublicShares.findIndex((s) => s.id === shareId);
      if (idx !== -1) {
        mockPublicShares.splice(idx, 1);
        saveStore();
      }
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error('DELETE public share error:', err);
    return NextResponse.json({ error: 'Failed to revoke link' }, { status: 500 });
  }
}
