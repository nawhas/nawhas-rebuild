import Link from 'next/link';
import { AppImage } from '@/components/ui/image';
import type { AlbumDTO } from '@nawhas/types';

interface AlbumCardProps {
  album: AlbumDTO;
}

/**
 * Card displaying an album's cover art, title, and year.
 * Links to the album detail page.
 *
 * Server Component — no interactivity required.
 */
export function AlbumCard({ album }: AlbumCardProps): React.JSX.Element {
  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group flex flex-col gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      aria-label={`View album: ${album.title}${album.year ? `, ${album.year}` : ''}`}
    >
      {/* Album artwork */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {album.artworkUrl ? (
          <AppImage
            src={album.artworkUrl}
            alt={`${album.title} album cover`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-600"
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
        <span className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-300">
          {album.title}
        </span>
        {album.year && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{album.year}</span>
        )}
      </div>
    </Link>
  );
}
