'use client';

import { useEffect } from 'react';
import type { LyricDTO, TrackDTO } from '@nawhas/types';
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
  /** Lyrics to sync into the player store so the mobile overlay can display them. */
  lyrics?: LyricDTO[];
}

/**
 * Play/pause control for the track detail page.
 * Fills the reserved placeholder space below the track header.
 *
 * Also syncs track lyrics into the player store so the mobile overlay
 * can display them when this track is playing.
 *
 * Client Component — reads from and dispatches to Zustand player store.
 */
export function TrackDetailPlayButton({ track, lyrics }: TrackDetailPlayButtonProps): React.JSX.Element {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore(selectIsPlaying);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const setCurrentLyrics = usePlayerStore((s) => s.setCurrentLyrics);

  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  // When this track becomes the active track, populate the store with lyrics
  // so the mobile overlay can display them.
  useEffect(() => {
    if (isActive && lyrics && lyrics.length > 0) {
      setCurrentLyrics(lyrics);
    }
  }, [isActive, lyrics, setCurrentLyrics]);

  function handleClick(): void {
    if (isCurrentlyPlaying) {
      pause();
    } else if (isActive) {
      resume();
    } else {
      play(track);
      // Immediately set lyrics since play() clears them
      if (lyrics && lyrics.length > 0) {
        setCurrentLyrics(lyrics);
      }
    }
  }

  const label = isCurrentlyPlaying
    ? `Pause ${track.title}`
    : `Play ${track.title}`;

  const statusText = isCurrentlyPlaying ? 'Now playing' : isActive ? 'Paused' : 'Play this track';

  return (
    <div className="mt-2 flex h-14 items-center gap-4 rounded-lg border border-border bg-muted px-4">
      <button
        type="button"
        onClick={handleClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-700 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        aria-label={label}
      >
        {isCurrentlyPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <span aria-live="polite" className="text-sm font-medium text-foreground">
        {statusText}
      </span>
    </div>
  );
}
