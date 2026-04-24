import { SectionTitle } from '@nawhas/ui/components/section-title';
import type { TrackDTO } from '@nawhas/types';

interface PopularTracksProps {
  tracks: TrackDTO[];
}

/** Format a duration in seconds as m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Home page section displaying popular tracks as a numbered list.
 *
 * NOTE: TrackDTO (returned by home.getFeatured) does not include reciter or
 * album metadata, so this section cannot consume the canonical <TrackRow>
 * primitive (which requires reciter + reciterSlug). Token migration only —
 * the data shape would need to be enriched to TrackListItemDTO to swap in
 * <TrackRow>; deferred to a later wave when popularity metrics ship.
 *
 * Server Component — pure presentation, no interactivity.
 */
export function PopularTracks({ tracks }: PopularTracksProps): React.JSX.Element | null {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="popular-tracks-heading">
      <SectionTitle id="popular-tracks-heading">Popular Tracks</SectionTitle>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
        <ol
          aria-label="Popular tracks"
          className="divide-y divide-[var(--border)]"
        >
          {tracks.map((track, index) => (
            <li
              key={track.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              {/* Track number */}
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-center text-sm text-[var(--text-dim)]"
              >
                {index + 1}
              </span>

              {/* Track title */}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">
                {track.title}
              </span>

              {/* Duration */}
              {track.duration != null && (
                <span className="shrink-0 text-xs tabular-nums text-[var(--text-faint)]">
                  <span className="sr-only">Duration: </span>
                  {formatDuration(track.duration)}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
