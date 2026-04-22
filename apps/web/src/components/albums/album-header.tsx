import Link from 'next/link';
import { AppImage } from '@/components/ui/image';
import type { AlbumDetailDTO } from '@nawhas/types';

interface AlbumHeaderProps {
  album: AlbumDetailDTO;
}

/**
 * Album detail header: cover art, title, linked reciter name, year, and track count.
 *
 * Hero background uses the album's precomputed vibrantColor (see
 * apps/web/scripts/compute-vibrant-colors.ts). Falls back to --color-muted
 * when no color is available, in which case semantic text colors apply so
 * contrast remains legible in both themes. On a vibrant (dark-muted) color
 * background, text is forced to white/white-alpha for reliable contrast.
 *
 * Server Component — no interactivity required.
 */
export function AlbumHeader({ album }: AlbumHeaderProps): React.JSX.Element {
  const trackCount = album.tracks.length;
  const hasVibrant = Boolean(album.vibrantColor);

  return (
    <div
      className={`flex flex-col items-center gap-6 rounded-xl px-6 py-8 sm:flex-row sm:items-start sm:px-10 sm:py-10 ${
        hasVibrant ? 'text-white' : 'text-foreground'
      }`}
      style={{
        backgroundColor: album.vibrantColor ?? 'var(--color-muted)',
      }}
    >
      {/* Cover art */}
      <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-56 sm:w-56">
        {album.artworkUrl ? (
          <AppImage
            src={album.artworkUrl}
            alt={`${album.title} album cover`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 640px) 192px, 224px"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
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

      {/* Metadata */}
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1
          className={`font-slab text-[2rem] md:text-[2.75rem] font-bold tracking-tight ${
            hasVibrant ? 'text-white' : 'text-foreground'
          }`}
        >
          {album.title}
        </h1>

        <Link
          href={`/reciters/${album.reciterSlug}`}
          className={`text-base font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded ${
            hasVibrant
              ? 'text-white/80 hover:text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {album.reciterName}
        </Link>

        <div
          className={`flex flex-wrap justify-center gap-3 text-sm sm:justify-start ${
            hasVibrant ? 'text-white/70' : 'text-muted-foreground'
          }`}
        >
          {album.year && <span>{album.year}</span>}
          <span>
            {trackCount === 0
              ? 'No tracks'
              : trackCount === 1
                ? '1 track'
                : `${trackCount} tracks`}
          </span>
        </div>
      </div>
    </div>
  );
}
