// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { TrackDTO } from '@nawhas/types';
import { usePlayerStore } from '@/store/player';

// ---------------------------------------------------------------------------
// Hoist shared mock state so vi.mock factory can reference it
// ---------------------------------------------------------------------------

const { mockHowlerVolume, MockHowl, getLastHowlInstance } = vi.hoisted(() => {
  const mockHowlerVolume = vi.fn();

  type HowlInstance = {
    play: Mock;
    pause: Mock;
    seek: Mock;
    unload: Mock;
    duration: Mock;
    playing: Mock;
    once: Mock;
    _sounds: Array<{ _node: Partial<HTMLAudioElement> }>;
    _onload: (() => void) | undefined;
    _onplay: (() => void) | undefined;
    _onpause: (() => void) | undefined;
    _onstop: (() => void) | undefined;
    _onend: (() => void) | undefined;
    _onloaderror: ((id: number, err: unknown) => void) | undefined;
    _onplayerror: ((id: number, err: unknown) => void) | undefined;
  };

  let lastInstance: HowlInstance | null = null;

  function makeFreshInstance(): HowlInstance {
    return {
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      unload: vi.fn(),
      duration: vi.fn().mockReturnValue(0),
      playing: vi.fn().mockReturnValue(false),
      once: vi.fn(),
      _sounds: [{ _node: {} }],
      _onload: undefined,
      _onplay: undefined,
      _onpause: undefined,
      _onstop: undefined,
      _onend: undefined,
      _onloaderror: undefined,
      _onplayerror: undefined,
    };
  }

  // Must use function syntax (not arrow) so it can be called with `new`.
  const MockHowl = vi.fn().mockImplementation(function (this: unknown, opts: {
    onload?: () => void;
    onplay?: () => void;
    onpause?: () => void;
    onstop?: () => void;
    onend?: () => void;
    onloaderror?: (id: number, err: unknown) => void;
    onplayerror?: (id: number, err: unknown) => void;
  }) {
    lastInstance = makeFreshInstance();
    lastInstance._onload = opts.onload;
    lastInstance._onplay = opts.onplay;
    lastInstance._onpause = opts.onpause;
    lastInstance._onstop = opts.onstop;
    lastInstance._onend = opts.onend;
    lastInstance._onloaderror = opts.onloaderror;
    lastInstance._onplayerror = opts.onplayerror;
    return lastInstance;
  });

  const getLastHowlInstance = () => lastInstance;

  return { mockHowlerVolume, MockHowl, getLastHowlInstance };
});

vi.mock('howler', () => ({
  Howl: MockHowl,
  Howler: { volume: mockHowlerVolume },
}));

// ---------------------------------------------------------------------------
// Import the engine AFTER mocking howler
// ---------------------------------------------------------------------------

import { audioEngine } from '@/lib/audio-engine';

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
    audioUrl: 'audioUrl' in overrides ? overrides.audioUrl ?? null : 'https://example.com/audio.mp3',
    youtubeId: overrides.youtubeId ?? null,
    duration: 'duration' in overrides ? (overrides.duration ?? null) : 120,
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-01'),
  };
}

const DEFAULT_STATE = {
  currentTrack: null as TrackDTO | null,
  queue: [] as TrackDTO[],
  queueIndex: -1,
  isPlaying: false,
  isShuffle: false,
  position: 0,
  duration: 0,
  volume: 1,
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  MockHowl.mockClear();
  mockHowlerVolume.mockClear();
  usePlayerStore.setState(DEFAULT_STATE);
  audioEngine.destroy();
});

afterEach(() => {
  audioEngine.destroy();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests — init
// ---------------------------------------------------------------------------

describe('AudioEngine — init()', () => {
  it('sets global Howler volume from store on init', async () => {
    usePlayerStore.setState({ volume: 0.6 });
    await audioEngine.init();
    expect(mockHowlerVolume).toHaveBeenCalledWith(0.6);
  });
});

// ---------------------------------------------------------------------------
// Tests — track loading
// ---------------------------------------------------------------------------

describe('AudioEngine — track loading', () => {
  it('creates a Howl instance when currentTrack with audioUrl is set', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack({ audioUrl: 'https://example.com/audio.mp3' }));

    expect(MockHowl).toHaveBeenCalledOnce();
    expect(MockHowl).toHaveBeenCalledWith(
      expect.objectContaining({ src: ['https://example.com/audio.mp3'], html5: true }),
    );
  });

  it('calls next() when currentTrack has no audioUrl', async () => {
    await audioEngine.init();
    const nextSpy = vi.spyOn(usePlayerStore.getState(), 'next');
    usePlayerStore.getState().play(makeTrack({ audioUrl: null }));

    expect(MockHowl).not.toHaveBeenCalled();
    expect(nextSpy).toHaveBeenCalled();
  });

  it('unloads the previous Howl when a new track is loaded', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack({ id: 'track-a', audioUrl: 'https://example.com/a.mp3' }));

    const firstInstance = getLastHowlInstance();
    expect(firstInstance).not.toBeNull();

    usePlayerStore.getState().play(makeTrack({ id: 'track-b', audioUrl: 'https://example.com/b.mp3' }));

    expect(firstInstance?.unload).toHaveBeenCalled();
  });

  it('updates store duration from actual audio metadata on load', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack({ audioUrl: 'https://example.com/audio.mp3' }));

    const instance = getLastHowlInstance();
    instance!.duration.mockReturnValue(234);
    instance!._onload?.();

    expect(usePlayerStore.getState().duration).toBe(234);
  });

  it('sets crossOrigin on the underlying audio element after load', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());

    const instance = getLastHowlInstance()!;
    const audioNode: Partial<HTMLAudioElement> & { crossOrigin?: string } = {};
    instance._sounds = [{ _node: audioNode }];
    instance._onload?.();

    expect(audioNode.crossOrigin).toBe('anonymous');
  });
});

// ---------------------------------------------------------------------------
// Tests — play / pause
// ---------------------------------------------------------------------------

describe('AudioEngine — play / pause', () => {
  it('calls howl.play() on autoPlay when track is set with isPlaying=true', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());
    expect(getLastHowlInstance()?.play).toHaveBeenCalled();
  });

  it('calls howl.pause() when store pauses', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());
    usePlayerStore.getState().pause();
    expect(getLastHowlInstance()?.pause).toHaveBeenCalled();
  });

  it('calls howl.play() when store resumes', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());
    usePlayerStore.getState().pause();
    const instance = getLastHowlInstance()!;
    instance.play.mockClear();
    usePlayerStore.getState().resume();
    expect(instance.play).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — volume
// ---------------------------------------------------------------------------

describe('AudioEngine — volume', () => {
  it('updates global Howler volume when store volume changes', async () => {
    await audioEngine.init();
    mockHowlerVolume.mockClear();
    usePlayerStore.getState().setVolume(0.4);
    expect(mockHowlerVolume).toHaveBeenCalledWith(0.4);
  });
});

// ---------------------------------------------------------------------------
// Tests — position sync
// ---------------------------------------------------------------------------

describe('AudioEngine — position sync', () => {
  it('syncs position to store every 250 ms while playing', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());

    const instance = getLastHowlInstance()!;
    instance.playing.mockReturnValue(true);
    instance.seek.mockReturnValue(10);

    // Trigger onplay to start the interval.
    instance._onplay?.();

    vi.advanceTimersByTime(750);

    expect(usePlayerStore.getState().position).toBeCloseTo(10);
  });

  it('does not update position when howl.playing() returns false', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());

    const instance = getLastHowlInstance()!;
    instance.playing.mockReturnValue(false);
    instance.seek.mockReturnValue(99);
    instance._onplay?.();

    vi.advanceTimersByTime(500);
    expect(usePlayerStore.getState().position).toBe(0);
  });

  it('stops position sync when onpause fires', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());

    const instance = getLastHowlInstance()!;
    instance.playing.mockReturnValue(true);
    instance.seek.mockReturnValue(5);
    instance._onplay?.();

    vi.advanceTimersByTime(250);
    expect(usePlayerStore.getState().position).toBeCloseTo(5);

    // Pause — interval should be cleared.
    instance._onpause?.();
    instance.seek.mockReturnValue(99);
    vi.advanceTimersByTime(500);
    expect(usePlayerStore.getState().position).toBeCloseTo(5);
  });
});

// ---------------------------------------------------------------------------
// Tests — external seek (scrubbing)
// ---------------------------------------------------------------------------

describe('AudioEngine — external seek', () => {
  it('seeks howl when store position jumps by more than 0.5 s', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());

    const instance = getLastHowlInstance()!;
    instance.playing.mockReturnValue(true);
    instance.seek.mockReturnValue(5);
    instance._onplay?.();
    vi.advanceTimersByTime(250);

    // User scrubs to 60 — large jump.
    instance.seek.mockClear();
    usePlayerStore.getState().setPosition(60);

    expect(instance.seek).toHaveBeenCalledWith(60);
  });

  it('does not seek howl for small position delta (timer update noise)', async () => {
    await audioEngine.init();
    usePlayerStore.getState().play(makeTrack());

    const instance = getLastHowlInstance()!;
    instance.playing.mockReturnValue(true);
    instance.seek.mockReturnValue(10.1);
    instance._onplay?.();
    vi.advanceTimersByTime(250);

    // Position moved by only 0.2 s — within threshold.
    instance.seek.mockClear();
    usePlayerStore.setState({ position: 10.3 });

    expect(instance.seek).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — auto-advance and error handling
// ---------------------------------------------------------------------------

describe('AudioEngine — auto-advance and error handling', () => {
  it('calls store.next() when track ends naturally', async () => {
    await audioEngine.init();
    const nextSpy = vi.spyOn(usePlayerStore.getState(), 'next');
    usePlayerStore.getState().play(makeTrack());
    getLastHowlInstance()?._onend?.();
    expect(nextSpy).toHaveBeenCalled();
  });

  it('calls store.next() on load error', async () => {
    await audioEngine.init();
    const nextSpy = vi.spyOn(usePlayerStore.getState(), 'next');
    usePlayerStore.getState().play(makeTrack());
    getLastHowlInstance()?._onloaderror?.(0, 'network error');
    expect(nextSpy).toHaveBeenCalled();
  });
});
