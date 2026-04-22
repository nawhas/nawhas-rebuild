'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { SavedTrackDTO, TrackDTO } from '@nawhas/types';
import { Button } from '@nawhas/ui/components/button';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { usePlayerStore } from '@/store/player';
import { LoadMore } from '@/components/pagination/load-more';
import { SaveButton } from '@/components/SaveButton';
import { fetchMoreLibraryTracks, playAllLibraryTracks } from '@/server/actions/library';

/** Format seconds as m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayAllIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function MusicNoteIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

interface LibraryTracksListProps {
  initialItems: SavedTrackDTO[];
  initialCursor: string | null;
}

/**
 * Client Component for the paginated saved-tracks library list.
 *
 * - Maintains accumulated items and current cursor in local state.
 * - "Load More" appends the next page via Server Action.
 * - "Play All" fetches all saved tracks and injects them into the player queue.
 * - Optimistic unsave: removing a track hides it immediately; re-adds on error.
 */
export function LibraryTracksList({
  initialItems,
  initialCursor,
}: LibraryTracksListProps): React.JSX.Element {
  const t = useTranslations('library');
  const [items, setItems] = useState<SavedTrackDTO[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoadingMore, startLoadMore] = useTransition();
  const [isPlayingAll, startPlayAll] = useTransition();

  const playAlbum = usePlayerStore((s) => s.playAlbum);

  function handleLoadMore(): void {
    if (!cursor) return;
    startLoadMore(async () => {
      const result = await fetchMoreLibraryTracks(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  function handlePlayAll(): void {
    startPlayAll(async () => {
      const tracks: TrackDTO[] = await playAllLibraryTracks();
      if (tracks.length > 0) {
        playAlbum(tracks);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MusicNoteIcon />
        </div>
        <SectionTitle className="mb-2 text-lg font-semibold">{t('emptyTitle')}</SectionTitle>
        <p className="mb-6 text-sm text-muted-foreground">
          {t('emptyDescription')}
        </p>
        <Button asChild>
          <Link href="/albums">{t('browseAlbums')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Play All button */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length === 1 ? t('trackCountSingular', { count: items.length }) : t('trackCountPlural', { count: items.length })}
        </p>
        <Button
          type="button"
          onClick={handlePlayAll}
          disabled={isPlayingAll}
          aria-busy={isPlayingAll}
        >
          <PlayAllIcon />
          {isPlayingAll ? t('playAllLoading') : t('playAll')}
        </Button>
      </div>

      {/* Track list */}
      <ol
        aria-label={items.length === 1 ? t('savedTracksListLabel', { count: items.length }) : t('savedTracksListLabelPlural', { count: items.length })}
        className="divide-y divide-border rounded-lg border border-border bg-card"
      >
        {items.map((item) => (
          <LibraryTrackRow
            key={item.trackId}
            item={item}
            onUnsave={(trackId) => setItems((prev) => prev.filter((i) => i.trackId !== trackId))}
          />
        ))}
      </ol>

      {cursor !== null && (
        <div className="mt-8 flex justify-center">
          <LoadMore onLoadMore={handleLoadMore} isLoading={isLoadingMore} />
        </div>
      )}
    </div>
  );
}

interface LibraryTrackRowProps {
  item: SavedTrackDTO;
  onUnsave: (trackId: string) => void;
}

/**
 * A single row in the library track list.
 * Renders track title, duration, and a SaveButton (initially saved=true).
 * When unsaved, the row is removed from the parent list optimistically via onUnsave.
 */
function LibraryTrackRow({ item, onUnsave }: LibraryTrackRowProps): React.JSX.Element {
  const { track } = item;

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MusicNoteIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
      </div>

      {track.duration != null && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
          {formatDuration(track.duration)}
        </span>
      )}

      <SaveButton
        trackId={track.id}
        initialSaved={true}
        onSavedChange={(saved) => {
          if (!saved) onUnsave(track.id);
        }}
        className="hover:bg-muted"
      />
    </li>
  );
}
