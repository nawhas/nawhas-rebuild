'use client';

import type { TrackDTO } from '@nawhas/types';
import {
  usePlayerStore,
  selectCurrentTrack,
  selectIsPlaying,
} from '@/store/player';

function PlayIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

interface TrackDetailPlayButtonProps {
  track: TrackDTO;
}

/**
 * Play/pause control for the track detail page.
 * Fills the reserved placeholder space below the track header.
 *
 * Client Component — reads from and dispatches to Zustand player store.
 */
export function TrackDetailPlayButton({ track }: TrackDetailPlayButtonProps): React.JSX.Element {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore(selectIsPlaying);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);

  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  function handleClick(): void {
    if (isCurrentlyPlaying) {
      pause();
    } else if (isActive) {
      resume();
    } else {
      play(track);
    }
  }

  const label = isCurrentlyPlaying
    ? `Pause ${track.title}`
    : `Play ${track.title}`;

  const statusText = isCurrentlyPlaying ? 'Now playing' : isActive ? 'Paused' : 'Play this track';

  return (
    <div className="mt-2 flex h-14 items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4">
      <button
        type="button"
        onClick={handleClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        aria-label={label}
      >
        {isCurrentlyPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <span aria-live="polite" className="text-sm font-medium text-gray-700">
        {statusText}
      </span>
    </div>
  );
}
