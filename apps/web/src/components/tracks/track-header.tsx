import Link from 'next/link';
import type { TrackWithRelationsDTO } from '@nawhas/types';
import { formatDuration } from '@nawhas/ui/lib/format-duration';

interface TrackHeaderProps {
  track: TrackWithRelationsDTO;
}

/**
 * Track detail header: Fraunces serif title, breadcrumb-style reciter / album
 * links, year + track number + duration metadata.
 *
 * Server Component — no interactivity required.
 */
export function TrackHeader({ track }: TrackHeaderProps): React.JSX.Element {
  const linkClass =
    'font-medium text-[var(--text-dim)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded transition-colors';

  return (
    <header className="py-8">
      <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)] md:text-[3.5rem]">
        {track.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-faint)]">
        <Link href={`/reciters/${track.reciter.slug}`} className={linkClass}>
          {track.reciter.name}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href={`/albums/${track.album.slug}`} className={linkClass}>
          {track.album.title}
        </Link>

        {track.album.year != null && (
          <>
            <span aria-hidden="true">·</span>
            <span>{track.album.year}</span>
          </>
        )}

        {track.trackNumber != null && (
          <>
            <span aria-hidden="true">·</span>
            <span>Track {track.trackNumber}</span>
          </>
        )}

        {track.duration != null && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={`PT${Math.floor(track.duration / 60)}M${track.duration % 60}S`}>
              {formatDuration(track.duration)}
            </time>
          </>
        )}
      </div>
    </header>
  );
}
