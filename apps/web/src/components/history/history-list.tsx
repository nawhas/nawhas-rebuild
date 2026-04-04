'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { ListenHistoryEntryDTO } from '@nawhas/types';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreHistoryEntries, clearHistory } from '@/server/actions/history';

/** Format an ISO date string as a human-readable relative/absolute label. */
function formatPlayedAt(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'just_now';
  if (diffMin < 60) return `minutes:${diffMin}`;
  if (diffHours < 24) return `hours:${diffHours}`;
  if (diffDays < 7) return `days:${diffDays}`;
  return `date:${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function ClockIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

interface HistoryListProps {
  initialItems: ListenHistoryEntryDTO[];
  initialCursor: string | null;
}

/**
 * Client Component for the paginated listening history list.
 *
 * - Maintains accumulated items and current cursor in local state.
 * - "Load More" appends the next page via Server Action.
 * - "Clear history" prompts for confirmation then clears via Server Action.
 */
export function HistoryList({
  initialItems,
  initialCursor,
}: HistoryListProps): React.JSX.Element {
  const t = useTranslations('history');
  const [items, setItems] = useState<ListenHistoryEntryDTO[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoadingMore, startLoadMore] = useTransition();
  const [isClearing, startClear] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleLoadMore(): void {
    if (!cursor) return;
    startLoadMore(async () => {
      const result = await fetchMoreHistoryEntries(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  function handleClearConfirm(): void {
    setShowConfirm(false);
    startClear(async () => {
      await clearHistory();
      setItems([]);
      setCursor(null);
    });
  }

  if (items.length === 0 && !isClearing) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600">
          <ClockIcon />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{t('emptyTitle')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('emptySubtitle')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header row with count + clear button */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {items.length === 1 ? t('trackCountSingular', { count: items.length }) : t('trackCountPlural', { count: items.length })}
          {cursor !== null ? '+' : ''}
        </p>

        {items.length > 0 && !showConfirm && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isClearing}
            className="text-sm text-red-600 hover:text-red-700 focus:outline-none focus:underline disabled:opacity-50"
          >
            {t('clearHistory')}
          </button>
        )}

        {showConfirm && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300">{t('clearConfirmPrompt')}</span>
            <button
              type="button"
              onClick={handleClearConfirm}
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1"
            >
              {t('clearConfirm')}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline dark:text-gray-400 dark:hover:text-gray-300"
            >
              {t('clearCancel')}
            </button>
          </div>
        )}
      </div>

      {/* History list */}
      <ol
        aria-label={items.length === 1 ? t('playedTracksListLabel', { count: items.length }) : t('playedTracksListLabelPlural', { count: items.length })}
        className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700"
      >
        {items.map((entry) => (
          <HistoryEntryRow key={entry.id} entry={entry} />
        ))}
      </ol>

      {cursor !== null && (
        <div className="mt-8 flex justify-center">
          <LoadMore onLoadMore={handleLoadMore} isLoading={isLoadingMore} />
        </div>
      )}
    </div>
  );
}

interface HistoryEntryRowProps {
  entry: ListenHistoryEntryDTO;
}

function HistoryEntryRow({ entry }: HistoryEntryRowProps): React.JSX.Element {
  const t = useTranslations('history');
  const { track } = entry;

  const rawLabel = formatPlayedAt(entry.playedAt);
  let timeLabel: string;
  if (rawLabel === 'just_now') {
    timeLabel = t('justNow');
  } else if (rawLabel.startsWith('minutes:')) {
    timeLabel = t('minutesAgo', { count: parseInt(rawLabel.split(':')[1]!, 10) });
  } else if (rawLabel.startsWith('hours:')) {
    timeLabel = t('hoursAgo', { count: parseInt(rawLabel.split(':')[1]!, 10) });
  } else if (rawLabel.startsWith('days:')) {
    timeLabel = t('daysAgo', { count: parseInt(rawLabel.split(':')[1]!, 10) });
  } else {
    // date: prefix — use the date string directly
    timeLabel = rawLabel.replace('date:', '');
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600">
        <ClockIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{track.title}</p>
      </div>

      <time
        dateTime={entry.playedAt}
        className="shrink-0 text-xs text-gray-400 dark:text-gray-600"
        title={new Date(entry.playedAt).toLocaleString()}
      >
        {timeLabel}
      </time>
    </li>
  );
}
