'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@nawhas/ui/components/card';
import { fetchQueuePage } from '@/server/actions/moderation-fetch';
import { SubmissionTypeBadge, SubmissionActionBadge, SubmissionStatusBadge } from '@/components/mod/badges';
import type { SubmissionDTO } from '@nawhas/types';

interface LoadMoreQueueProps {
  initialCursor: string;
}

/**
 * Client component that loads additional queue pages on demand.
 */
export function LoadMoreQueue({ initialCursor }: LoadMoreQueueProps): React.JSX.Element {
  const t = useTranslations('mod.queue');
  const tHistory = useTranslations('contribute.history');
  const [items, setItems] = useState<SubmissionDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLoadMore(): void {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await fetchQueuePage(cursor);
        setItems((prev) => [...prev, ...result.items]);
        setCursor(result.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadFailed'));
      }
    });
  }

  return (
    <>
      {items.map((submission) => (
        <li key={submission.id}>
          <Card className="overflow-hidden">
            <Link
              href={`/mod/submissions/${submission.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-medium text-foreground">
                  {getLabel(submission, tHistory)}
                </span>
                <div className="flex items-center gap-2">
                  <SubmissionTypeBadge type={submission.type} />
                  <SubmissionActionBadge action={submission.action} />
                  <SubmissionStatusBadge status={submission.status} />
                </div>
              </div>
              <time
                dateTime={String(submission.createdAt)}
                className="shrink-0 text-xs text-muted-foreground"
                title={new Date(submission.createdAt).toLocaleString()}
              >
                {new Date(submission.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </Link>
          </Card>
        </li>
      ))}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      {cursor && (
        <li className="mt-4 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            aria-busy={isPending}
            className="rounded-md border border-border px-5 py-2 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50"
          >
            {isPending ? t('loadingMore') : t('loadMore')}
          </button>
        </li>
      )}
    </>
  );
}

function getLabel(
  submission: SubmissionDTO,
  t: (key: string) => string,
): string {
  const data = submission.data as unknown as Record<string, unknown>;
  if (submission.type === 'reciter') return (data.name as string) ?? t('unnamedReciter');
  if (submission.type === 'album') return (data.title as string) ?? t('unnamedAlbum');
  if (submission.type === 'track') return (data.title as string) ?? t('unnamedTrack');
  return submission.id;
}
