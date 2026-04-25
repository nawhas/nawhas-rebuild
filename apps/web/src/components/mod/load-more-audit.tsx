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
            <p role="alert" className="text-sm text-[var(--color-error-500)]">{error}</p>
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

function AuditRow({ entry }: { entry: AuditLogDTO }): React.JSX.Element {
  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
      <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">{entry.action}</td>
      <td className="px-4 py-3 text-xs text-[var(--text-dim)]">
        {entry.targetType ?? '—'}
      </td>
      <td className="max-w-xs truncate px-4 py-3 text-xs text-[var(--text-dim)]">
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
