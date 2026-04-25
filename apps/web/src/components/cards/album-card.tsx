import Link from 'next/link';
import { CoverArt } from '@nawhas/ui';
import type { AlbumDTO, AlbumListItemDTO } from '@nawhas/types';

interface AlbumCardProps {
  /**
   * Album shape. Pass an `AlbumDTO` for the bare card (home/recent-albums,
   * reciter discography). Pass an `AlbumListItemDTO` to also render the
   * reciter name and track-count meta line (/albums listing).
   */
  album: AlbumDTO | AlbumListItemDTO;
}

/**
 * Album card primitive — cover art, title, and meta line linking to the
 * album detail page. The meta line auto-extends when the album object
 * carries reciter + track-count data.
 *
 * Server Component — no interactivity.
 */
export function AlbumCard({ album }: AlbumCardProps): React.JSX.Element {
  const reciterName = 'reciterName' in album ? album.reciterName : undefined;
  const trackCount = 'trackCount' in album ? album.trackCount : undefined;

  const ariaLabel = reciterName
    ? `View album: ${album.title} by ${reciterName}${album.year ? `, ${album.year}` : ''}`
    : `View album: ${album.title}${album.year ? `, ${album.year}` : ''}`;

  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      aria-label={ariaLabel}
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
        {reciterName && (
          <span className="text-xs text-[var(--text-dim)]">{reciterName}</span>
        )}
        {(album.year != null || (trackCount != null && trackCount > 0)) && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
            {album.year != null && <span>{album.year}</span>}
            {album.year != null && trackCount != null && trackCount > 0 && (
              <span aria-hidden="true">·</span>
            )}
            {trackCount != null && trackCount > 0 && (
              <span>
                {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
