'use client';

import Link from 'next/link';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore, selectCurrentTrack, selectIsPlaying } from '@/store/player';
import { TrackPlayButton } from '@/components/player/track-play-button';

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
        aria-label={`${track.title}${track.duration != null ? `, ${formatDuration(track.duration)}` : ''}`}
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
