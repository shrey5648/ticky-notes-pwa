import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Security middleware — adds HTTP security headers to all responses.
 * Enforces Double-Submit Cookie CSRF protection on mutations, and CSP scripts check.
 */
export function middleware(request: NextRequest) {
  const method = request.method;
  const isMutation = ['POST', 'PUT', 'DELETE'].includes(method);
  const isApi = request.nextUrl.pathname.startsWith('/api/');

  let csrfToken = request.cookies.get('csrf_token')?.value;
  let didAddToken = false;
  
  if (!csrfToken) {
    csrfToken = generateToken();
    didAddToken = true;
  }

  // 1. CSRF Protection for API Mutations
  if (isApi && isMutation) {
    const headerToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !headerToken || csrfToken !== headerToken) {
      return NextResponse.json(
        { error: 'CSRF token validation failed.' },
        { status: 403 }
      );
    }
  }

  const response = NextResponse.next();

  // Set CSRF Cookie with httpOnly: false so Javascript can access it
  if (didAddToken) {
    response.cookies.set('csrf_token', csrfToken, {
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });
  }

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information leakage
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features while allowing microphone for voice dictation
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=()'
  );

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Content Security Policy — tightens eval in production
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrcPolicy = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrcPolicy,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self' blob:",
    ].join('; ')
  );

  // HSTS — enforce HTTPS (only effective in production over HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

// Apply middleware to all routes except static files and assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, manifest (PWA assets)
     * - sw.js (service worker)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|sw\\.js).*)',
  ],
};
