import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Routes that require authentication.
 * Add patterns here as protected features are built out.
 */
const PROTECTED_PATHS = ['/admin', '/library', '/history', '/profile', '/settings', '/contribute', '/mod'];

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * Resolve get-session via loopback so Edge middleware does not depend on Docker DNS
 * for the public hostname (e.g. nawhas.test). Preserve Host / Origin so Better Auth
 * sees the same virtual host as the browser.
 */
function buildGetSessionUrl(request: NextRequest): URL {
  const u = request.nextUrl;
  const loopbackPort = u.port || (u.protocol === 'https:' ? '443' : '80');
  return new URL('/api/auth/get-session', `http://127.0.0.1:${loopbackPort}`);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected) {
    // Better Auth stores the session token in a cookie named 'better-auth.session_token'
    const sessionToken = request.cookies.get('better-auth.session_token');

    if (!sessionToken?.value) {
      return redirectToLogin(request, pathname);
    }

    // Cookie present — validate the actual session by calling the auth endpoint.
    // This catches stale or revoked tokens that would otherwise bypass the cookie-
    // existence check above and reach ProtectedLayout, where x-pathname header
    // forwarding is unreliable in the Next.js 15 dev server / Docker environment.
    //
    // /api/auth is excluded from the middleware matcher so this fetch does not
    // recurse through middleware. Stays in Edge runtime — no Node.js imports needed.
    try {
      const sessionUrl = buildGetSessionUrl(request);
      const sessionRes = await fetch(sessionUrl.href, {
        headers: {
          Cookie: request.headers.get('cookie') ?? '',
          Origin: request.nextUrl.origin,
        },
      });
      const sessionData = sessionRes.ok
        ? (await sessionRes.json() as { user?: unknown } | null)
        : null;
      if (!sessionData?.user) {
        return redirectToLogin(request, pathname);
      }
    } catch {
      // Session probe failed (network, cold start). Do not next() into protected
      // RSC — ProtectedLayout would redirect with callbackUrl=/ when x-pathname
      // is missing. Send user to login with the correct callback instead.
      return redirectToLogin(request, pathname);
    }
  }

  // Pass through — no locale rewriting needed (app has no [locale] segment).
  // getRequestConfig in src/i18n/request.ts falls back to defaultLocale: 'en'.
  const response = NextResponse.next();
  response.headers.set('x-middleware-request-x-pathname', pathname);
  return response;
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
