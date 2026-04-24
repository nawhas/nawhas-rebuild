import type { TrackDTO } from '@nawhas/types';
import { TrackListRow } from './track-list-row';

interface TrackListProps {
  tracks: TrackDTO[];
  reciterSlug: string;
  albumSlug: string;
}

/**
 * Ordered track list for the album detail page.
 *
 * Server Component — data is passed as props from the album page.
 * Each row is rendered via the TrackListRow client wrapper, which
 * threads the per-row TrackPlayButton + add-to-queue affordances
 * around the canonical <TrackRow> primitive from @nawhas/ui.
 *
 * Borders between rows come from `divide-y` on this <ol> — TrackRow
 * itself is borderless (consumers own the divider style so it works
 * regardless of how rows are wrapped).
 */
export function TrackList({ tracks, reciterSlug, albumSlug }: TrackListProps): React.JSX.Element {
  return (
    <section aria-labelledby="track-list-heading">
      <h2
        id="track-list-heading"
        className="mb-6 font-serif text-2xl font-medium text-[var(--text)]"
      >
        Tracks
      </h2>

      {tracks.length === 0 ? (
        <p className="text-[var(--text-dim)]">No tracks available yet.</p>
      ) : (
        <ol
          aria-label={`${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
          className="flex flex-col divide-y divide-[var(--border)]"
        >
          {tracks.map((track, index) => (
            <TrackListRow
              key={track.id}
              track={track}
              trackNumber={track.trackNumber ?? index + 1}
              href={`/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${track.slug}`}
              reciterSlug={reciterSlug}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
