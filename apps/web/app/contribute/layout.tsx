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
          <h1 className="mb-3 text-2xl font-bold text-foreground">
            {t('heading')}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {t('description')}
          </p>
          <div className="rounded-lg border border-info-200 bg-info-50 px-5 py-4 text-left dark:border-info-800 dark:bg-info-950">
            <p className="mb-2 text-sm font-medium text-info-900 dark:text-info-100">
              {t('howToHeading')}
            </p>
            <p className="text-sm text-info-700 dark:text-info-300">
              {t('howToDescription')}
            </p>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:underline"
          >
            {t('backToHome')}
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
