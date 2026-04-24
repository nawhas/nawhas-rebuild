import type { TrackDTO } from '@nawhas/types';
import { TrackRow } from '@nawhas/ui';

interface TrackListProps {
  tracks: TrackDTO[];
  reciterSlug: string;
  albumSlug: string;
}

/**
 * Ordered track list for the album detail page.
 *
 * Server Component — data is passed as props from the album page.
 * Each row renders the canonical <TrackRow> primitive. Legacy
 * track-list-item.tsx (per-row component with custom play/highlight
 * affordances) is deprecated in favour of the shared TrackRow.
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
          className="flex flex-col"
        >
          {tracks.map((track) => (
            <li key={track.id}>
              <TrackRow
                slug={track.slug}
                title={track.title}
                reciter="" /* hidden — context is the album header */
                reciterSlug={reciterSlug}
                duration={track.duration ?? 0}
                href={`/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${track.slug}`}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
