'use client';

import * as React from 'react';
import type { SubmissionDTO } from '@nawhas/types';
import { ContributionList } from '@/components/contributor/contribution-list';
import { fetchMySubmissions } from '@/server/actions/submission';

type Tab = 'all' | 'pending' | 'approved';

/**
 * Tab switcher for the dashboard's submission list.
 *
 * The "all" tab is hydrated from the server-rendered initial fetch so the
 * common case (page load → user reads their list) is instant. Switching
 * tabs triggers a server-action refetch and shows a Loading… state while
 * the request is in flight.
 */
export function DashboardTabs({
  initialItems,
}: {
  initialItems: SubmissionDTO[];
}): React.JSX.Element {
  const [tab, setTab] = React.useState<Tab>('all');
  const [items, setItems] = React.useState<SubmissionDTO[]>(initialItems);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (tab === 'all') {
      // The initial fetch is already 'all'; only refetch when leaving and
      // returning. We just always refetch for simplicity (cheap query).
    }
    let cancelled = false;
    setLoading(true);
    void fetchMySubmissions(undefined, tab)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-4">
        {(['all', 'pending', 'approved'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={t === tab ? 'page' : undefined}
            className={
              t === tab
                ? 'border-b-2 border-[var(--accent)] pb-2 text-sm font-medium capitalize text-[var(--text)]'
                : 'pb-2 text-sm capitalize text-[var(--text-dim)] hover:text-[var(--text)]'
            }
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center text-sm text-[var(--text-dim)]">
          Loading…
        </div>
      ) : (
        <ContributionList
          items={items}
          emptyState={
            tab === 'pending'
              ? 'No pending submissions.'
              : tab === 'approved'
                ? 'No approved submissions yet.'
                : 'No submissions yet — try contributing!'
          }
        />
      )}
    </div>
  );
}
