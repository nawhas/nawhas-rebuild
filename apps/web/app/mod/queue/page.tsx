import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { SubmissionTypeBadge, SubmissionActionBadge, SubmissionStatusBadge } from '@/components/mod/badges';
import { LoadMoreQueue } from '@/components/mod/load-more-queue';
import type { SubmissionDTO } from '@nawhas/types';

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

function SubmissionRow({ submission }: { submission: SubmissionDTO }): React.JSX.Element {
  const label = getSubmissionLabel(submission);

  return (
    <li className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Link
        href={`/mod/submissions/${submission.id}`}
        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-400 dark:hover:bg-gray-700"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{label}</span>
          <div className="flex items-center gap-2">
            <SubmissionTypeBadge type={submission.type} />
            <SubmissionActionBadge action={submission.action} />
            <SubmissionStatusBadge status={submission.status} />
          </div>
        </div>
        <time
          dateTime={String(submission.createdAt)}
          className="shrink-0 text-xs text-gray-400 dark:text-gray-500"
          title={new Date(submission.createdAt).toLocaleString()}
        >
          {new Date(submission.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </time>
      </Link>
    </li>
  );
}

function getSubmissionLabel(submission: SubmissionDTO): string {
  const data = submission.data as unknown as Record<string, unknown>;
  if (submission.type === 'reciter') return (data.name as string) ?? 'Unnamed reciter';
  if (submission.type === 'album') return (data.title as string) ?? 'Unnamed album';
  if (submission.type === 'track') return (data.title as string) ?? 'Unnamed track';
  return submission.id;
}
