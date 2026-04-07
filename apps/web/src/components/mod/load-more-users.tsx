'use client';

import { useState, useTransition } from 'react';
import { fetchUsersPage } from '@/server/actions/moderation-fetch';
import { RoleBadge } from '@/components/mod/badges';
import { RoleButton } from '@/components/mod/role-button';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface LoadMoreUsersProps {
  initialCursor: string;
  search?: string;
}

/**
 * Client component that loads additional user pages on demand.
 */
export function LoadMoreUsers({ initialCursor, search }: LoadMoreUsersProps): React.JSX.Element {
  const [items, setItems] = useState<User[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLoadMore(): void {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await fetchUsersPage(cursor, search);
        setItems((prev) => [...prev, ...result.items]);
        setCursor(result.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load more.');
      }
    });
  }

  return (
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
      {error && (
        <tr>
          <td colSpan={3} className="px-4 py-3">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </td>
        </tr>
      )}
      {cursor && (
        <tr>
          <td colSpan={3} className="px-4 py-4 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {isPending ? 'Loading…' : 'Load more'}
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
