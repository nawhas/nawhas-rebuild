'use client';

import { useCallback, useEffect } from 'react';
import {
  usePlayerStore,
  selectCurrentTrack,
  selectIsPlaying,
  selectIsShuffle,
  selectIsQueueOpen,
  selectPosition,
  selectDuration,
  selectVolume,
} from '@/store/player';
import { SaveButton } from '@/components/SaveButton';
import { useListeningHistory } from '@/hooks/use-listening-history';

function ExpandIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z" />
    </svg>
  );
}

/** Format seconds as m:ss */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Icon primitives — inline SVGs so there is no icon library dependency
// ---------------------------------------------------------------------------

function PlayIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function PreviousIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  );
}

function NextIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

function ShuffleIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
    </svg>
  );
}

function MusicNoteIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function QueueIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
    </svg>
  );
}

function VolumeIcon({ level }: { level: number }): React.JSX.Element {
  if (level === 0) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  if (level < 0.5) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PlayerBar
// ---------------------------------------------------------------------------

/**
 * Persistent bottom player bar — visible whenever a track is loaded.
 *
 * - Fixed to the viewport bottom so it persists across all page navigations.
 * - All state is driven by the Zustand player store via selectors.
 * - Slides in/out with a CSS transition so the appearance is smooth.
 * - Keyboard shortcuts (Space, ←, →) are registered globally but only
 *   activated when a track is loaded and the user is not in a text field.
 *
 * Desktop-only extras (md+): volume control.
 */
export function PlayerBar(): React.JSX.Element {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore(selectIsPlaying);
  const isShuffle = usePlayerStore(selectIsShuffle);
  const isQueueOpen = usePlayerStore(selectIsQueueOpen);
  const position = usePlayerStore(selectPosition);
  const duration = usePlayerStore(selectDuration);
  const volume = usePlayerStore(selectVolume);

  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setPosition = usePlayerStore((s) => s.setPosition);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const openMobileOverlay = usePlayerStore((s) => s.openMobileOverlay);

  // Record listening history whenever the current track changes.
  useListeningHistory();

  // Global keyboard shortcuts — Space, ← and → — only when a track is active.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!currentTrack) return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      // Let text inputs handle their own key events.
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) { pause(); } else { resume(); }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        previous();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, isPlaying, pause, resume, next, previous]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPosition(Number(e.target.value));
    },
    [setPosition],
  );

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(Number(e.target.value));
    },
    [setVolume],
  );

  const isVisible = currentTrack !== null;
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div
      role="region"
      aria-label="Audio player"
      // The bar is always in the DOM so the transition works — it slides
      // off-screen when no track is loaded. Fixed positioning means it never
      // affects page flow.
      className={[
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900',
        'transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
      // Hide from AT when nothing is playing — the transition keeps it visible
      // for sighted users but aria-hidden prevents screen-reader confusion.
      aria-hidden={!isVisible}
    >
      {/* Seek bar — positioned at the very top of the player bar */}
      <div className="group relative h-1 cursor-pointer bg-gray-200 hover:h-1.5 dark:bg-gray-700">
        {/* Progress fill */}
        <div
          className="h-full bg-gray-900 transition-all dark:bg-gray-100"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Invisible range input overlaid on top for interaction */}
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step={1}
          value={position}
          onChange={handleSeek}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          tabIndex={isVisible ? 0 : -1}
        />
      </div>

      {/* Main controls row */}
      <div className="flex items-center gap-2 px-4 py-2 sm:gap-4">
        {/* Track info — tappable on mobile to open full-screen overlay */}
        <button
          type="button"
          onClick={openMobileOverlay}
          aria-label={currentTrack ? `Open full player for ${currentTrack.title}` : 'Open player'}
          tabIndex={isVisible ? 0 : -1}
          className="flex min-w-0 flex-1 items-center gap-3 rounded focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 md:cursor-default md:focus:ring-0"
        >
          {/* Album art placeholder — real art requires extending the store */}
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          >
            <MusicNoteIcon />
          </div>

          {/* Title + expand hint on mobile */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {currentTrack?.title ?? ''}
            </p>
            {/* Reciter name not available in TrackDTO — placeholder for future */}
            <p className="truncate text-xs text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </div>

          {/* Expand icon — shown only on mobile (hidden md+) */}
          <span aria-hidden="true" className="shrink-0 text-gray-400 dark:text-gray-500 md:hidden">
            <ExpandIcon />
          </span>
        </button>

        {/* Save button — visible when a track is loaded */}
        {currentTrack && (
          <SaveButton
            key={currentTrack.id}
            trackId={currentTrack.id}
            className="shrink-0"
          />
        )}

        {/* Playback controls — centred */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Shuffle */}
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            aria-pressed={isShuffle}
            tabIndex={isVisible ? 0 : -1}
            className={[
              'rounded p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
              isShuffle
                ? 'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300',
            ].join(' ')}
          >
            <ShuffleIcon />
          </button>

          {/* Previous */}
          <button
            type="button"
            onClick={previous}
            aria-label="Previous track"
            tabIndex={isVisible ? 0 : -1}
            className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <PreviousIcon />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={isPlaying ? pause : resume}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            tabIndex={isVisible ? 0 : -1}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 dark:focus:ring-white"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={next}
            aria-label="Next track"
            tabIndex={isVisible ? 0 : -1}
            className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <NextIcon />
          </button>
        </div>

        {/* Right-side: time + volume (volume hidden on mobile) */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          {/* Elapsed / total time */}
          <span className="shrink-0 tabular-nums text-xs text-gray-500 dark:text-gray-400" aria-live="off">
            <span className="sr-only">Position: </span>
            <span data-testid="player-position">{formatTime(position)}</span>
            <span aria-hidden="true"> / </span>
            <span className="sr-only"> of </span>
            <span data-testid="player-duration">{formatTime(duration)}</span>
          </span>

          {/* Volume — desktop only */}
          <div className="hidden items-center gap-1.5 md:flex" aria-label="Volume control">
            <VolumeIcon level={volume} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={Math.round(volume * 100) / 100}
              aria-valuetext={`${Math.round(volume * 100)}%`}
              tabIndex={isVisible ? 0 : -1}
              className="w-20 cursor-pointer accent-gray-900 dark:accent-white"
            />
          </div>

          {/* Queue toggle */}
          <button
            type="button"
            onClick={toggleQueue}
            aria-label={isQueueOpen ? 'Close queue' : 'Open queue'}
            aria-pressed={isQueueOpen}
            tabIndex={isVisible ? 0 : -1}
            className={[
              'rounded p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
              isQueueOpen
                ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300',
            ].join(' ')}
          >
            <QueueIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
