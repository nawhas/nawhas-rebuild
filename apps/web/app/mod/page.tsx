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
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t('heading')}</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-3xl font-bold text-foreground">
            {queue.items.length}
            {queue.nextCursor ? '+' : ''}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('pendingSubmissions')}</p>
          <Link
            href="/mod/queue"
            className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:underline"
          >
            {t('viewQueue')}
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <section aria-label={t('recentActivitySectionLabel')}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t('recentActivityHeading')}</h2>
          <Link
            href="/mod/audit"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:underline"
          >
            {t('viewAll')}
          </Link>
        </div>

        {auditLog.items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t('noActivity')}</p>
        ) : (
          <ol
            aria-label={t('recentActivityListLabel')}
            className="divide-y divide-border rounded-lg border border-border bg-card"
          >
            {auditLog.items.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm font-mono text-foreground">
                  {entry.action}
                </span>
                <time
                  dateTime={String(entry.createdAt)}
                  className="shrink-0 text-xs text-muted-foreground"
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
