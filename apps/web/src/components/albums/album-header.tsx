import type { CSSProperties } from 'react';
import Link from 'next/link';
import { AppImage } from '@/components/ui/image';
import type { AlbumDetailDTO } from '@nawhas/types';
import { getPlaceholderStyle, PLACEHOLDER_CLASSES } from '@/lib/placeholder-color';

interface AlbumHeaderProps {
  album: AlbumDetailDTO;
}

/**
 * Album detail header: cover art, title, linked reciter name, year, and track count.
 *
 * Hero tinting:
 *   - When the album has a precomputed `vibrantColor` (DarkMuted extracted by
 *     scripts/compute-vibrant-colors.ts), use that hex as the dark-mode bg.
 *     In light mode, derive a pastel by mixing ~18% of the vibrant with white
 *     via CSS `color-mix(in oklab, ...)`, so the hero feels tied to the album
 *     art without being heavy. Title and subtitle swap between the vibrant
 *     itself (dark text on the pastel) and white (on the dark vibrant).
 *   - When `vibrantColor` is null we fall through to semantic `bg-muted` with
 *     `text-foreground`, which already flips correctly.
 *
 * Server Component — no interactivity required.
 */
export function AlbumHeader({ album }: AlbumHeaderProps): React.JSX.Element {
  const trackCount = album.tracks.length;
  const hasVibrant = Boolean(album.vibrantColor);

  const heroStyle: CSSProperties | undefined = hasVibrant
    ? ({ '--vibrant': album.vibrantColor } as CSSProperties)
    : undefined;

  // When we have a vibrant hex we emit arbitrary Tailwind utilities that
  // resolve the --vibrant CSS var at render time; dark: flips to the raw
  // vibrant, light mode shows the pastel mix. Without a vibrant we use
  // the plain semantic ramp.
  const heroContainerClass = hasVibrant
    ? 'bg-[color-mix(in_oklab,var(--vibrant)_18%,white)] text-[var(--vibrant)] dark:bg-[var(--vibrant)] dark:text-white'
    : 'bg-muted text-foreground';

  const titleClass = hasVibrant
    ? 'font-serif text-[2rem] md:text-[2.75rem] font-bold tracking-tight text-[var(--vibrant)] dark:text-white'
    : 'font-serif text-[2rem] md:text-[2.75rem] font-bold tracking-tight text-foreground';

  const reciterLinkClass = hasVibrant
    ? 'text-base font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded text-[var(--vibrant)]/80 hover:text-[var(--vibrant)] dark:text-white/80 dark:hover:text-white'
    : 'text-base font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded text-muted-foreground hover:text-foreground';

  const metaClass = hasVibrant
    ? 'flex flex-wrap justify-center gap-3 text-sm sm:justify-start text-[var(--vibrant)]/70 dark:text-white/70'
    : 'flex flex-wrap justify-center gap-3 text-sm sm:justify-start text-muted-foreground';

  return (
    <div
      className={`flex flex-col items-center gap-6 rounded-xl px-6 py-8 sm:flex-row sm:items-start sm:px-10 sm:py-10 ${heroContainerClass}`}
      style={heroStyle}
    >
      {/* Cover art — deterministic tinted placeholder when no artwork. */}
      <div
        style={album.artworkUrl ? undefined : getPlaceholderStyle(album.slug)}
        className={`relative h-48 w-48 shrink-0 overflow-hidden rounded-lg sm:h-56 sm:w-56 ${album.artworkUrl ? 'bg-muted' : PLACEHOLDER_CLASSES}`}
      >
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
            className="flex h-full w-full items-center justify-center"
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
        <h1 className={titleClass}>{album.title}</h1>

        <Link href={`/reciters/${album.reciterSlug}`} className={reciterLinkClass}>
          {album.reciterName}
        </Link>

        <div className={metaClass}>
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
