import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
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
    const t = await getTranslations('contribute.access');
    return (
      <main id="main-content" className="flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-3 font-serif text-4xl font-medium text-[var(--text)]">
            {t('heading')}
          </h1>
          <p className="mb-6 text-sm text-[var(--text-dim)]">
            {t('description')}
          </p>
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 text-left">
            <p className="mb-2 text-sm font-medium text-[var(--text)]">
              {t('howToHeading')}
            </p>
            <p className="text-sm text-[var(--text-dim)]">
              {t('howToDescription')}
            </p>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            {t('backToHome')}
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
