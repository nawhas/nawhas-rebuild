import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * Protected route group layout.
 *
 * Server Component — performs a server-side auth check on every request.
 * Unauthenticated visitors are redirected to /login with a callbackUrl.
 *
 * All routes inside (protected)/ inherit this layout and are auth-gated.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  if (!sessionData) {
    // Redirect to login. Middleware already injects callbackUrl for edge cases;
    // this server-side guard provides a safe fallback for direct RSC invocations.
    const nextUrl = reqHeaders.get('next-url');
    const callbackPath = nextUrl ? new URL(nextUrl).pathname : '/';
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  return <>{children}</>;
}
