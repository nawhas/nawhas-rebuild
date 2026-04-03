'use client';

import Link from 'next/link';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore, selectCurrentTrack, selectIsPlaying } from '@/store/player';
import { TrackPlayButton } from '@/components/player/track-play-button';
import { SaveButton } from '@/components/SaveButton';
import { LikeButton } from '@/components/LikeButton';

function AddToQueueIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z" />
    </svg>
  );
}

/** Format a duration in seconds as m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface TrackListItemProps {
  track: TrackDTO;
  trackNumber: number;
  href: string;
}

/**
 * A single interactive row in the album track list.
 *
 * - Shows play icon on hover (via group-hover CSS on the <li>).
 * - Shows pause icon when this track is actively playing.
 * - Highlights the row when this track is the active track.
 *
 * Client Component — reads from Zustand player store for active/playing state.
 */
export function TrackListItem({ track, trackNumber, href }: TrackListItemProps): React.JSX.Element {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore(selectIsPlaying);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const isActive = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  return (
    <li
      className={`group flex items-center gap-3 px-4 py-3 transition-colors ${
        isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
      }`}
    >
      {/* Play/pause button — replaces track number on hover, always shows icon when active */}
      <TrackPlayButton track={track} trackNumber={trackNumber} />

      {/* Track title — navigates to track detail page */}
      <Link
        href={href}
        className={`min-w-0 flex-1 truncate text-sm font-medium focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
          isCurrentlyPlaying ? 'text-gray-900' : 'text-gray-900 hover:text-gray-700'
        }`}
        tabIndex={0}
      >
        {track.title}
        {isActive && (
          <span
            aria-label={isCurrentlyPlaying ? 'currently playing' : 'paused'}
            className="ml-2 inline-block h-2 w-2 rounded-full bg-gray-900 align-middle"
          />
        )}
      </Link>

      {/* Save + Like — visible on hover */}
      <SaveButton
        trackId={track.id}
        className="opacity-0 hover:bg-gray-100 focus:opacity-100 group-hover:opacity-100"
      />
      <LikeButton
        trackId={track.id}
        className="opacity-0 hover:bg-gray-100 focus:opacity-100 group-hover:opacity-100"
      />

      {/* Add to queue — visible on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addToQueue(track);
        }}
        aria-label={`Add ${track.title} to queue`}
        className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 group-hover:opacity-100"
      >
        <AddToQueueIcon />
      </button>

      {/* Duration */}
      {track.duration != null && (
        <span
          className="shrink-0 text-xs tabular-nums text-gray-500"
          aria-hidden="true"
        >
          {formatDuration(track.duration)}
        </span>
      )}
    </li>
  );
}
