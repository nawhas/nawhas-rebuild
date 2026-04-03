'use client';

import { useRef, useState } from 'react';
import {
  usePlayerStore,
  selectQueue,
  selectQueueIndex,
  selectIsQueueOpen,
  selectIsPlaying,
} from '@/store/player';

// ---------------------------------------------------------------------------
// Icon primitives — inline SVGs, no icon library dependency
// ---------------------------------------------------------------------------

function SpeakerIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-gray-900">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

function DragHandleIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-gray-400">
      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

function RemoveIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

/** Format seconds as m:ss */
function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// QueuePanel
// ---------------------------------------------------------------------------

/**
 * Slide-in queue panel — shows all queued tracks with drag-to-reorder and remove.
 *
 * - Slides in from the right over the page content.
 * - Sits above the PlayerBar (z-40 vs PlayerBar z-50 — PlayerBar is always visible).
 * - Uses HTML5 Drag and Drop API for reordering (no external library).
 * - Backdrop overlay closes the panel on click.
 *
 * Client Component — all state from Zustand player store.
 */
export function QueuePanel(): React.JSX.Element {
  const queue = usePlayerStore(selectQueue);
  const queueIndex = usePlayerStore(selectQueueIndex);
  const isOpen = usePlayerStore(selectIsQueueOpen);
  const isPlaying = usePlayerStore(selectIsPlaying);

  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);

  // Track which index is being dragged (HTML5 DnD)
  const dragIndexRef = useRef<number | null>(null);
  // Visual drag-over index for drop-target highlighting
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number): void {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number): void {
    e.preventDefault(); // required to allow drop
    setDragOverIndex(index);
  }

  function handleDrop(toIndex: number): void {
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      reorderQueue(fromIndex, toIndex);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd(): void {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  return (
    <>
      {/* Backdrop — closes panel on click, hidden from screen readers */}
      <div
        aria-hidden="true"
        className={[
          'fixed inset-0 z-40 bg-black/30',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={toggleQueue}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Playback queue"
        aria-modal="true"
        // Keep panel in DOM so the CSS transition works; slide off-screen when closed
        className={[
          'fixed right-0 top-0 z-40 flex flex-col',
          // Leave room for the fixed PlayerBar at the bottom (~65px)
          'h-[calc(100vh-65px)]',
          'w-full sm:w-80 md:w-96',
          'border-l border-gray-200 bg-white shadow-xl',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Up next
            {queue.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                {queue.length} track{queue.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={toggleQueue}
            aria-label="Close queue"
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Track list */}
        {queue.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-gray-500">Your queue is empty.</p>
            <p className="text-xs text-gray-400">Play a track or album to get started.</p>
          </div>
        ) : (
          <ol
            aria-label="Queue tracks"
            className="flex-1 overflow-y-auto"
          >
            {queue.map((track, index) => {
              const isActive = index === queueIndex;
              const isCurrentlyPlaying = isActive && isPlaying;
              const isDragTarget = dragOverIndex === index;

              return (
                <li
                  key={`${track.id}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={[
                    'group flex cursor-grab items-center gap-2 px-3 py-2.5 active:cursor-grabbing',
                    'border-b border-gray-100 last:border-b-0',
                    'transition-colors',
                    isActive ? 'bg-gray-50' : 'hover:bg-gray-50',
                    isDragTarget ? 'border-t-2 border-t-gray-900' : '',
                  ].join(' ')}
                  aria-label={[
                    `Track ${index + 1}: ${track.title}`,
                    isCurrentlyPlaying ? '(currently playing)' : isActive ? '(paused)' : '',
                  ].join(' ')}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {/* Drag handle */}
                  <span
                    aria-hidden="true"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <DragHandleIcon />
                  </span>

                  {/* Track number or speaker icon */}
                  <span
                    aria-hidden="true"
                    className="w-5 shrink-0 text-center text-xs tabular-nums text-gray-400"
                  >
                    {isActive ? <SpeakerIcon /> : index + 1}
                  </span>

                  {/* Track info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        isActive ? 'text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {track.title}
                    </p>
                  </div>

                  {/* Duration */}
                  {track.duration != null && (
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-xs tabular-nums text-gray-400"
                    >
                      {formatDuration(track.duration)}
                    </span>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeFromQueue(index)}
                    aria-label={`Remove ${track.title} from queue`}
                    className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 group-hover:opacity-100"
                  >
                    <RemoveIcon />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}
