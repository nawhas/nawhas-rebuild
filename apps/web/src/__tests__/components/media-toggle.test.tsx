import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';
import { MediaToggle } from '@/components/tracks/media-toggle';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrack(overrides: Partial<TrackDTO> = {}): TrackDTO {
  return {
    id: overrides.id ?? 'track-1',
    title: overrides.title ?? 'Test Track',
    slug: overrides.slug ?? 'test-track',
    albumId: overrides.albumId ?? 'album-1',
    trackNumber: overrides.trackNumber ?? 1,
    audioUrl: overrides.audioUrl ?? 'https://example.com/audio.mp3',
    youtubeId: 'youtubeId' in overrides ? (overrides.youtubeId ?? null) : 'abc123',
    duration: 'duration' in overrides ? (overrides.duration ?? null) : 120,
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00.000Z'),
  };
}

// ---------------------------------------------------------------------------
// Reset store and DOM between tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  usePlayerStore.setState({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    isShuffle: false,
    position: 0,
    duration: 0,
    volume: 1,
  });
});

// ---------------------------------------------------------------------------
// MediaToggle
// ---------------------------------------------------------------------------

describe('MediaToggle', () => {
  it('renders both Listen and Watch tabs when youtubeId is set', () => {
    const track = makeTrack({ youtubeId: 'abc123' });
    render(<MediaToggle track={track} />);
    expect(screen.getByRole('tab', { name: 'Listen' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Watch' })).toBeDefined();
  });

  it('defaults to the Listen tab', () => {
    const track = makeTrack({ youtubeId: 'abc123' });
    render(<MediaToggle track={track} />);
    const listenTab = screen.getByRole('tab', { name: 'Listen' });
    expect(listenTab.getAttribute('aria-selected')).toBe('true');
    // Listen panel is visible
    expect(screen.getByRole('tabpanel')).toBeDefined();
    // YouTube iframe should NOT be in the DOM on initial render
    expect(screen.queryByTitle(/YouTube video/)).toBeNull();
  });

  it('shows the YouTube iframe when Watch tab is clicked', () => {
    const track = makeTrack({ youtubeId: 'abc123', title: 'My Nawha' });
    render(<MediaToggle track={track} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Watch' }));
    const iframe = screen.getByTitle('My Nawha — YouTube video');
    expect(iframe).toBeDefined();
    expect((iframe as HTMLIFrameElement).src).toContain('abc123');
  });

  it('pauses audio when switching to the Watch tab', () => {
    const track = makeTrack({ youtubeId: 'abc123' });
    usePlayerStore.setState({ currentTrack: track, isPlaying: true });
    render(<MediaToggle track={track} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Watch' }));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('does not auto-play when switching back to Listen tab', () => {
    const track = makeTrack({ youtubeId: 'abc123' });
    usePlayerStore.setState({ currentTrack: track, isPlaying: true });
    render(<MediaToggle track={track} />);
    // Switch to Watch (pauses audio)
    fireEvent.click(screen.getByRole('tab', { name: 'Watch' }));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    // Switch back to Listen
    fireEvent.click(screen.getByRole('tab', { name: 'Listen' }));
    // Should still be paused — no auto-play
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('unmounts the YouTube iframe when switching back to Listen tab', () => {
    const track = makeTrack({ youtubeId: 'abc123', title: 'My Nawha' });
    render(<MediaToggle track={track} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Watch' }));
    expect(screen.getByTitle('My Nawha — YouTube video')).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Listen' }));
    expect(screen.queryByTitle('My Nawha — YouTube video')).toBeNull();
  });

  it('sets Watch tab aria-selected=true when Watch is active', () => {
    const track = makeTrack({ youtubeId: 'abc123' });
    render(<MediaToggle track={track} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Watch' }));
    expect(screen.getByRole('tab', { name: 'Watch' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Listen' }).getAttribute('aria-selected')).toBe('false');
  });

  it('does not render Watch tab panel content when youtubeId is null', () => {
    const track = makeTrack({ youtubeId: null });
    render(<MediaToggle track={track} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Watch' }));
    // Even though Watch tab is clicked, no iframe renders (guard in template)
    expect(screen.queryByRole('tabpanel', { name: /watch/i })).toBeNull();
  });
});
