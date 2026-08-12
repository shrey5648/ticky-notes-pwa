import { NextResponse } from 'next/server';
import { verifyPin, signToken } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockUsers, mockUserHashes } from '@/lib/mockStore';
import { checkLoginRateLimit, recordFailedLogin, recordSuccessfulLogin } from '@/lib/authLimits';

// ── Rate Limiter ────────────────────────────────────────────────────
// In-memory rate limiter: 5 failed attempts per IP+username → 15-min lockout.
// In production, replace with Redis/Upstash for multi-instance deployments.

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.firstAttempt > WINDOW_MS && now > entry.lockedUntil) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getRateLimitKey(req: Request, username: string): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `${ip}:${username}`;
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) return { allowed: true };

  // Check if currently locked out
  if (entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.delete(key);
    return { allowed: true };
  }

  // Check if max attempts reached
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    const retryAfterSeconds = Math.ceil(LOCKOUT_MS / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, lockedUntil: 0 });
  } else {
    entry.attempts++;
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
    }
  }
}

function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ── Login Handler ───────────────────────────────────────────────────

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

    // Check custom rate limit and lockout state (rolling 12h logins / 2 incorrect attempts)
    const limitCheck = checkLoginRateLimit(cleanUsername);
    if (!limitCheck.allowed) {
      const response = NextResponse.json(
        { error: limitCheck.reason },
        { status: 429 }
      );
      if (limitCheck.retryAfterSeconds) {
        response.headers.set('Retry-After', String(limitCheck.retryAfterSeconds));
      }
      return response;
    }

    // Check IP-based connection rate limit
    const rateLimitKey = getRateLimitKey(req, cleanUsername);
    const { allowed, retryAfterSeconds } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      const response = NextResponse.json(
        { error: `Too many connection attempts. Try again in ${retryAfterSeconds} seconds.` },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(retryAfterSeconds));
      return response;
    }

    let user;
    let pinHash;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (error || !data) {
        recordFailedAttempt(rateLimitKey);
        recordFailedLogin(cleanUsername);
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
        recordFailedAttempt(rateLimitKey);
        recordFailedLogin(cleanUsername);
        return NextResponse.json(
          { error: 'Invalid username or PIN.' },
          { status: 401 }
        );
      }
      user = found;
      pinHash = mockUserHashes[found.id];
    }

    if (!pinHash) {
      recordFailedAttempt(rateLimitKey);
      recordFailedLogin(cleanUsername);
      return NextResponse.json(
        { error: 'Invalid username or PIN.' },
        { status: 401 }
      );
    }

    // Verify PIN with secure bcrypt verification
    const isValid = await verifyPin(pin, pinHash);

    if (!isValid) {
      recordFailedAttempt(rateLimitKey);
      recordFailedLogin(cleanUsername);
      return NextResponse.json(
        { error: 'Invalid username or PIN.' },
        { status: 401 }
      );
    }

    // Successful login — clear rate limit and record successful attempt
    clearRateLimit(rateLimitKey);
    recordSuccessfulLogin(cleanUsername);

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
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days (matches JWT expiry)
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Server error during login.' }, { status: 500 });
  }
}
