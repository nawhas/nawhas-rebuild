import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { LyricDTO, TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';
import { MobilePlayerOverlay } from '@/components/player/MobilePlayerOverlay';
import { TrackDetailPlayButton } from '@/components/player/track-detail-play-button';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/tracks/lyrics-display', () => ({
  LyricsDisplay: ({ lyrics }: { lyrics: LyricDTO[] }) => (
    <div data-testid="lyrics-display">{lyrics.length} lyrics</div>
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
    audioUrl: overrides.audioUrl ?? null,
    youtubeId: overrides.youtubeId ?? null,
    duration: 'duration' in overrides ? (overrides.duration ?? null) : 180,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };
}

function makeLyric(overrides: Partial<LyricDTO> = {}): LyricDTO {
  return {
    id: overrides.id ?? 'lyric-1',
    trackId: overrides.trackId ?? 'track-1',
    language: overrides.language ?? 'en',
    text: overrides.text ?? 'Sample lyric text',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };
}

// ---------------------------------------------------------------------------
// Reset state between tests
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
    isQueueOpen: false,
    isMobileOverlayOpen: false,
    currentLyrics: [],
    position: 0,
    duration: 0,
    volume: 1,
  });
});

// ---------------------------------------------------------------------------
// MobilePlayerOverlay — visibility
// ---------------------------------------------------------------------------

describe('MobilePlayerOverlay — visibility', () => {
  it('is aria-hidden when overlay is closed', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: false });
    const { container } = render(<MobilePlayerOverlay />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is visible (aria-hidden=false) when overlay is open with a track loaded', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true });
    const { container } = render(<MobilePlayerOverlay />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-hidden')).toBe('false');
  });

  it('remains hidden if no track is loaded even if overlay flag is true', () => {
    usePlayerStore.setState({ currentTrack: null, isMobileOverlayOpen: true });
    const { container } = render(<MobilePlayerOverlay />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-hidden')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// MobilePlayerOverlay — controls
// ---------------------------------------------------------------------------

describe('MobilePlayerOverlay — controls', () => {
  it('shows track title when open', () => {
    const track = makeTrack({ title: 'Nohay Title' });
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true });
    render(<MobilePlayerOverlay />);
    expect(screen.getByText('Nohay Title')).toBeDefined();
  });

  it('collapse button (chevron) calls closeMobileOverlay', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true });
    render(<MobilePlayerOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse to mini player' }));
    expect(usePlayerStore.getState().isMobileOverlayOpen).toBe(false);
  });

  it('close button (X) calls closeMobileOverlay', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true });
    render(<MobilePlayerOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss player' }));
    expect(usePlayerStore.getState().isMobileOverlayOpen).toBe(false);
  });

  it('play/pause button toggles playback', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true, isPlaying: false });
    render(<MobilePlayerOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('shuffle button toggles shuffle state', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true, isShuffle: false });
    render(<MobilePlayerOverlay />);
    fireEvent.click(screen.getByRole('button', { name: /Enable shuffle/i }));
    expect(usePlayerStore.getState().isShuffle).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MobilePlayerOverlay — lyrics
// ---------------------------------------------------------------------------

describe('MobilePlayerOverlay — lyrics', () => {
  it('does not render lyrics section when no lyrics in store', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true, currentLyrics: [] });
    render(<MobilePlayerOverlay />);
    expect(screen.queryByTestId('lyrics-display')).toBeNull();
  });

  it('renders LyricsDisplay when lyrics are in the store', () => {
    const track = makeTrack();
    const lyrics = [makeLyric(), makeLyric({ id: 'lyric-2', language: 'ar' })];
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true, currentLyrics: lyrics });
    render(<MobilePlayerOverlay />);
    expect(screen.getByTestId('lyrics-display')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// MobilePlayerOverlay — swipe-down gesture
// ---------------------------------------------------------------------------

describe('MobilePlayerOverlay — swipe to dismiss', () => {
  it('closes when swiped down more than 80px', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true });
    const { container } = render(<MobilePlayerOverlay />);
    const dialog = container.querySelector('[role="dialog"]')!;

    fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(dialog, { touches: [{ clientY: 200 }] }); // 100px down
    fireEvent.touchEnd(dialog);

    expect(usePlayerStore.getState().isMobileOverlayOpen).toBe(false);
  });

  it('does not close when swiped less than 80px', () => {
    const track = makeTrack();
    usePlayerStore.setState({ currentTrack: track, isMobileOverlayOpen: true });
    const { container } = render(<MobilePlayerOverlay />);
    const dialog = container.querySelector('[role="dialog"]')!;

    fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(dialog, { touches: [{ clientY: 150 }] }); // 50px — below threshold
    fireEvent.touchEnd(dialog);

    expect(usePlayerStore.getState().isMobileOverlayOpen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TrackDetailPlayButton — lyrics sync
// ---------------------------------------------------------------------------

describe('TrackDetailPlayButton — lyrics sync', () => {
  it('syncs lyrics to store when track is active', () => {
    const track = makeTrack();
    const lyrics = [makeLyric()];
    usePlayerStore.setState({ currentTrack: track, isPlaying: true });
    render(<TrackDetailPlayButton track={track} lyrics={lyrics} />);
    expect(usePlayerStore.getState().currentLyrics).toHaveLength(1);
  });

  it('does not sync lyrics when track is not active', () => {
    const track = makeTrack({ id: 'track-1' });
    const otherTrack = makeTrack({ id: 'track-2' });
    const lyrics = [makeLyric()];
    usePlayerStore.setState({ currentTrack: otherTrack, isPlaying: true });
    render(<TrackDetailPlayButton track={track} lyrics={lyrics} />);
    expect(usePlayerStore.getState().currentLyrics).toHaveLength(0);
  });

  it('syncs lyrics to store immediately on play()', () => {
    const track = makeTrack();
    const lyrics = [makeLyric()];
    render(<TrackDetailPlayButton track={track} lyrics={lyrics} />);
    fireEvent.click(screen.getByRole('button', { name: /Play/i }));
    expect(usePlayerStore.getState().currentLyrics).toHaveLength(1);
  });
});
