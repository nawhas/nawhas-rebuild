'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { fetchAuditLogPage } from '@/server/actions/moderation-fetch';
import type { AuditLogDTO } from '@nawhas/types';

interface LoadMoreAuditProps {
  initialCursor: string;
}

/**
 * Client component that loads additional audit log pages on demand.
 */
export function LoadMoreAudit({ initialCursor }: LoadMoreAuditProps): React.JSX.Element {
  const t = useTranslations('mod.audit');
  const tQueue = useTranslations('mod.queue');
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
        setError(err instanceof Error ? err.message : t('loadFailed'));
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
            <p role="alert" className="text-sm text-destructive">{error}</p>
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
              className="rounded-md border border-border px-5 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50"
            >
              {isPending ? tQueue('loadingMore') : tQueue('loadMore')}
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

function AuditRow({ entry }: { entry: AuditLogDTO }): React.JSX.Element {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 font-mono text-xs text-foreground">{entry.action}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {entry.targetType ?? '—'}
      </td>
      <td className="px-4 py-3 max-w-xs truncate text-xs text-muted-foreground">
        {entry.targetId ?? '—'}
      </td>
      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
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
