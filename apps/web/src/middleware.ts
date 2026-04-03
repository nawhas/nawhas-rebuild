import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Routes that require authentication.
 * Add patterns here as protected features are built out.
 */
const PROTECTED_PATHS = ['/admin', '/library', '/history', '/profile', '/settings'];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  // Always forward x-pathname so Server Components (e.g. ProtectedLayout) can
  // read the current request path as a fallback in edge cases where middleware
  // does not redirect (e.g. DB unavailable during session validation).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  if (!isProtected) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Better Auth stores the session token in a cookie named 'better-auth.session_token'
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie present — validate the actual session by calling the auth endpoint.
  // This catches stale or revoked tokens that would otherwise bypass the cookie-
  // existence check above and reach ProtectedLayout, where x-pathname header
  // forwarding is unreliable in the Next.js 15 dev server / Docker environment.
  //
  // /api/auth is excluded from the middleware matcher so this fetch does not
  // recurse through middleware. Stays in Edge runtime — no Node.js imports needed.
  try {
    const sessionUrl = new URL('/api/auth/get-session', request.url);
    const sessionRes = await fetch(sessionUrl.href, {
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
        Origin: new URL(request.url).origin,
      },
    });
    const sessionData = sessionRes.ok
      ? (await sessionRes.json() as { user?: unknown } | null)
      : null;
    if (!sessionData?.user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // If validation fails (e.g. auth service unreachable), pass through and let
    // ProtectedLayout handle the auth check as a fallback.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api/auth (Better Auth handlers)
     * - /_next (Next.js internals)
     * - /favicon.ico, /robots.txt, etc.
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
};
