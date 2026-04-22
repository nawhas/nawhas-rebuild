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
      className={`group relative flex items-center gap-3 px-4 py-3 transition-colors ${
        isActive ? 'bg-muted' : 'hover:bg-muted'
      }`}
    >
      {/* Play/pause button — replaces track number on hover, always shows icon when active.
          Wrapped in a `relative z-10` div so it stays clickable above the
          stretched-link overlay (::before) on the title link below. */}
      <div className="relative z-10">
        <TrackPlayButton track={track} trackNumber={trackNumber} />
      </div>

      {/* Track title — navigates to track detail page.
          The `before:` pseudo-element stretches the link's hit area across the
          whole row so clicking empty space also navigates (matches the visual
          hover highlight on the <li>). Sibling interactive controls use
          `relative z-10` to stay above the overlay and remain clickable. */}
      <Link
        href={href}
        aria-label={track.title}
        className={`min-w-0 flex-1 truncate text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring before:absolute before:inset-0 before:content-[''] ${
          isCurrentlyPlaying ? 'text-foreground' : 'text-foreground hover:text-muted-foreground'
        }`}
        tabIndex={0}
      >
        {track.title}
        {isActive && (
          <span
            role="img"
            aria-label={isCurrentlyPlaying ? 'currently playing' : 'paused'}
            className="ml-2 inline-block h-2 w-2 rounded-full bg-foreground align-middle"
          />
        )}
      </Link>

      {/* Save + Like — visible on hover. `relative z-10` keeps them clickable
          above the stretched-link overlay on the title. */}
      <SaveButton
        trackId={track.id}
        className="relative z-10 opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100"
      />
      <LikeButton
        trackId={track.id}
        className="relative z-10 opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100"
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
        className="relative z-10 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-hover:opacity-100"
      >
        <AddToQueueIcon />
      </button>

      {/* Duration */}
      {track.duration != null && (
        <span
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
          aria-hidden="true"
        >
          {formatDuration(track.duration)}
        </span>
      )}
    </li>
  );
}
