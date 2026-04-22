'use client';

import { useState } from 'react';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';
import { TrackDetailPlayButton } from '@/components/player/track-detail-play-button';
import { YoutubeEmbedSlot } from './youtube-embed-slot';

type Tab = 'listen' | 'watch';

interface MediaToggleProps {
  track: TrackDTO;
}

/**
 * MediaToggle — tab switcher between the audio player and YouTube embed.
 *
 * Rendered on the track detail page only when `track.youtubeId` is non-null.
 * Pauses any playing Howler audio before activating the Watch tab.
 *
 * Client Component — requires interactivity (tab state) and Zustand access.
 */
export function MediaToggle({ track }: MediaToggleProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('listen');
  const pause = usePlayerStore((s) => s.pause);

  function handleTabChange(tab: Tab): void {
    if (tab === 'watch') {
      pause();
    }
    setActiveTab(tab);
  }

  const tabButtonClass = (tab: Tab): string =>
    [
      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      activeTab === tab
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground',
    ].join(' ');

  return (
    <div className="mt-2">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Media player options"
        className="mb-2 flex gap-1 rounded-lg border border-border bg-muted p-1"
      >
        <button
          role="tab"
          type="button"
          id="tab-listen"
          aria-selected={activeTab === 'listen'}
          aria-controls="panel-listen"
          onClick={() => handleTabChange('listen')}
          className={tabButtonClass('listen')}
        >
          Listen
        </button>
        <button
          role="tab"
          type="button"
          id="tab-watch"
          aria-selected={activeTab === 'watch'}
          aria-controls="panel-watch"
          onClick={() => handleTabChange('watch')}
          className={tabButtonClass('watch')}
        >
          Watch
        </button>
      </div>

      {/* Listen panel — audio play button */}
      {activeTab === 'listen' && (
        <div role="tabpanel" id="panel-listen" aria-labelledby="tab-listen">
          <TrackDetailPlayButton track={track} />
        </div>
      )}

      {/* Watch panel — YouTube embed (only mounted when active to avoid eager iframe load) */}
      {activeTab === 'watch' && track.youtubeId && (
        <div role="tabpanel" id="panel-watch" aria-labelledby="tab-watch">
          <YoutubeEmbedSlot
            youtubeId={track.youtubeId}
            title={`${track.title} — YouTube video`}
          />
        </div>
      )}
    </div>
  );
}
