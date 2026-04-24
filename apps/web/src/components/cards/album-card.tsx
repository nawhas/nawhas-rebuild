import Link from 'next/link';
import { CoverArt } from '@nawhas/ui';
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
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={`View album: ${album.title}${album.year ? `, ${album.year}` : ''}`}
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
        {album.year && (
          <span className="text-xs text-[var(--text-faint)]">{album.year}</span>
        )}
      </div>
    </Link>
  );
}
