'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('mod.users');
  const tQueue = useTranslations('mod.queue');
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
        setError(err instanceof Error ? err.message : t('loadFailed'));
      }
    });
  }

  return (
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
      {error && (
        <tr>
          <td colSpan={3} className="px-4 py-3">
            <p role="alert" className="text-sm text-[var(--color-error-500)]">{error}</p>
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
              aria-busy={isPending}
              className="rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-5 py-2.5 text-sm text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50"
            >
              {isPending ? tQueue('loadingMore') : tQueue('loadMore')}
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
