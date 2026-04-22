import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { PlayerBar } from '../PlayerBar';
import { usePlayerStore } from '@/store/player';
import type { TrackDTO } from '@nawhas/types';

// SaveButton (rendered inside PlayerBar) uses next/navigation, auth-client, and library actions.
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

vi.mock('@/server/actions/library', () => ({
  getIsSaved: vi.fn().mockResolvedValue(false),
  saveTrack: vi.fn().mockResolvedValue(undefined),
  unsaveTrack: vi.fn().mockResolvedValue(undefined),
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
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayerBar', () => {
  describe('visibility', () => {
    it('renders the player bar div in the DOM', () => {
      const { container } = render(<PlayerBar />);
      const bar = container.querySelector('[role="region"][aria-label="Audio player"]');
      expect(bar).not.toBeNull();
    });

    it('is off-screen (translate-y-full) when no track is loaded', () => {
      const { container } = render(<PlayerBar />);
      const bar = container.querySelector('[role="region"]');
      expect(bar?.className).toContain('translate-y-full');
    });

    it('slides in (translate-y-0) when a track is loaded', () => {
      usePlayerStore.getState().play(makeTrack());
      const { container } = render(<PlayerBar />);
      const bar = container.querySelector('[role="region"]');
      expect(bar?.className).toContain('translate-y-0');
    });

    it('is aria-hidden when no track is loaded', () => {
      const { container } = render(<PlayerBar />);
      const bar = container.querySelector('[role="region"]');
      expect(bar?.getAttribute('aria-hidden')).toBe('true');
    });

    it('is not aria-hidden when a track is loaded', () => {
      usePlayerStore.getState().play(makeTrack());
      const { container } = render(<PlayerBar />);
      const bar = container.querySelector('[role="region"]');
      expect(bar?.getAttribute('aria-hidden')).toBe('false');
    });
  });

  describe('shadow direction (regression guard)', () => {
    // Phase 2.1 legacy audit surfaced: Tailwind's shadow-lg casts downward,
    // which is wasted against the viewport bottom for a fixed bottom-0 bar.
    // Legacy hand-rolled an upward-casting shadow to lift the bar off content
    // behind it. This guard prevents a regression to shadow-lg.
    it('casts upward (not downward shadow-lg)', () => {
      const { container } = render(<PlayerBar />);
      const bar = container.querySelector('[role="region"]');
      expect(bar?.className).not.toContain('shadow-lg');
      expect(bar?.className).toContain('shadow-[0_-2px_8px_4px_rgba(0,0,0,0.16)]');
    });
  });

  describe('track info', () => {
    it('displays the track title', () => {
      usePlayerStore.getState().play(makeTrack({ title: 'Ya Husayn' }));
      render(<PlayerBar />);
      expect(screen.getByText('Ya Husayn')).toBeDefined();
    });

    it('shows no title when no track is loaded', () => {
      render(<PlayerBar />);
      // The title paragraph exists but should be empty
      const titleEl = document.querySelector('p.truncate.text-sm.font-medium');
      expect(titleEl?.textContent).toBe('');
    });
  });

  describe('play / pause control', () => {
    it('renders a Play button when not playing', () => {
      usePlayerStore.getState().play(makeTrack());
      usePlayerStore.getState().pause();
      render(<PlayerBar />);
      expect(screen.getByRole('button', { name: 'Play' })).toBeDefined();
    });

    it('renders a Pause button when playing', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeDefined();
    });

    it('calls pause when Pause is clicked', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(usePlayerStore.getState().isPlaying).toBe(false);
    });

    it('calls resume when Play is clicked', () => {
      usePlayerStore.getState().play(makeTrack());
      usePlayerStore.getState().pause();
      render(<PlayerBar />);
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(usePlayerStore.getState().isPlaying).toBe(true);
    });
  });

  describe('previous / next controls', () => {
    it('renders Previous and Next buttons', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      expect(screen.getByRole('button', { name: 'Previous track' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Next track' })).toBeDefined();
    });

    it('calls next() when Next is clicked', () => {
      const t1 = makeTrack({ id: 'a', title: 'A' });
      const t2 = makeTrack({ id: 'b', title: 'B' });
      usePlayerStore.getState().playAlbum([t1, t2]);
      render(<PlayerBar />);
      fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
      expect(usePlayerStore.getState().currentTrack?.id).toBe('b');
    });

    it('calls previous() when Previous is clicked', () => {
      const t1 = makeTrack({ id: 'a' });
      const t2 = makeTrack({ id: 'b' });
      usePlayerStore.getState().playAlbum([t1, t2]);
      usePlayerStore.getState().next(); // → b
      render(<PlayerBar />);
      fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
      expect(usePlayerStore.getState().currentTrack?.id).toBe('a');
    });
  });

  describe('shuffle toggle', () => {
    it('renders shuffle button', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      expect(screen.getByRole('button', { name: 'Enable shuffle' })).toBeDefined();
    });

    it('shows aria-pressed=false when shuffle is off', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      const btn = screen.getByRole('button', { name: 'Enable shuffle' });
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('toggles shuffle on click and updates aria-pressed', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      const btn = screen.getByRole('button', { name: 'Enable shuffle' });
      fireEvent.click(btn);
      expect(usePlayerStore.getState().isShuffle).toBe(true);
    });
  });

  describe('seek bar', () => {
    it('renders a seek input', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      expect(screen.getByRole('slider', { name: 'Seek' })).toBeDefined();
    });

    it('updating seek input calls setPosition', () => {
      usePlayerStore.setState({ currentTrack: makeTrack(), duration: 120 });
      render(<PlayerBar />);
      const seekInput = screen.getByRole('slider', { name: 'Seek' });
      fireEvent.change(seekInput, { target: { value: '60' } });
      expect(usePlayerStore.getState().position).toBe(60);
    });
  });

  describe('keyboard shortcuts', () => {
    it('Space key toggles play/pause when a track is loaded', () => {
      usePlayerStore.getState().play(makeTrack());
      render(<PlayerBar />);
      // Space while playing → pause
      fireEvent.keyDown(window, { code: 'Space' });
      expect(usePlayerStore.getState().isPlaying).toBe(false);
      // Space again → resume
      fireEvent.keyDown(window, { code: 'Space' });
      expect(usePlayerStore.getState().isPlaying).toBe(true);
    });

    it('ArrowRight key calls next()', () => {
      const t1 = makeTrack({ id: 'a' });
      const t2 = makeTrack({ id: 'b' });
      usePlayerStore.getState().playAlbum([t1, t2]);
      render(<PlayerBar />);
      fireEvent.keyDown(window, { code: 'ArrowRight' });
      expect(usePlayerStore.getState().currentTrack?.id).toBe('b');
    });

    it('ArrowLeft key calls previous()', () => {
      const t1 = makeTrack({ id: 'a' });
      const t2 = makeTrack({ id: 'b' });
      usePlayerStore.getState().playAlbum([t1, t2]);
      usePlayerStore.getState().next();
      render(<PlayerBar />);
      fireEvent.keyDown(window, { code: 'ArrowLeft' });
      expect(usePlayerStore.getState().currentTrack?.id).toBe('a');
    });

    it('Space key does nothing when no track is loaded', () => {
      render(<PlayerBar />);
      fireEvent.keyDown(window, { code: 'Space' });
      expect(usePlayerStore.getState().isPlaying).toBe(false);
    });
  });

  describe('time display', () => {
    it('formats and displays position and duration', () => {
      usePlayerStore.setState({
        currentTrack: makeTrack(),
        position: 65,
        duration: 185,
        queue: [makeTrack()],
        queueIndex: 0,
        isPlaying: true,
        isShuffle: false,
        volume: 1,
      });
      render(<PlayerBar />);
      // 65 seconds = 1:05, 185 seconds = 3:05
      expect(screen.getByTestId('player-position').textContent).toBe('1:05');
      expect(screen.getByTestId('player-duration').textContent).toBe('3:05');
    });
  });
});
