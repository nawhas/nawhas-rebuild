import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PlayerBarSpacer } from '../PlayerBarSpacer';
import { usePlayerStore } from '@/store/player';
import type { TrackDTO } from '@nawhas/types';

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

afterEach(() => {
  cleanup();
});

describe('PlayerBarSpacer', () => {
  it('renders nothing when no track is loaded', () => {
    const { container } = render(<PlayerBarSpacer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an 80px spacer when a track is loaded', () => {
    usePlayerStore.getState().play(makeTrack());
    const { container } = render(<PlayerBarSpacer />);
    const spacer = container.firstChild as HTMLElement | null;
    expect(spacer).not.toBeNull();
    expect(spacer?.className).toContain('h-20');
    expect(spacer?.getAttribute('aria-hidden')).toBe('true');
  });
});
