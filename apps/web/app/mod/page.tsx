import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
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

  const t = await getTranslations('mod.overview');

  return (
    <div>
      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/mod/queue"
          className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          <p className="font-serif text-3xl font-medium text-[var(--text)]">
            {queue.items.length}
            {queue.nextCursor ? '+' : ''}
          </p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t('pendingSubmissions')}</p>
          <span className="mt-2 block text-xs text-[var(--text-faint)]">
            {t('viewQueue')} →
          </span>
        </Link>
      </div>

      {/* Recent activity */}
      <section aria-label={t('recentActivitySectionLabel')}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium text-[var(--text)]">
            {t('recentActivityHeading')}
          </h2>
          <Link
            href="/mod/audit"
            className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            {t('viewAll')}
          </Link>
        </div>

        {auditLog.items.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-dim)]">{t('noActivity')}</p>
        ) : (
          <ol
            aria-label={t('recentActivityListLabel')}
            className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)]"
          >
            {auditLog.items.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0 hover:bg-[var(--surface-2)]"
              >
                <span className="truncate font-mono text-sm text-[var(--text)]">
                  {entry.action}
                </span>
                <time
                  dateTime={String(entry.createdAt)}
                  className="shrink-0 text-xs text-[var(--text-faint)]"
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
