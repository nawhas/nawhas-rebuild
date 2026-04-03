'use client';

import { useState, useTransition } from 'react';
import type { ReciterDTO } from '@nawhas/types';
import { ReciterCard } from '@/components/cards/reciter-card';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreReciters } from '@/server/actions/reciters';

interface ReciterGridProps {
  initialItems: ReciterDTO[];
  initialCursor: string | null;
}

/**
 * Paginated grid of reciter cards.
 *
 * Client Component — manages accumulated items and cursor state so the
 * "Load More" button can append pages without a full page reload.
 */
export function ReciterGrid({ initialItems, initialCursor }: ReciterGridProps): React.JSX.Element {
  const [items, setItems] = useState<ReciterDTO[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore(): void {
    if (!cursor) return;

    startTransition(async () => {
      const result = await fetchMoreReciters(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <div>
      <ul
        role="list"
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        aria-label="Reciters"
      >
        {items.map((reciter) => (
          <li key={reciter.id}>
            <ReciterCard reciter={reciter} />
          </li>
        ))}
      </ul>

      {cursor !== null && (
        <div className="mt-10 flex justify-center">
          <LoadMore onLoadMore={handleLoadMore} isLoading={isPending} />
        </div>
      )}
    </div>
  );
}
