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
 * Port the Node server listens on for loopback fetches from Edge middleware.
 * nextUrl.port is empty when the browser uses the scheme default (e.g. :80 / :443 omitted).
 */
function resolveLoopbackPort(request: NextRequest): string {
  const u = request.nextUrl;
  if (u.port) return u.port;

  const xfPort = request.headers.get('x-forwarded-port');
  if (xfPort && /^\d+$/.test(xfPort.trim())) return xfPort.trim();

  const host = request.headers.get('host') ?? '';
  const bracketedIpv6Port = host.match(/^\[[^\]]+]:(\d+)$/);
  if (bracketedIpv6Port?.[1]) return bracketedIpv6Port[1];

  const lastColon = host.lastIndexOf(':');
  if (lastColon > 0 && host.indexOf(':') === lastColon) {
    const maybePort = host.slice(lastColon + 1);
    if (/^\d+$/.test(maybePort)) return maybePort;
  }

  const envPort =
    typeof process !== 'undefined'
      ? (process.env['INTERNAL_LISTEN_PORT'] ?? process.env['PORT'])
      : undefined;
  if (envPort && /^\d+$/.test(envPort)) return envPort;

  return u.protocol === 'https:' ? '443' : '80';
}

/**
 * Resolve get-session via loopback so Edge middleware does not depend on Docker DNS
 * for the public hostname (e.g. nawhas.test). Preserve Host / Origin so Better Auth
 * sees the same virtual host as the browser.
 */
function buildGetSessionUrl(request: NextRequest): URL {
  const loopbackPort = resolveLoopbackPort(request);
  return new URL('/api/auth/get-session', `http://127.0.0.1:${loopbackPort}`);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  if (isProtected) {
    // Better Auth stores the session token in a cookie named 'better-auth.session_token'
    const sessionToken = request.cookies.get('better-auth.session_token');

    if (!sessionToken?.value) {
      return redirectToLogin(request, pathname);
    }

    // Cookie present — validate the actual session by calling the auth endpoint.
    // This catches stale or revoked tokens that would otherwise bypass the cookie-
    // existence check above and reach ProtectedLayout.
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
        ? ((await sessionRes.json()) as { user?: unknown } | null)
        : null;
      if (!sessionData?.user) {
        return redirectToLogin(request, pathname);
      }
    } catch {
      // Session probe failed (network, cold start). Do not next() into protected RSC.
      return redirectToLogin(request, pathname);
    }
  }

  // Next.js prefixes keys here with x-middleware-request- internally; use x-pathname
  // so headers().get('x-pathname') works in RSC layouts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
