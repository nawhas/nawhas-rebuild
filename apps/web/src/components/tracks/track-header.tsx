import Link from 'next/link';
import type { TrackWithRelationsDTO } from '@nawhas/types';

/** Format a duration in seconds as m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface TrackHeaderProps {
  track: TrackWithRelationsDTO;
}

/**
 * Track detail header: title, linked reciter name, linked album title,
 * year, track number, and duration.
 *
 * Server Component — no interactivity required.
 */
export function TrackHeader({ track }: TrackHeaderProps): React.JSX.Element {
  const linkClass =
    'font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded';

  return (
    <header className="py-8">
      <h1 className="font-serif text-[2rem] md:text-[2.75rem] font-bold tracking-tight text-foreground">
        {track.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
