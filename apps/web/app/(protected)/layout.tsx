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
    // Redirect to login — after sign-in the user lands back on the protected page.
    // We use a fixed path here; individual pages can append their own callbackUrl.
    redirect('/login?callbackUrl=/library/tracks');
  }

  return <>{children}</>;
}
