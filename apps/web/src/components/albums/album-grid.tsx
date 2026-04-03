'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { AlbumListItemDTO } from '@nawhas/types';
import { AppImage } from '@/components/ui/image';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreAlbums } from '@/server/actions/albums';

interface AlbumListCardProps {
  album: AlbumListItemDTO;
}

/**
 * Album card for the albums listing page.
 * Shows cover art, title, reciter name, year, and track count.
 *
 * Server Component safe (no hooks), rendered inside a client grid.
 */
function AlbumListCard({ album }: AlbumListCardProps): React.JSX.Element {
  return (
    <Link
      href={`/reciters/${album.reciterSlug}/albums/${album.slug}`}
      className="group flex flex-col gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      aria-label={`View album: ${album.title} by ${album.reciterName}${album.year ? `, ${album.year}` : ''}`}
    >
      {/* Album artwork */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        {album.artworkUrl ? (
          <AppImage
            src={album.artworkUrl}
            alt={`${album.title} album cover`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Album metadata */}
      <div className="flex flex-col gap-0.5">
        <span className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-gray-700">
          {album.title}
        </span>
        <span className="text-xs text-gray-600">{album.reciterName}</span>
        <div className="flex items-center gap-2 text-xs text-gray-500">
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
