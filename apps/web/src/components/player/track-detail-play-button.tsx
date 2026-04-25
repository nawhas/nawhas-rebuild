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
  /**
   * `default` — full-width status card with text + 40px circle button.
   * `hero` — bare 56px accent-filled circle button suitable for the POC hero
   *   (no surrounding card, no status text).
   */
  variant?: 'default' | 'hero';
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
export function TrackDetailPlayButton({
  track,
  lyrics,
  variant = 'default',
}: TrackDetailPlayButtonProps): React.JSX.Element {
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

  if (variant === 'hero') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      >
        {isCurrentlyPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    );
  }

  const statusText = isCurrentlyPlaying ? 'Now playing' : isActive ? 'Paused' : 'Play this track';

  return (
    <div className="mt-2 flex h-14 items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4">
      <button
        type="button"
        onClick={handleClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        aria-label={label}
      >
        {isCurrentlyPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <span aria-live="polite" className="text-sm font-medium text-[var(--text)]">
        {statusText}
      </span>
    </div>
  );
}
