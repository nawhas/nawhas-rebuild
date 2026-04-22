'use client';

import type { TrackDTO } from '@nawhas/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@nawhas/ui/components/tabs';
import { usePlayerStore } from '@/store/player';
import { TrackDetailPlayButton } from '@/components/player/track-detail-play-button';
import { YoutubeEmbedSlot } from './youtube-embed-slot';

interface MediaToggleProps {
  track: TrackDTO;
}

/**
 * MediaToggle — tab switcher between the audio player and YouTube embed.
 *
 * Rendered on the track detail page only when `track.youtubeId` is non-null.
 * Pauses any playing Howler audio before activating the Watch tab.
 *
 * Uses the Radix-backed <Tabs> primitive (Phase 2.2 Task 6). The Watch panel
 * guards on `track.youtubeId` so direct renders with a null id (as exercised
 * by unit tests) still render the tab list but omit the iframe payload.
 *
 * Client Component — requires interactivity (tab state) and Zustand access.
 */
export function MediaToggle({ track }: MediaToggleProps): React.JSX.Element {
  const pause = usePlayerStore((s) => s.pause);

  function handleValueChange(value: string): void {
    if (value === 'watch') {
      pause();
    }
  }

  return (
    <Tabs defaultValue="listen" onValueChange={handleValueChange} className="mt-2">
      <TabsList aria-label="Media player options" className="mb-2 flex w-full gap-1">
        <TabsTrigger value="listen" className="flex-1">
          Listen
        </TabsTrigger>
        <TabsTrigger value="watch" className="flex-1">
          Watch
        </TabsTrigger>
      </TabsList>

      <TabsContent value="listen">
        <TrackDetailPlayButton track={track} />
      </TabsContent>

      {track.youtubeId && (
        <TabsContent value="watch">
          <YoutubeEmbedSlot
            youtubeId={track.youtubeId}
            title={`${track.title} — YouTube video`}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
