import type { Metadata } from 'next';
import { headers } from 'next/headers';
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

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Promote users to contributor. Moderator promotion is ops-only.
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                User
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Change role
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              <>
                {items.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
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
