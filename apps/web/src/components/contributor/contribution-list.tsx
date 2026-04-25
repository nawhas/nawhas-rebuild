import * as React from 'react';
import Link from 'next/link';
import type { SubmissionDTO } from '@nawhas/types';

/**
 * Shared submission-list rendering used by /dashboard tabs.
 * Empty state copy is configurable so each tab can say something specific
 * ("No submissions yet" vs "No pending submissions").
 */
export function ContributionList({
  items,
  emptyState,
}: {
  items: SubmissionDTO[];
  emptyState: string;
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center text-sm text-[var(--text-dim)]">
        {emptyState}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/profile/contributions/${item.id}`}
            className="block rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-4 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            <div className="text-sm font-medium text-[var(--text)] capitalize">
              {item.action} {item.type}
            </div>
            <div className="mt-1 text-xs text-[var(--text-dim)] capitalize">
              Status: {item.status.replace(/_/g, ' ')}
            </div>
            <div className="mt-2 text-xs text-[var(--text-faint)]">
              {new Date(item.createdAt).toLocaleString()}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
