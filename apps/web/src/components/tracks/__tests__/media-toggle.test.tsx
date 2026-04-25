import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';

// Stub YoutubeEmbedSlot so we can assert its presence without an actual iframe.
vi.mock('../youtube-embed-slot', () => ({
  YoutubeEmbedSlot: ({ youtubeId, title }: { youtubeId: string; title?: string }) => (
    <div data-testid="youtube-embed" data-youtube-id={youtubeId} aria-label={title} />
  ),
}));

// Stub TrackDetailPlayButton — heavy Zustand + Howler dep, not under test here.
vi.mock('@/components/player/track-detail-play-button', () => ({
  TrackDetailPlayButton: ({ track }: { track: TrackDTO }) => (
    <div data-testid="play-button" data-track-id={track.id} />
  ),
}));

import { MediaToggle } from '../media-toggle';

function makeTrack(overrides: Partial<TrackDTO> = {}): TrackDTO {
  return {
    id: 't1',
    title: 'Ya Hussain',
    slug: 'ya-hussain',
    albumId: 'a1',
    trackNumber: 1,
    audioUrl: 'https://example.com/audio.mp3',
    youtubeId: null,
    duration: 120,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Helper: simulate a Radix tab switch. Radix requires the full pointer event
 * sequence (mousedown → mouseup → click) for the tab trigger to activate.
 */
function clickTab(tabElement: HTMLElement): void {
  act(() => {
    fireEvent.mouseDown(tabElement);
    fireEvent.mouseUp(tabElement);
    fireEvent.click(tabElement);
  });
}

function resetStore(): void {
  usePlayerStore.setState({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    isShuffle: false,
    position: 0,
    duration: 0,
    volume: 1,
    isQueueOpen: false,
    isMobileOverlayOpen: false,
    currentLyrics: [],
  });
}

beforeEach(() => resetStore());
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MediaToggle', () => {
  describe('tab list rendering', () => {
    it('renders a tab list with aria-label "Media player options"', () => {
      render(<MediaToggle track={makeTrack()} />);
      expect(screen.getByRole('tablist', { name: /media player options/i })).toBeDefined();
    });

    it('renders a Listen tab', () => {
      render(<MediaToggle track={makeTrack()} />);
      expect(screen.getByRole('tab', { name: /listen/i })).toBeDefined();
    });

    it('renders a Watch tab', () => {
      render(<MediaToggle track={makeTrack()} />);
      expect(screen.getByRole('tab', { name: /watch/i })).toBeDefined();
    });

    it('defaults to the Listen tab as active', () => {
      render(<MediaToggle track={makeTrack()} />);
      const listenTab = screen.getByRole('tab', { name: /listen/i });
      expect(listenTab.getAttribute('data-state')).toBe('active');
    });
  });

  describe('listen panel', () => {
    it('renders the TrackDetailPlayButton stub in the listen panel', () => {
      render(<MediaToggle track={makeTrack()} />);
      expect(screen.getByTestId('play-button')).toBeDefined();
    });
  });

  describe('watch panel — track with YouTube id', () => {
    it('renders the YoutubeEmbedSlot after switching to the Watch tab', () => {
      render(<MediaToggle track={makeTrack({ youtubeId: 'dQw4w9WgXcQ' })} />);
      clickTab(screen.getByRole('tab', { name: /watch/i }));
      expect(screen.getByTestId('youtube-embed')).toBeDefined();
    });

    it('passes the correct youtubeId to the embed slot', () => {
      render(<MediaToggle track={makeTrack({ youtubeId: 'abc123' })} />);
      clickTab(screen.getByRole('tab', { name: /watch/i }));
      const embed = screen.getByTestId('youtube-embed');
      expect(embed.getAttribute('data-youtube-id')).toBe('abc123');
    });

    it('generates a descriptive title for the embed iframe', () => {
      render(<MediaToggle track={makeTrack({ youtubeId: 'abc123', title: 'Ya Hussain' })} />);
      clickTab(screen.getByRole('tab', { name: /watch/i }));
      const embed = screen.getByTestId('youtube-embed');
      expect(embed.getAttribute('aria-label')).toBe('Ya Hussain — YouTube video');
    });
  });

  describe('watch panel — track without YouTube id', () => {
    it('does not render the YoutubeEmbedSlot even after switching to Watch tab', () => {
      render(<MediaToggle track={makeTrack({ youtubeId: null })} />);
      clickTab(screen.getByRole('tab', { name: /watch/i }));
      expect(screen.queryByTestId('youtube-embed')).toBeNull();
    });
  });

  describe('tab switching behavior', () => {
    it('Watch tab becomes active after clicking it', () => {
      render(<MediaToggle track={makeTrack({ youtubeId: 'abc123' })} />);
      const watchTab = screen.getByRole('tab', { name: /watch/i });
      clickTab(watchTab);
      expect(watchTab.getAttribute('data-state')).toBe('active');
    });

    it('calls pause on the player store when switching to the Watch tab', () => {
      const pauseSpy = vi.fn();
      // Patch the store's pause action directly.
      const original = usePlayerStore.getState().pause;
      usePlayerStore.setState({ pause: pauseSpy });

      render(<MediaToggle track={makeTrack({ youtubeId: 'abc123' })} />);
      clickTab(screen.getByRole('tab', { name: /watch/i }));

      expect(pauseSpy).toHaveBeenCalledOnce();

      // Restore original pause so other tests are unaffected.
      usePlayerStore.setState({ pause: original });
    });

    it('does NOT call pause when switching back to the Listen tab', () => {
      const pauseSpy = vi.fn();
      const original = usePlayerStore.getState().pause;
      usePlayerStore.setState({ pause: pauseSpy });

      render(<MediaToggle track={makeTrack({ youtubeId: 'abc123' })} />);
      // Switch to Watch first
      clickTab(screen.getByRole('tab', { name: /watch/i }));
      pauseSpy.mockClear();
      // Switch back to Listen
      clickTab(screen.getByRole('tab', { name: /listen/i }));

      expect(pauseSpy).not.toHaveBeenCalled();

      usePlayerStore.setState({ pause: original });
    });
  });
});
