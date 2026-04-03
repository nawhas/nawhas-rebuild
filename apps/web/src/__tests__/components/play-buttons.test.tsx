import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';
import { TrackPlayButton } from '@/components/player/track-play-button';
import { PlayAllButton } from '@/components/player/play-all-button';
import { TrackDetailPlayButton } from '@/components/player/track-detail-play-button';

// ---------------------------------------------------------------------------
// Mock next/link — not needed in unit tests
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

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
    youtubeId: overrides.youtubeId ?? null,
    duration: 'duration' in overrides ? (overrides.duration ?? null) : 120,
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00.000Z'),
  };
}

// ---------------------------------------------------------------------------
// Reset store state and DOM between tests
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
// TrackPlayButton
// ---------------------------------------------------------------------------

describe('TrackPlayButton', () => {
  it('shows the track number when track is not active', () => {
    const track = makeTrack({ trackNumber: 3 });
    render(<TrackPlayButton track={track} trackNumber={3} />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('has a "Play" aria-label when track is not playing', () => {
    const track = makeTrack({ title: 'My Track' });
    render(<TrackPlayButton track={track} trackNumber={1} />);
    expect(screen.getByRole('button', { name: /Play My Track/i })).toBeDefined();
  });

  it('calls play() when clicked and track is not active', () => {
    const track = makeTrack();
    render(<TrackPlayButton track={track} trackNumber={1} />);
    fireEvent.click(screen.getByRole('button'));
    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe(track.id);
    expect(state.isPlaying).toBe(true);
  });

  it('shows Pause aria-label when track is active and playing', () => {
    const track = makeTrack({ title: 'Active Track' });
    usePlayerStore.setState({ currentTrack: track, isPlaying: true });
    render(<TrackPlayButton track={track} trackNumber={1} />);
    expect(screen.getByRole('button', { name: /Pause Active Track/i })).toBeDefined();
  });

  it('calls pause() when clicked and track is active and playing', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isPlaying: true });
    render(<TrackPlayButton track={track} trackNumber={1} />);
    fireEvent.click(screen.getByRole('button'));
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('calls resume() when clicked and track is active but paused', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isPlaying: false });
    render(<TrackPlayButton track={track} trackNumber={1} />);
    fireEvent.click(screen.getByRole('button'));
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PlayAllButton
// ---------------------------------------------------------------------------

describe('PlayAllButton', () => {
  it('renders null when tracks array is empty', () => {
    const { container } = render(<PlayAllButton tracks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a "Play All" button when tracks are provided', () => {
    render(<PlayAllButton tracks={[makeTrack()]} />);
    expect(screen.getByRole('button', { name: /Play All/i })).toBeDefined();
  });

  it('calls playAlbum() with all tracks when clicked', () => {
    const tracks = [makeTrack({ id: 'a' }), makeTrack({ id: 'b' }), makeTrack({ id: 'c' })];
    render(<PlayAllButton tracks={tracks} />);
    fireEvent.click(screen.getByRole('button'));
    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(3);
    expect(state.currentTrack?.id).toBe('a');
    expect(state.isPlaying).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TrackDetailPlayButton
// ---------------------------------------------------------------------------

describe('TrackDetailPlayButton', () => {
  it('shows "Play this track" when track is not active', () => {
    const track = makeTrack();
    render(<TrackDetailPlayButton track={track} />);
    expect(screen.getByText('Play this track')).toBeDefined();
  });

  it('has a "Play" aria-label when track is not active', () => {
    const track = makeTrack({ title: 'My Track' });
    render(<TrackDetailPlayButton track={track} />);
    expect(screen.getByRole('button', { name: /Play My Track/i })).toBeDefined();
  });

  it('calls play() when clicked and track is not loaded', () => {
    const track = makeTrack();
    render(<TrackDetailPlayButton track={track} />);
    fireEvent.click(screen.getByRole('button'));
    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe(track.id);
    expect(state.isPlaying).toBe(true);
  });

  it('shows "Now playing" when track is active and playing', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isPlaying: true });
    render(<TrackDetailPlayButton track={track} />);
    expect(screen.getByText('Now playing')).toBeDefined();
  });

  it('shows "Paused" when track is active but paused', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isPlaying: false });
    render(<TrackDetailPlayButton track={track} />);
    expect(screen.getByText('Paused')).toBeDefined();
  });

  it('shows Pause aria-label and calls pause() when active and playing', () => {
    const track = makeTrack({ title: 'Playing Track' });
    usePlayerStore.setState({ currentTrack: track, isPlaying: true });
    render(<TrackDetailPlayButton track={track} />);
    const btn = screen.getByRole('button', { name: /Pause Playing Track/i });
    fireEvent.click(btn);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('has aria-live on status text for screen reader announcements', () => {
    const track = makeTrack();
    render(<TrackDetailPlayButton track={track} />);
    const liveEl = screen.getByText('Play this track');
    expect(liveEl.getAttribute('aria-live')).toBe('polite');
  });
});
