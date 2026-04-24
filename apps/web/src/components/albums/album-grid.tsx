'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CoverArt } from '@nawhas/ui';
import type { AlbumListItemDTO } from '@nawhas/types';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreAlbums } from '@/server/actions/albums';

interface AlbumListCardProps {
  album: AlbumListItemDTO;
}

/**
 * Album card for the albums listing page.
 * Shows cover art, title, reciter name, year, and track count.
 *
 * Differs from `<AlbumCard>` (cards/album-card.tsx) by surfacing the extra
 * `AlbumListItemDTO` fields (reciter name + track count) needed only on the
 * dedicated /albums grid. Visual surface mirrors the canonical AlbumCard so
 * cross-route coherence holds (same card chrome + CoverArt primitive).
 *
 * Server Component safe (no hooks), rendered inside a client grid.
 */
function AlbumListCard({ album }: AlbumListCardProps): React.JSX.Element {
  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={`View album: ${album.title} by ${album.reciterName}${album.year ? `, ${album.year}` : ''}`}
    >
      <div className="aspect-square w-full overflow-hidden rounded-xl">
        <CoverArt
          slug={album.slug}
          artworkUrl={album.artworkUrl}
          label={album.title}
          size="md"
          fluid
        />
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <span className="line-clamp-2 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
          {album.title}
        </span>
        <span className="text-xs text-[var(--text-dim)]">{album.reciterName}</span>
        <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
          {album.year && <span>{album.year}</span>}
          {album.year && album.trackCount > 0 && <span aria-hidden="true">·</span>}
          {album.trackCount > 0 && (
            <span>
              {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

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
            <AlbumListCard album={album} />
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
