import type { TrackDTO } from '@nawhas/types';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { TrackListItem } from '@/components/albums/track-list-item';

interface TrackListProps {
  tracks: TrackDTO[];
  reciterSlug: string;
  albumSlug: string;
}

/**
 * Ordered track list for the album detail page.
 *
 * Server Component — data is passed as props from the album page.
 * Each row is rendered as a TrackListItem client component to handle
 * play affordances and active-track highlighting.
 */
export function TrackList({ tracks, reciterSlug, albumSlug }: TrackListProps): React.JSX.Element {
  return (
    <section aria-labelledby="track-list-heading">
      <SectionTitle id="track-list-heading">Tracks</SectionTitle>

      {tracks.length === 0 ? (
        <p className="text-muted-foreground">No tracks available yet.</p>
      ) : (
        <ol
          aria-label={`${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
          className="divide-y divide-border rounded-lg border border-border"
        >
          {tracks.map((track, index) => {
            const trackNumber = track.trackNumber ?? index + 1;
            const href = `/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${track.slug}`;

            return (
              <TrackListItem
                key={track.id}
                track={track}
                trackNumber={trackNumber}
                href={href}
              />
            );
          })}
        </ol>
      )}
    </section>
  );
}
