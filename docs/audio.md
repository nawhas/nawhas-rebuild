# Audio Player

The audio player is built on [Howler.js](https://howlerjs.com/) with [Zustand](https://zustand.pmnd.rs/) as the state store. The two are deliberately decoupled: Zustand is the single source of truth; Howler is a side-effect that reacts to store changes.

## Architecture

```
┌──────────────────────────────────────────────┐
│              React components                 │
│  (player bar, queue, track page controls)     │
└───────────────┬──────────────────────────────┘
                │ read/write
                ▼
┌──────────────────────────────────────────────┐
│         Zustand PlayerStore                   │
│  currentTrack · queue · isPlaying · position  │
│  duration · volume · shuffle · lyrics         │
└───────────────┬──────────────────────────────┘
                │ subscribe
                ▼
┌──────────────────────────────────────────────┐
│         AudioEngine (singleton)               │
│       apps/web/src/lib/audio-engine.ts        │
│                                              │
│  Howler.js Howl instance                     │
│  250ms position sync interval                │
│  seek / play / pause / unload                │
└──────────────────────────────────────────────┘
```

**Key files:**
- `apps/web/src/lib/audio-engine.ts` — Howler.js wrapper and store subscriber
- `apps/web/src/store/player.ts` — Zustand store (state + actions)
- `apps/web/src/components/providers/audio-provider.tsx` — mounts the engine on app load

## Zustand Player Store

### State

```typescript
interface PlayerState {
  currentTrack: TrackDTO | null;
  queue: TrackDTO[];
  queueIndex: number;       // -1 = no track loaded
  isPlaying: boolean;
  isShuffle: boolean;
  isQueueOpen: boolean;
  isMobileOverlayOpen: boolean;
  currentLyrics: LyricDTO[];
  position: number;         // seconds (updated every 250ms by AudioEngine)
  duration: number;         // seconds
  volume: number;           // 0–1
}
```

### Actions

```typescript
interface PlayerActions {
  play(track: TrackDTO): void;          // load + start playing
  pause(): void;
  resume(): void;
  next(): void;                         // advance queue (random if shuffle)
  previous(): void;                     // restart if > 3s in, else go back
  addToQueue(track: TrackDTO): void;
  removeFromQueue(index: number): void; // stops playback if current track
  playAlbum(tracks: TrackDTO[]): void;  // replace queue, play first track
  setPosition(seconds: number): void;  // seek
  toggleShuffle(): void;
  setVolume(level: number): void;       // clamped 0–1
  reorderQueue(from: number, to: number): void;
  toggleQueue(): void;
  toggleMobileOverlay(): void;
  openMobileOverlay(): void;
  closeMobileOverlay(): void;
  setCurrentLyrics(lyrics: LyricDTO[]): void;
}
```

### Reading store state in components

```typescript
import { usePlayerStore } from '@/store/player';

// Subscribe to only the slice you need to avoid unnecessary re-renders
const isPlaying = usePlayerStore((s) => s.isPlaying);
const currentTrack = usePlayerStore((s) => s.currentTrack);

// Or use a named selector
import { selectCurrentTrack, selectVolume } from '@/store/player';
const track = usePlayerStore(selectCurrentTrack);
```

### Triggering playback

```typescript
const play = usePlayerStore((s) => s.play);

// Play a single track
play(track);

// Replace queue and play from an album
const playAlbum = usePlayerStore((s) => s.playAlbum);
playAlbum(album.tracks);
```

## AudioEngine

The `AudioEngine` is a module-level singleton instantiated once. It subscribes to the Zustand store and drives Howler.js in response to state changes.

### Lifecycle

```typescript
// Mounted once in AudioProvider (apps/web/src/components/providers/audio-provider.tsx)
audioEngine.init();    // subscribes to store, no-op if already initialised

// On unmount (hot reload, navigation away)
audioEngine.destroy(); // clears interval, unloads Howl, unsubscribes
```

`AudioProvider` is rendered in the root layout, so `init()` runs once when the app first loads in the browser.

### Key behaviours

**HTML5 streaming mode** — Howl is always created with `html5: true`. This is required for:
- iOS background audio
- Streaming large MP3s without buffering the entire file
- CORS audio requests from MinIO/S3

**Position sync** — every 250ms while playing, the engine reads `howl.seek()` and writes it to the Zustand store. Components read `position` from the store, not from Howler directly.

**External seek detection** — when `position` changes in the store by more than 0.5 seconds (i.e. the user dragged the scrubber), the engine calls `howl.seek()` to apply the seek. This threshold prevents the engine from chasing its own 250ms updates.

**Auto-advance on error** — if Howler fires `onloaderror` or `onplayerror`, the engine calls `store.next()` to skip to the next queued track. On iOS, `onplayerror` waits for the browser's audio unlock event before retrying.

**CORS** — `crossOrigin: 'anonymous'` is set on the underlying `HTMLAudioElement` so Web Audio API features can be used in the future.

### Adding a new audio source

Tracks can have either an `audioUrl` (MinIO/S3 direct MP3) or a `youtubeId`. The player bar switches between an audio player tab and a YouTube embed tab based on which fields are populated.

To add support for a third source type, add the field to the `tracks` schema, update the tRPC track router, and add a new tab to the player bar component.

## Testing the Audio Engine

The `AudioEngine` and `PlayerStore` are tested in `apps/web/src/__tests__/lib/audio-engine.test.ts` (367 lines).

Key test patterns:
- `vi.mock('howler')` — Howl constructor is mocked; no real audio context needed
- `vi.useFakeTimers()` — the 250ms sync interval is tested by advancing fake time
- Store actions are called directly to drive the engine through state transitions

Example:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('howler');

describe('AudioEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    audioEngine.init();
  });

  it('starts the 250ms sync interval when play is called', () => {
    usePlayerStore.getState().play(mockTrack);
    vi.advanceTimersByTime(250);
    expect(mockHowl.seek).toHaveBeenCalled();
  });
});
```

For E2E audio tests, see `apps/e2e/tests/audio-playback.spec.ts`. The seeded MP3 fixtures are minimal (< 1 second) so auto-advance tests complete quickly.
