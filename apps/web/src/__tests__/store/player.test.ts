// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';

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
// Reset store state between tests
// ---------------------------------------------------------------------------

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
// Tests
// ---------------------------------------------------------------------------

describe('usePlayerStore — play()', () => {
  it('sets the current track, queue, and starts playing', () => {
    const track = makeTrack();
    usePlayerStore.getState().play(track);

    const state = usePlayerStore.getState();
    expect(state.currentTrack).toEqual(track);
    expect(state.queue).toEqual([track]);
    expect(state.queueIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
    expect(state.position).toBe(0);
    expect(state.duration).toBe(120);
  });

  it('uses 0 for duration when track.duration is null', () => {
    const track = makeTrack({ duration: null });
    usePlayerStore.getState().play(track);
    expect(usePlayerStore.getState().duration).toBe(0);
  });
});

describe('usePlayerStore — pause()', () => {
  it('sets isPlaying to false', () => {
    usePlayerStore.getState().play(makeTrack());
    usePlayerStore.getState().pause();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe('usePlayerStore — resume()', () => {
  it('resumes playback when a track is loaded', () => {
    usePlayerStore.getState().play(makeTrack());
    usePlayerStore.getState().pause();
    usePlayerStore.getState().resume();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('does nothing when no track is loaded', () => {
    usePlayerStore.getState().resume();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe('usePlayerStore — next()', () => {
  it('advances to the next track in the queue', () => {
    const t1 = makeTrack({ id: 'a', title: 'A' });
    const t2 = makeTrack({ id: 'b', title: 'B' });
    usePlayerStore.getState().playAlbum([t1, t2]);
    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe('b');
    expect(state.queueIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
  });

  it('stops and clears state when reaching the end of the queue', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    usePlayerStore.getState().playAlbum([t1, t2]);
    usePlayerStore.getState().next(); // → b
    usePlayerStore.getState().next(); // → end of queue, should stop

    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toHaveLength(0);
    expect(state.queueIndex).toBe(-1);
    expect(state.isPlaying).toBe(false);
  });

  it('does nothing when the queue is empty', () => {
    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().currentTrack).toBeNull();
  });
});

describe('usePlayerStore — previous()', () => {
  it('goes to the previous track when position <= 3 seconds', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    usePlayerStore.getState().playAlbum([t1, t2]);
    usePlayerStore.getState().next(); // now on b
    usePlayerStore.getState().previous();

    expect(usePlayerStore.getState().currentTrack?.id).toBe('a');
    expect(usePlayerStore.getState().queueIndex).toBe(0);
  });

  it('restarts current track when position > 3 seconds', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    usePlayerStore.getState().playAlbum([t1, t2]);
    usePlayerStore.getState().next(); // now on b
    usePlayerStore.getState().setPosition(10);
    usePlayerStore.getState().previous();

    expect(usePlayerStore.getState().currentTrack?.id).toBe('b');
    expect(usePlayerStore.getState().position).toBe(0);
  });

  it('wraps from first track to last when position <= 3', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    usePlayerStore.getState().playAlbum([t1, t2]);
    usePlayerStore.getState().previous(); // from index 0 → wraps to index 1

    expect(usePlayerStore.getState().currentTrack?.id).toBe('b');
    expect(usePlayerStore.getState().queueIndex).toBe(1);
  });

  it('does nothing when the queue is empty', () => {
    usePlayerStore.getState().previous();
    expect(usePlayerStore.getState().currentTrack).toBeNull();
  });
});

describe('usePlayerStore — addToQueue()', () => {
  it('appends a track to the existing queue', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    usePlayerStore.getState().play(t1);
    usePlayerStore.getState().addToQueue(t2);

    expect(usePlayerStore.getState().queue).toHaveLength(2);
    expect(usePlayerStore.getState().queue[1]?.id).toBe('b');
  });
});

describe('usePlayerStore — playAlbum()', () => {
  it('loads all tracks and starts from the first', () => {
    const tracks = [
      makeTrack({ id: 'a', title: 'A' }),
      makeTrack({ id: 'b', title: 'B' }),
      makeTrack({ id: 'c', title: 'C' }),
    ];
    usePlayerStore.getState().playAlbum(tracks);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(3);
    expect(state.currentTrack?.id).toBe('a');
    expect(state.queueIndex).toBe(0);
    expect(state.isPlaying).toBe(true);
  });

  it('does nothing when passed an empty array', () => {
    usePlayerStore.getState().playAlbum([]);
    expect(usePlayerStore.getState().currentTrack).toBeNull();
  });
});

describe('usePlayerStore — setPosition()', () => {
  it('updates the position', () => {
    usePlayerStore.getState().setPosition(45);
    expect(usePlayerStore.getState().position).toBe(45);
  });

  it('clamps negative values to 0', () => {
    usePlayerStore.getState().setPosition(-5);
    expect(usePlayerStore.getState().position).toBe(0);
  });
});

describe('usePlayerStore — toggleShuffle()', () => {
  it('toggles isShuffle on and off', () => {
    expect(usePlayerStore.getState().isShuffle).toBe(false);
    usePlayerStore.getState().toggleShuffle();
    expect(usePlayerStore.getState().isShuffle).toBe(true);
    usePlayerStore.getState().toggleShuffle();
    expect(usePlayerStore.getState().isShuffle).toBe(false);
  });
});

describe('usePlayerStore — setVolume()', () => {
  it('sets volume within bounds', () => {
    usePlayerStore.getState().setVolume(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);
  });

  it('clamps values above 1 to 1', () => {
    usePlayerStore.getState().setVolume(2);
    expect(usePlayerStore.getState().volume).toBe(1);
  });

  it('clamps values below 0 to 0', () => {
    usePlayerStore.getState().setVolume(-0.5);
    expect(usePlayerStore.getState().volume).toBe(0);
  });
});

describe('usePlayerStore — removeFromQueue()', () => {
  it('removes a track at the given index', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    const t3 = makeTrack({ id: 'c' });
    usePlayerStore.getState().playAlbum([t1, t2, t3]);
    usePlayerStore.getState().removeFromQueue(1); // remove 'b'

    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('keeps queueIndex pointing at the current track after removal of a preceding track', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    const t3 = makeTrack({ id: 'c' });
    usePlayerStore.getState().playAlbum([t1, t2, t3]);
    usePlayerStore.getState().next(); // now playing 'b' at index 1
    usePlayerStore.getState().removeFromQueue(0); // remove 'a'

    // 'b' is now at index 0
    expect(usePlayerStore.getState().queueIndex).toBe(0);
    expect(usePlayerStore.getState().currentTrack?.id).toBe('b');
  });

  it('stops playback when the currently playing track is removed', () => {
    const t1 = makeTrack({ id: 'a' });
    const t2 = makeTrack({ id: 'b' });
    usePlayerStore.getState().playAlbum([t1, t2]);
    usePlayerStore.getState().removeFromQueue(0); // remove currently playing 'a'

    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.isPlaying).toBe(false);
  });

  it('ignores out-of-range indices', () => {
    const t1 = makeTrack({ id: 'a' });
    usePlayerStore.getState().play(t1);
    usePlayerStore.getState().removeFromQueue(5);

    expect(usePlayerStore.getState().queue).toHaveLength(1);
  });
});

describe('usePlayerStore — toggleQueue()', () => {
  it('toggles isQueueOpen on and off', () => {
    expect(usePlayerStore.getState().isQueueOpen).toBe(false);
    usePlayerStore.getState().toggleQueue();
    expect(usePlayerStore.getState().isQueueOpen).toBe(true);
    usePlayerStore.getState().toggleQueue();
    expect(usePlayerStore.getState().isQueueOpen).toBe(false);
  });
});

describe('usePlayerStore — reorderQueue()', () => {
  it('moves a track from one position to another', () => {
    const tracks = [
      makeTrack({ id: 'a' }),
      makeTrack({ id: 'b' }),
      makeTrack({ id: 'c' }),
    ];
    usePlayerStore.getState().playAlbum(tracks);
    usePlayerStore.getState().reorderQueue(0, 2); // move 'a' to end

    const queue = usePlayerStore.getState().queue;
    expect(queue.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('keeps queueIndex pointing at the current track after reorder', () => {
    const tracks = [
      makeTrack({ id: 'a' }),
      makeTrack({ id: 'b' }),
      makeTrack({ id: 'c' }),
    ];
    usePlayerStore.getState().playAlbum(tracks);
    // current is 'a' at index 0; move 'a' from 0 to 2
    usePlayerStore.getState().reorderQueue(0, 2);

    expect(usePlayerStore.getState().queueIndex).toBe(2);
    expect(usePlayerStore.getState().currentTrack?.id).toBe('a');
  });

  it('does nothing when from === to', () => {
    const tracks = [makeTrack({ id: 'a' }), makeTrack({ id: 'b' })];
    usePlayerStore.getState().playAlbum(tracks);
    usePlayerStore.getState().reorderQueue(0, 0);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('ignores out-of-range indices', () => {
    const tracks = [makeTrack({ id: 'a' }), makeTrack({ id: 'b' })];
    usePlayerStore.getState().playAlbum(tracks);
    usePlayerStore.getState().reorderQueue(-1, 1);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
