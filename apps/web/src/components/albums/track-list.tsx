import Link from 'next/link';
import type { TrackDTO } from '@nawhas/types';

interface TrackListProps {
  tracks: TrackDTO[];
  reciterSlug: string;
  albumSlug: string;
}

/** Format a duration in seconds as m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Ordered track list for the album detail page.
 * Display-only in Milestone 1 — no audio playback.
 *
 * Server Component — no interactivity required.
 */
export function TrackList({ tracks, reciterSlug, albumSlug }: TrackListProps): React.JSX.Element {
  return (
    <section aria-labelledby="track-list-heading">
      <h2 id="track-list-heading" className="mb-4 text-xl font-semibold text-gray-900">
        Tracks
      </h2>

      {tracks.length === 0 ? (
        <p className="text-gray-500">No tracks available yet.</p>
      ) : (
        <ol
          aria-label={`${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
          className="divide-y divide-gray-100 rounded-lg border border-gray-200"
        >
          {tracks.map((track, index) => {
            const trackNumber = track.trackNumber ?? index + 1;
            const href = `/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${track.slug}`;

            return (
              <li key={track.id}>
                <Link
                  href={href}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900"
                  aria-label={`Track ${trackNumber}: ${track.title}${track.duration != null ? `, ${formatDuration(track.duration)}` : ''}`}
                >
                  {/* Track number */}
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 text-center text-sm tabular-nums text-gray-400"
                  >
                    {trackNumber}
                  </span>

                  {/* Track title */}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                    {track.title}
                  </span>

                  {/* Duration */}
                  {track.duration != null && (
                    <span className="shrink-0 text-xs tabular-nums text-gray-500" aria-hidden="true">
                      {formatDuration(track.duration)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
