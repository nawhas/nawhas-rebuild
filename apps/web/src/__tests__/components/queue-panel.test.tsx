import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';
import { QueuePanel } from '@/components/player/QueuePanel';

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
    isQueueOpen: false,
    position: 0,
    duration: 0,
    volume: 1,
  });
});

// ---------------------------------------------------------------------------
// QueuePanel visibility
// ---------------------------------------------------------------------------

describe('QueuePanel — visibility', () => {
  it('is not visible (translated off-screen) when isQueueOpen is false', () => {
    render(<QueuePanel />);
    const dialog = screen.getByRole('dialog', { name: 'Playback queue' });
    expect(dialog.className).toContain('translate-x-full');
  });

  it('is visible when isQueueOpen is true', () => {
    usePlayerStore.setState({ isQueueOpen: true });
    render(<QueuePanel />);
    const dialog = screen.getByRole('dialog', { name: 'Playback queue' });
    expect(dialog.className).toContain('translate-x-0');
  });

  it('closes when the close button is clicked', () => {
    usePlayerStore.setState({ isQueueOpen: true });
    render(<QueuePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Close queue' }));
    expect(usePlayerStore.getState().isQueueOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// QueuePanel — empty state
// ---------------------------------------------------------------------------

describe('QueuePanel — empty state', () => {
  it('shows empty state message when queue is empty', () => {
    usePlayerStore.setState({ isQueueOpen: true });
    render(<QueuePanel />);
    expect(screen.getByText('Your queue is empty.')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// QueuePanel — track list
// ---------------------------------------------------------------------------

describe('QueuePanel — track list', () => {
  it('renders all queued tracks', () => {
    const t1 = makeTrack({ id: 'a', title: 'Track Alpha' });
    const t2 = makeTrack({ id: 'b', title: 'Track Beta' });
    usePlayerStore.setState({
      queue: [t1, t2],
      queueIndex: 0,
      currentTrack: t1,
      isQueueOpen: true,
    });
    render(<QueuePanel />);
    expect(screen.getByText('Track Alpha')).toBeDefined();
    expect(screen.getByText('Track Beta')).toBeDefined();
  });

  it('shows track count in the header', () => {
    const tracks = [makeTrack({ id: 'a' }), makeTrack({ id: 'b' })];
    usePlayerStore.setState({ queue: tracks, isQueueOpen: true });
    render(<QueuePanel />);
    expect(screen.getByText('2 tracks')).toBeDefined();
  });

  it('shows speaker icon for the currently active track', () => {
    const t1 = makeTrack({ id: 'a', title: 'Active Track' });
    const t2 = makeTrack({ id: 'b', title: 'Queued Track' });
    usePlayerStore.setState({
      queue: [t1, t2],
      queueIndex: 0,
      currentTrack: t1,
      isPlaying: true,
      isQueueOpen: true,
    });
    render(<QueuePanel />);
    // The active track row has aria-current
    const items = screen.getAllByRole('listitem');
    expect(items[0]?.getAttribute('aria-current')).toBe('true');
    expect(items[1]?.getAttribute('aria-current')).toBeNull();
  });

  it('renders a remove button for each track', () => {
    const t1 = makeTrack({ id: 'a', title: 'Alpha' });
    const t2 = makeTrack({ id: 'b', title: 'Beta' });
    usePlayerStore.setState({ queue: [t1, t2], isQueueOpen: true });
    render(<QueuePanel />);
    expect(screen.getByRole('button', { name: 'Remove Alpha from queue' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove Beta from queue' })).toBeDefined();
  });

  it('removes a track when the remove button is clicked', () => {
    const t1 = makeTrack({ id: 'a', title: 'Alpha' });
    const t2 = makeTrack({ id: 'b', title: 'Beta' });
    usePlayerStore.setState({
      queue: [t1, t2],
      queueIndex: 0,
      currentTrack: t1,
      isQueueOpen: true,
    });
    render(<QueuePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Beta from queue' }));
    expect(usePlayerStore.getState().queue).toHaveLength(1);
    expect(usePlayerStore.getState().queue[0]?.id).toBe('a');
  });
});
