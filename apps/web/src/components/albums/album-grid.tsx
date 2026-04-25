'use client';

import { useState, useTransition } from 'react';
import type { AlbumListItemDTO } from '@nawhas/types';
import { AlbumCard } from '@/components/cards/album-card';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreAlbums } from '@/server/actions/albums';

interface AlbumGridProps {
  initialItems: AlbumListItemDTO[];
  initialCursor: string | null;
}

/**
 * Paginated grid of album cards.
 *
 * Client Component — manages accumulated items and cursor state so the
 * "Load More" button can append pages without a full page reload.
 */
export function AlbumGrid({ initialItems, initialCursor }: AlbumGridProps): React.JSX.Element {
  const [items, setItems] = useState<AlbumListItemDTO[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore(): void {
    if (!cursor) return;

    startTransition(async () => {
      const result = await fetchMoreAlbums(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <div>
      <ul
        role="list"
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        aria-label="Albums"
      >
        {items.map((album) => (
          <li key={album.id}>
            <AlbumCard album={album} />
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
