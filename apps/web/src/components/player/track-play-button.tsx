'use client';

import type { TrackDTO } from '@nawhas/types';
import {
  usePlayerStore,
  selectCurrentTrack,
  selectIsPlaying,
} from '@/store/player';

function PlayIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

interface TrackPlayButtonProps {
  track: TrackDTO;
  trackNumber: number;
}

/**
 * Play/pause toggle button for a track list row.
 *
 * At rest: shows the track number.
 * On hover (via CSS group-hover on parent <li class="group">): shows play icon.
 * When this track is active and playing: always shows pause icon.
 *
 * Client Component — reads from and dispatches to Zustand player store.
 */
export function TrackPlayButton({ track, trackNumber }: TrackPlayButtonProps): React.JSX.Element {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore(selectIsPlaying);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);

  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  function handleClick(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentlyPlaying) {
      pause();
    } else if (isActive) {
      resume();
    } else {
      play(track);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900"
      aria-label={isCurrentlyPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
    >
      {isCurrentlyPlaying ? (
        <PauseIcon />
      ) : (
        <>
          <span
            aria-hidden="true"
            className="tabular-nums text-sm text-gray-400 group-hover:hidden"
          >
            {trackNumber}
          </span>
          <span aria-hidden="true" className="hidden group-hover:block">
            <PlayIcon />
          </span>
        </>
      )}
    </button>
  );
}
