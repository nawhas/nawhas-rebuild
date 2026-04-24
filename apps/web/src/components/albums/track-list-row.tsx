'use client';

import type { TrackDTO } from '@nawhas/types';
import { TrackRow } from '@nawhas/ui';
import { TrackPlayButton } from '@/components/player/track-play-button';
import { usePlayerStore } from '@/store/player';

function AddToQueueIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z" />
    </svg>
  );
}

interface TrackListRowProps {
  track: TrackDTO;
  trackNumber: number;
  href: string;
  reciterSlug: string;
}

/**
 * Client-only row wrapper used by the album track list.
 *
 * Restores the per-row play-button + add-to-queue affordances that the
 * legacy track-list-item.tsx provided. The shared TrackRow primitive
 * remains generic (renders the title/reciter/poet/duration/plays grid)
 * — interactive controls are threaded in via the leadingSlot prop and
 * the trailing add-to-queue button is positioned alongside.
 *
 * Marked `group` so TrackPlayButton's `group-hover:` rules can swap
 * the track number for a play icon on hover.
 */
export function TrackListRow({
  track,
  trackNumber,
  href,
  reciterSlug,
}: TrackListRowProps): React.JSX.Element {
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  return (
    <li className="group relative">
      <TrackRow
        slug={track.slug}
        title={track.title}
        reciter="" /* hidden — context is the album header */
        reciterSlug={reciterSlug}
        {...(track.duration != null ? { duration: track.duration } : {})}
        href={href}
        leadingSlot={<TrackPlayButton track={track} trackNumber={trackNumber} />}
      />
      {/* Add-to-queue: visible on hover. Absolutely positioned on the right
          edge so it stays out of the TrackRow's grid columns. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addToQueue(track);
        }}
        aria-label={`Add ${track.title} to queue`}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-faint)] opacity-0 transition-all hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] group-hover:opacity-100"
      >
        <AddToQueueIcon />
      </button>
    </li>
  );
}
