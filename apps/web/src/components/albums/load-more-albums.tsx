'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { AlbumDTO } from '@nawhas/types';
import { Button } from '@nawhas/ui/components/button';
import { AlbumCard } from '@/components/cards/album-card';
import { fetchMoreAlbumsForReciter } from '@/server/actions/albums';

interface LoadMoreAlbumsProps {
  reciterSlug: string;
  initialAlbums: AlbumDTO[];
  initialCursor: string | null;
  pageSize?: number;
}

/**
 * Reciter discography grid with "Load More" pagination.
 *
 * Client Component — accumulates albums from cursor-paginated server-action
 * calls to `album.listByReciter`. Initial page is rendered on the server.
 */
export function LoadMoreAlbums({
  reciterSlug,
  initialAlbums,
  initialCursor,
  pageSize = 12,
}: LoadMoreAlbumsProps): React.JSX.Element {
  const t = useTranslations('reciter.discography');
  const [albums, setAlbums] = useState<AlbumDTO[]>(initialAlbums);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore(): void {
    if (!cursor) return;
    startTransition(async () => {
      const result = await fetchMoreAlbumsForReciter({
        reciterSlug,
        cursor,
        limit: pageSize,
      });
      setAlbums((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <>
      <ul
        role="list"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        aria-label={`${albums.length} album${albums.length !== 1 ? 's' : ''}`}
      >
        {albums.map((album) => (
          <li key={album.id}>
            <AlbumCard album={album} />
          </li>
        ))}
      </ul>

      {cursor !== null && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? t('loadingMore') : t('loadMore')}
          </Button>
        </div>
      )}
    </>
  );
}
