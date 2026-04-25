import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { LoadMoreQueue } from '@/components/mod/load-more-queue';
import { SubmissionRow } from '@/components/mod/submission-row';

export const metadata: Metadata = buildMetadata({
  title: 'Moderation Queue',
  description: 'Review pending community submissions.',
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /mod/queue — paginated list of pending submissions.
 *
 * Server-rendered first page; LoadMore handles client-side pagination.
 */
export default async function ModQueuePage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const { items, nextCursor } = await caller.moderation.queue({ limit: 20 });
  const t = await getTranslations('mod.queue');

  return (
    <div>
      <h2 className="mb-6 font-serif text-[28px] font-medium text-[var(--text)]">
        {t('heading')}
      </h2>

      {items.length === 0 ? (
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--text-dim)]">{t('empty')}</p>
        </div>
      ) : (
        <ol aria-label={t('listLabel')} className="space-y-3">
          {items.map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} />
          ))}
          {nextCursor && <LoadMoreQueue initialCursor={nextCursor} />}
        </ol>
      )}
    </div>
  );
}
