import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { LoadMoreAudit } from '@/components/mod/load-more-audit';
import type { AuditLogDTO } from '@nawhas/types';

export const metadata: Metadata = buildMetadata({
  title: 'Audit Log',
  description: 'Moderation audit trail.',
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /mod/audit — paginated moderation audit log.
 *
 * Server-renders the first page; LoadMoreAudit handles additional pages.
 */
export default async function ModAuditPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const { items, nextCursor } = await caller.moderation.auditLog({ limit: 20 });

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <th
                scope="col"
                className="w-2/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Action
              </th>
              <th
                scope="col"
                className="w-1/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Target type
              </th>
              <th
                scope="col"
                className="w-1/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Target ID
              </th>
              <th
                scope="col"
                className="w-1/5 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  No audit log entries yet.
                </td>
              </tr>
            ) : (
              <>
                {items.map((entry) => (
                  <AuditTableRow key={entry.id} entry={entry} />
                ))}
                {nextCursor && <LoadMoreAudit initialCursor={nextCursor} />}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTableRow({ entry }: { entry: AuditLogDTO }): React.JSX.Element {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700">
      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{entry.action}</td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        {entry.targetType ?? '—'}
      </td>
      <td className="max-w-0 truncate px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        {entry.targetId ?? '—'}
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500">
        <time
          dateTime={String(entry.createdAt)}
          title={new Date(entry.createdAt).toLocaleString()}
        >
          {new Date(entry.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
      </td>
    </tr>
  );
}
