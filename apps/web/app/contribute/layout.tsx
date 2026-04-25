import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';

// Mark as dynamic since we use headers() for auth checks on every request
export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * Contribute layout — /contribute/*
 *
 * Server Component.
 * - Unauthenticated users are redirected to /login.
 * - `/contribute/apply` is reachable for role=user so they can apply.
 * - Other authenticated users without contributor or moderator role see
 *   an access-denied panel with an apply CTA (or a pending notice if
 *   they already have a pending access request).
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
    // /contribute/apply is allowed for role=user; let it render normally.
    const reqPath = reqHeaders.get('x-pathname') ?? '';
    if (reqPath.startsWith('/contribute/apply')) {
      return <>{children}</>;
    }

    const t = await getTranslations('contribute.access');
    const caller = createCaller({
      db,
      session: sessionData.session,
      user: sessionData.user,
    });
    const existing = await caller.accessRequests.getMine();

    return (
      <main id="main-content" className="flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-3 font-serif text-4xl font-medium text-[var(--text)]">
            {t('heading')}
          </h1>
          <p className="mb-6 text-sm text-[var(--text-dim)]">
            {t('description')}
          </p>
          {existing && existing.status === 'pending' ? (
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 text-left">
              <p className="mb-1 text-sm font-medium text-[var(--text)]">
                {t('pendingHeading')}
              </p>
              <p className="text-sm text-[var(--text-dim)]">
                {t('pendingDescription', {
                  date: new Date(existing.createdAt).toLocaleDateString(),
                })}
              </p>
            </div>
          ) : (
            <Link
              href="/contribute/apply"
              className="inline-block rounded-[8px] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              {t('applyCta')}
            </Link>
          )}
          <p className="mt-6">
            <Link
              href="/"
              className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              {t('backToHome')}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
