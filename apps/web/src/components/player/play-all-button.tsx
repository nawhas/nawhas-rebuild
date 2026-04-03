'use client';

import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';

function PlayIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

interface PlayAllButtonProps {
  tracks: TrackDTO[];
}

/**
 * "Play All" button for album detail pages.
 * Loads all album tracks into the queue and starts playback from the first.
 *
 * Client Component — dispatches playAlbum action to Zustand player store.
 */
export function PlayAllButton({ tracks }: PlayAllButtonProps): React.JSX.Element | null {
  const playAlbum = usePlayerStore((s) => s.playAlbum);

  if (tracks.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => playAlbum(tracks)}
      className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
    >
      <PlayIcon />
      Play All
    </button>
  );
}
