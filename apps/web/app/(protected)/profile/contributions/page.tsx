import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { ContributionList } from '@/components/contribute/contribution-list';

export const metadata: Metadata = buildMetadata({
  title: 'My Contributions',
  description: 'Track your submission history.',
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /profile/contributions — Contributor submission history.
 *
 * Auth guard is inherited from (protected) layout.
 * Shows paginated list of own submissions with status badges.
 * Changes-requested submissions have an inline resubmit form.
 */
export default async function ContributionsPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const { items } = await caller.submission.myHistory({ limit: 20 });
  const t = await getTranslations('contribute.history');

  return (
    <main id="main-content" className="mx-auto max-w-3xl py-10 px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-serif font-medium text-[var(--text)]">{t('pageTitle')}</h1>
        <Link
          href="/contribute"
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:underline focus:outline-none focus:underline"
        >
          {t('newSubmission')}
        </Link>
      </div>

      <ContributionList initialItems={items} />
    </main>
  );
}
