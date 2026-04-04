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
 * Server Component — pure presentation, no interactivity.
 */
export function PopularTracks({ tracks }: PopularTracksProps): React.JSX.Element | null {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="popular-tracks-heading">
      <h2
        id="popular-tracks-heading"
        className="mb-6 text-xl font-semibold text-gray-900 dark:text-white"
      >
        Popular Tracks
      </h2>

      <ol
        aria-label="Popular tracks"
        className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700"
      >
        {tracks.map((track, index) => (
          <li
            key={track.id}
            className="flex items-center gap-4 px-4 py-3"
          >
            {/* Track number */}
            <span
              aria-hidden="true"
              className="w-6 shrink-0 text-center text-sm text-gray-400 dark:text-gray-600"
            >
              {index + 1}
            </span>

            {/* Track title */}
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
              {track.title}
            </span>

            {/* Duration */}
            {track.duration != null && (
              <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                <span className="sr-only">Duration: </span>
                {formatDuration(track.duration)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
