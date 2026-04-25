import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { RoleBadge } from '@/components/mod/badges';
import { RoleButton } from '@/components/mod/role-button';
import { LoadMoreUsers } from '@/components/mod/load-more-users';

export const metadata: Metadata = buildMetadata({
  title: 'User Management',
  description: 'Manage contributor roles.',
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /mod/users — user list with role badges and promote/demote controls.
 *
 * Server-renders the first page; LoadMoreUsers handles additional pages.
 * Search is not wired to URL params for M6 (no form submission).
 */
export default async function ModUsersPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const { items, nextCursor } = await caller.moderation.users({ limit: 20 });
  const t = await getTranslations('mod.users');

  return (
    <div>
      <h2 className="mb-2 font-serif text-[28px] font-medium text-[var(--text)]">
        {t('heading')}
      </h2>
      <p className="mb-6 text-sm text-[var(--text-dim)]">
        {t('intro')}
      </p>

      <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)]">
        <table className="w-full">
          <caption className="sr-only">{t('tableCaption')}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b border-[var(--border-strong)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--text-dim)]"
              >
                {t('columnUser')}
              </th>
              <th
                scope="col"
                className="border-b border-[var(--border-strong)] px-4 py-3 text-left text-[13px] font-semibold text-[var(--text-dim)]"
              >
                {t('columnRole')}
              </th>
              <th
                scope="col"
                className="border-b border-[var(--border-strong)] px-4 py-3 text-right text-[13px] font-semibold text-[var(--text-dim)]"
              >
                {t('columnChangeRole')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-[var(--text-dim)]">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              <>
                {items.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[var(--text)]">{user.name}</p>
                      <p className="text-xs text-[var(--text-faint)]">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RoleButton userId={user.id} currentRole={user.role} />
                    </td>
                  </tr>
                ))}
                {nextCursor && <LoadMoreUsers initialCursor={nextCursor} />}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
