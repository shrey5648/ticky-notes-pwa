import { NextResponse } from 'next/server';
import { verifyPin, signToken } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers, mockUserHashes } from '@/lib/mockStore';

export async function POST(req: Request) {
  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return NextResponse.json(
        { error: 'Username and PIN are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    let user;
    let pinHash;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Invalid username or PIN.' },
          { status: 401 }
        );
      }

      user = {
        id: data.id,
        username: data.username,
        display_name: data.display_name,
        role: data.role || 'user',
      };
      pinHash = data.pin_hash;
    } else {
      // Local Database Store
      const found = mockUsers.find((u) => u.username === cleanUsername);
      if (!found) {
        return NextResponse.json(
          { error: 'Invalid username or PIN.' },
          { status: 401 }
        );
      }
      user = found;
      pinHash = mockUserHashes[found.id];
    }

    if (!pinHash) {
      return NextResponse.json(
        { error: 'Invalid username or PIN.' },
        { status: 401 }
      );
    }

    // Verify PIN with secure bcrypt verification
    const isValid = await verifyPin(pin, pinHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or PIN.' },
        { status: 401 }
      );
    }

    const userRole = user.role || 'user';

    // Sign JWT token including role
    const token = await signToken({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: userRole,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: userRole,
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
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Server error during login.' }, { status: 500 });
  }
}
