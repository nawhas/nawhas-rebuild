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
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t('heading')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('intro')}
      </p>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('columnUser')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('columnRole')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('columnChangeRole')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              <>
                {items.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
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
