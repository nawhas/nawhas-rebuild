import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';

// Mark as dynamic since we use headers() for auth checks on every request
export const dynamic = 'force-dynamic';

/**
 * Contribute layout — /contribute/*
 *
 * Server Component.
 * - Unauthenticated users are redirected to /login.
 * - Authenticated users without contributor or moderator role see an
 *   "Apply for Contributor Access" message instead of the page content.
 */
export default async function ContributeLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  if (!sessionData) {
    const callbackPath = reqHeaders.get('x-pathname') ?? '/contribute';
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const role = (sessionData.user as { role?: string }).role;
  const hasAccess = role === 'contributor' || role === 'moderator';

  if (!hasAccess) {
    return (
      <main id="main-content" className="flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold text-foreground">
            Contributor Access Required
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            You need contributor access to submit content on Nawhas.com. Contributors help keep the
            library accurate and complete.
          </p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-left dark:border-blue-800 dark:bg-blue-950">
            <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
              How to become a contributor
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Contact a moderator to have your account promoted to contributor status. Once promoted,
              you can submit new reciters, albums, and tracks for review.
            </p>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
