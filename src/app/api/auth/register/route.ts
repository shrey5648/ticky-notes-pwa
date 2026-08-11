import { NextResponse } from 'next/server';
import { hashPin, signToken } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers, mockUserHashes } from '@/lib/mockStore';

export async function POST(req: Request) {
  try {
    const { username, pin, display_name } = await req.json();

    if (!username || !pin || pin.length < 4) {
      return NextResponse.json(
        { error: 'Username and a 4-6 digit PIN are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const pinHash = await hashPin(pin);
    const displayName = display_name?.trim() || cleanUsername;

    let user;

    if (isSupabaseConfigured()) {
      // Check existing username in Supabase
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already taken. Please choose another.' },
          { status: 409 }
        );
      }

      // Insert new user
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          username: cleanUsername,
          pin_hash: pinHash,
          display_name: displayName,
        })
        .select('id, username, display_name')
        .single();

      if (error || !newUser) {
        console.error('Supabase user registration error:', error);
        return NextResponse.json(
          { error: 'Failed to create user account.' },
          { status: 500 }
        );
      }

      user = newUser;
    } else {
      // Mock Fallback
      const existing = mockUsers.find((u) => u.username === cleanUsername);
      if (existing) {
        return NextResponse.json(
          { error: 'Username already taken. Please choose another.' },
          { status: 409 }
        );
      }

      const newUser = {
        id: `user-${Date.now()}`,
        username: cleanUsername,
        display_name: displayName,
        created_at: new Date().toISOString(),
      };
      mockUsers.push(newUser);
      mockUserHashes[newUser.id] = pinHash;
      user = newUser;
    }

    // Sign JWT token
    const token = await signToken({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Register API error:', err);
    return NextResponse.json({ error: 'Server error during registration.' }, { status: 500 });
  }
}
