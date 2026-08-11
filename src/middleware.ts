import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security middleware — adds HTTP security headers to all responses.
 * These headers protect against XSS, clickjacking, MIME sniffing,
 * and enforce HTTPS in production.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information leakage
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Content Security Policy — strict but allows inline styles for the rich text editor
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",       // inline scripts for theme/SW
      "style-src 'self' 'unsafe-inline'",         // inline styles for Tiptap editor
      "img-src 'self' data: blob:",               // data URIs for canvas export
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co",  // API calls to Supabase
      "frame-ancestors 'none'",                    // no embedding
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self'",                         // service worker
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
