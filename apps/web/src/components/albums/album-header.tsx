import Link from 'next/link';
import { CoverArt } from '@nawhas/ui';
import type { AlbumDetailDTO } from '@nawhas/types';

interface AlbumHeaderProps {
  album: AlbumDetailDTO;
}

/**
 * Album detail header: large cover art, Fraunces title, linked reciter,
 * year, track count.
 *
 * Server Component — no interactivity required.
 */
export function AlbumHeader({ album }: AlbumHeaderProps): React.JSX.Element {
  const trackCount = album.tracks.length;
  const trackCountLabel =
    trackCount === 0 ? 'No tracks' :
    trackCount === 1 ? '1 track' :
    `${trackCount} tracks`;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 sm:flex-row sm:items-start">
      <div className="aspect-square w-full max-w-[360px] shrink-0 overflow-hidden rounded-xl">
        <CoverArt
          slug={album.slug}
          artworkUrl={album.artworkUrl}
          label={album.title}
          size="lg"
          fluid
        />
      </div>
      <div className="flex flex-col gap-3 text-center sm:text-left">
        <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)] md:text-[3.5rem]">
          {album.title}
        </h1>
        <Link
          href={`/reciters/${album.reciterSlug}`}
          className="text-base font-medium text-[var(--text-dim)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded"
        >
          {album.reciterName}
        </Link>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-[var(--text-faint)] sm:justify-start">
          {album.year && <span>{album.year}</span>}
          <span>{trackCountLabel}</span>
        </div>
      </div>
    </div>
  );
}
