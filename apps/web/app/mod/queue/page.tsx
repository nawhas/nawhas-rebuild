import type { Metadata } from 'next';
import { headers } from 'next/headers';
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

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Moderation Queue</h1>

      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">The queue is empty. Nothing to review.</p>
        </div>
      ) : (
        <>
          <ol aria-label="Pending submissions" className="space-y-3">
            {items.map((submission) => (
              <SubmissionRow key={submission.id} submission={submission} />
            ))}
          </ol>
          {nextCursor && <LoadMoreQueue initialCursor={nextCursor} />}
        </>
      )}
    </div>
  );
}

