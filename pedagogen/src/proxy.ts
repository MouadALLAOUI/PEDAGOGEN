import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pedagogen-dev-secret-key-change-in-production-2024'
);

// Public API paths that do not require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/session',
  '/api/auth/logout',
  '/api/health',
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public auth endpoints
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Extract token from cookie or Authorization header
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Forward the authenticated user id down to the API route via request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
