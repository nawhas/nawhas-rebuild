'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  usePlayerStore,
  selectCurrentTrack,
  selectCurrentLyrics,
  selectIsPlaying,
  selectIsShuffle,
  selectIsMobileOverlayOpen,
  selectPosition,
  selectDuration,
} from '@/store/player';
import { LyricsDisplay } from '@/components/tracks/lyrics-display';

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Icon primitives
// ---------------------------------------------------------------------------

function PlayIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function PreviousIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  );
}

function NextIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

function ShuffleIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
    </svg>
  );
}

function MusicNoteIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

function ChevronDownIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// MobilePlayerOverlay
// ---------------------------------------------------------------------------

/**
 * Full-screen mobile player overlay.
 *
 * Opens when the user taps the mini player bar on mobile.
 * Shows large artwork placeholder, full playback controls, seek bar,
 * and lyrics if available in the store.
 *
 * Swipe-down gesture or close button dismisses the overlay.
 *
 * Client Component — reads from and dispatches to Zustand player store.
 */
export function MobilePlayerOverlay(): React.JSX.Element {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const currentLyrics = usePlayerStore(selectCurrentLyrics);
  const isPlaying = usePlayerStore(selectIsPlaying);
  const isShuffle = usePlayerStore(selectIsShuffle);
  const isOpen = usePlayerStore(selectIsMobileOverlayOpen);
  const position = usePlayerStore(selectPosition);
  const duration = usePlayerStore(selectDuration);

  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setPosition = usePlayerStore((s) => s.setPosition);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const closeMobileOverlay = usePlayerStore((s) => s.closeMobileOverlay);

  // Swipe-down-to-dismiss state
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
    touchCurrentY.current = touchStartY.current;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current === null || touchCurrentY.current === null) return;
    const delta = touchCurrentY.current - touchStartY.current;
    // Close if swiped down more than 80px
    if (delta > 80) {
      closeMobileOverlay();
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  }, [closeMobileOverlay]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPosition(Number(e.target.value));
    },
    [setPosition],
  );

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const isVisible = isOpen && currentTrack !== null;

  // Focus management: move focus into dialog on open, restore on close (WCAG 2.1 AA SC 2.4.3)
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isVisible) {
      triggerRef.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();
    } else {
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [isVisible]);

  // Escape key to dismiss overlay (WCAG 2.1 SC 2.1.1)
  useEffect(() => {
    if (!isVisible) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        closeMobileOverlay();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, closeMobileOverlay]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentTrack ? `Now playing: ${currentTrack.title}` : 'Player'}
      aria-hidden={!isVisible}
      // Always in the DOM; slide-up transition on open
      className={[
        'fixed inset-0 z-[60]',
        'flex flex-col bg-white dark:bg-gray-900',
        'transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle + close button */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
        {/* Drag handle indicator */}
        <div aria-hidden="true" className="absolute left-1/2 top-2 -translate-x-1/2">
          <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Collapse button — first focusable element, receives focus on open */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeMobileOverlay}
          aria-label="Collapse to mini player"
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-800"
          tabIndex={isVisible ? 0 : -1}
        >
          <ChevronDownIcon />
        </button>

        {/* Dismiss button (top-right) — unique label distinct from collapse */}
        <button
          type="button"
          onClick={closeMobileOverlay}
          aria-label="Dismiss player"
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-800"
          tabIndex={isVisible ? 0 : -1}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pb-8">
          {/* Album art */}
          <div
            aria-hidden="true"
            className="mt-4 flex h-56 w-56 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 shadow-lg dark:bg-gray-800 dark:text-gray-600"
          >
            <MusicNoteIcon />
          </div>

          {/* Track info */}
          <div className="mt-6 w-full text-center">
            <p className="truncate text-xl font-bold text-gray-900 dark:text-white">
              {currentTrack?.title ?? ''}
            </p>
            {/* Reciter name not available in TrackDTO — placeholder for future */}
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </div>

          {/* Seek bar */}
          <div className="mt-6 w-full">
            <div className="group relative h-1 cursor-pointer rounded-full bg-gray-200 hover:h-1.5 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gray-900 transition-all dark:bg-gray-100"
                style={{ width: `${progressPercent}%` }}
              />
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
            {/* Time display */}
            <div className="mt-1 flex justify-between tabular-nums text-xs text-gray-500 dark:text-gray-400" aria-live="off">
              <span>
                <span className="sr-only">Position: </span>
                {formatTime(position)}
              </span>
              <span>
                <span className="sr-only">Duration: </span>
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="mt-6 flex w-full items-center justify-between px-4">
            {/* Shuffle */}
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
              aria-pressed={isShuffle}
              tabIndex={isVisible ? 0 : -1}
              className={[
                'rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
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
              className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <PreviousIcon />
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={isPlaying ? pause : resume}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              tabIndex={isVisible ? 0 : -1}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={next}
              aria-label="Next track"
              tabIndex={isVisible ? 0 : -1}
              className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <NextIcon />
            </button>

            {/* Spacer to balance the shuffle button */}
            <div className="w-9" aria-hidden="true" />
          </div>

          {/* Lyrics — shown only when available in the store */}
          {currentLyrics.length > 0 && (
            <div className="mt-10 w-full">
              <LyricsDisplay lyrics={currentLyrics} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
