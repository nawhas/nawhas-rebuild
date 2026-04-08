import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Moderation Overview',
  description: 'Moderation dashboard overview.',
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /mod — Moderation overview.
 *
 * Shows pending queue count and recent audit log activity.
 * Role guard is enforced by the /mod layout.
 */
export default async function ModOverviewPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const [queue, auditLog] = await Promise.all([
    caller.moderation.queue({ limit: 5 }),
    caller.moderation.auditLog({ limit: 10 }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Moderation Overview</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {queue.items.length}
            {queue.nextCursor ? '+' : ''}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pending submissions</p>
          <Link
            href="/mod/queue"
            className="mt-2 inline-block text-xs text-gray-400 hover:text-gray-600 hover:underline focus:outline-none focus:underline dark:text-gray-500 dark:hover:text-gray-300"
          >
            View queue →
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <section aria-label="Recent moderation activity">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent activity</h2>
          <Link
            href="/mod/audit"
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline focus:outline-none focus:underline dark:text-gray-400 dark:hover:text-gray-300"
          >
            View all →
          </Link>
        </div>

        {auditLog.items.length === 0 ? (
          <p className="py-4 text-sm text-gray-400 dark:text-gray-500">No activity yet.</p>
        ) : (
          <ol
            aria-label="Recent audit log entries"
            className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800"
          >
            {auditLog.items.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm font-mono text-gray-700 dark:text-gray-300">
                  {entry.action}
                </span>
                <time
                  dateTime={String(entry.createdAt)}
                  className="shrink-0 text-xs text-gray-400 dark:text-gray-500"
                  title={new Date(entry.createdAt).toLocaleString()}
                >
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
