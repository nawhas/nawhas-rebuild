import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations('mod.audit');

  return (
    <div>
      <h2 className="mb-6 font-serif text-[28px] font-medium text-[var(--text)]">
        {t('heading')}
      </h2>

      <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)]">
        <table className="w-full table-fixed">
          <caption className="sr-only">{t('tableCaption')}</caption>
          <thead>
            <tr>
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
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-[var(--text-dim)]">
                  {t('empty')}
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
    <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
      <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">{entry.action}</td>
      <td className="px-4 py-3 text-xs text-[var(--text-dim)]">
        {entry.targetType ?? '—'}
      </td>
      <td className="max-w-0 truncate px-4 py-3 text-xs text-[var(--text-dim)]">
        {entry.targetId ?? '—'}
      </td>
      <td className="px-4 py-3 text-right text-xs text-[var(--text-dim)]">
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
