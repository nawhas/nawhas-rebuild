import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { LoadMoreAudit } from '@/components/mod/load-more-audit';
import { AuditFilters } from '@/components/mod/audit-filters';
import { AuditRow } from '@/components/mod/audit-row';

export const metadata: Metadata = buildMetadata({
  title: 'Audit Log',
  description: 'Moderation audit trail.',
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /mod/audit — paginated moderation audit log with filter strip.
 *
 * Server-renders the first page; LoadMoreAudit handles additional pages.
 */
export default async function ModAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    action?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }>;
}): Promise<React.JSX.Element> {
  const sp = await searchParams;
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const { items, nextCursor } = await caller.moderation.auditLog({
    limit: 20,
    ...(sp.actor ? { actor: sp.actor } : {}),
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.targetType
      ? {
          targetType: sp.targetType as
            | 'submission'
            | 'reciter'
            | 'album'
            | 'track'
            | 'user',
        }
      : {}),
    ...(sp.from ? { from: sp.from } : {}),
    ...(sp.to ? { to: sp.to } : {}),
  });
  const t = await getTranslations('mod.audit');

  return (
    <div>
      <h2 className="mb-6 font-serif text-[28px] font-medium text-[var(--text)]">
        {t('heading')}
      </h2>

      <AuditFilters
        initial={sp}
        actions={[
          'submission.applied',
          'submission.approved',
          'submission.rejected',
          'submission.changes_requested',
          'submission.notes_updated',
          'submission.withdrawn',
          'role.changed',
        ]}
      />

      <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)]">
        <table className="w-full table-fixed">
          <caption className="sr-only">{t('tableCaption')}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-8" />
              <th
                scope="col"
                className="w-2/5 border-b border-[var(--border-strong)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--text-dim)]"
              >
                {t('columnAction')}
              </th>
              <th
                scope="col"
                className="w-1/5 border-b border-[var(--border-strong)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--text-dim)]"
              >
                {t('columnTargetType')}
              </th>
              <th
                scope="col"
                className="w-1/5 border-b border-[var(--border-strong)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--text-dim)]"
              >
                {t('columnTargetId')}
              </th>
              <th
                scope="col"
                className="w-1/5 border-b border-[var(--border-strong)] px-4 py-3 text-right text-[13px] font-semibold text-[var(--text-dim)]"
              >
                {t('columnDate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--text-dim)]">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              <>
                {items.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
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
