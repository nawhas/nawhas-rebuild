'use client';

import { useState, useTransition } from 'react';
import { fetchAuditLogPage } from '@/server/actions/moderation-fetch';
import type { AuditLogDTO } from '@nawhas/types';

interface LoadMoreAuditProps {
  initialCursor: string;
}

/**
 * Client component that loads additional audit log pages on demand.
 */
export function LoadMoreAudit({ initialCursor }: LoadMoreAuditProps): React.JSX.Element {
  const [items, setItems] = useState<AuditLogDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLoadMore(): void {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await fetchAuditLogPage(cursor);
        setItems((prev) => [...prev, ...result.items]);
        setCursor(result.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load more.');
      }
    });
  }

  return (
    <>
      {items.map((entry) => (
        <AuditRow key={entry.id} entry={entry} />
      ))}
      {error && (
        <tr>
          <td colSpan={4} className="px-4 py-3">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </td>
        </tr>
      )}
      {cursor && (
        <tr>
          <td colSpan={4} className="px-4 py-4 text-center">
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

function AuditRow({ entry }: { entry: AuditLogDTO }): React.JSX.Element {
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700">
      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{entry.action}</td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        {entry.targetType ?? '—'}
      </td>
      <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-500 dark:text-gray-400">
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
