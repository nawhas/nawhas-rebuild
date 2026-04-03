'use client';

import { Howl, Howler } from 'howler';
import { usePlayerStore } from '@/store/player';
import type { PlayerStore } from '@/store/player';

/**
 * AudioEngine — singleton that drives Howler.js from Zustand player store state.
 *
 * Lifecycle:
 *  - init(): called once from AudioProvider on mount; subscribes to the store
 *  - destroy(): called on unmount; cleans up interval, unloads Howl, unsubscribes
 *
 * Design notes:
 *  - html5: true is required for streaming large MP3s and iOS background audio
 *  - Position is synced from Howl → store every 250 ms while playing
 *  - External seeks (user scrubbing) are detected by a > 0.5 s delta between
 *    the store position and the last position written by this engine
 *  - On track load error or natural end, store.next() advances the queue
 */
class AudioEngine {
  private howl: Howl | null = null;
  private positionInterval: ReturnType<typeof setInterval> | null = null;
  /** ID of the track currently loaded — null means no track is loaded. */
  private loadedTrackId: string | null = null;
  /**
   * Last position (seconds) written by this engine into the store.
   * Used to distinguish timer-driven position updates from user-initiated seeks.
   */
  private internalPosition: number = 0;
  private unsubscribe: (() => void) | null = null;

  /** Initialise the engine and subscribe to the Zustand player store. */
  init(): void {
    const initialState = usePlayerStore.getState();
    // Apply initial volume before any audio loads.
    Howler.volume(initialState.volume);
    this.unsubscribe = usePlayerStore.subscribe(this.handleStateChange);
  }

  /** Tear down all resources. Safe to call multiple times. */
  destroy(): void {
    this.stopPositionSync();
    this.howl?.unload();
    this.howl = null;
    this.loadedTrackId = null;
    this.internalPosition = 0;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  // ---------------------------------------------------------------------------
  // Private — store subscription handler
  // ---------------------------------------------------------------------------

  private handleStateChange = (state: PlayerStore, prevState: PlayerStore): void => {
    const { currentTrack, isPlaying, volume, position } = state;
    const trackId = currentTrack?.id ?? null;

    // Track identity changed — tear down current Howl and load the new one.
    if (trackId !== this.loadedTrackId) {
      this.loadedTrackId = trackId;
      this.loadTrack(currentTrack?.audioUrl ?? null, isPlaying);
      return; // loadTrack handles the initial play state.
    }

    // Play / pause transitions.
    if (isPlaying !== prevState.isPlaying) {
      if (isPlaying) {
        this.howl?.play();
      } else {
        this.howl?.pause();
      }
    }

    // Global volume changes.
    if (volume !== prevState.volume) {
      Howler.volume(volume);
    }

    // External seek: user dragged the scrubber, causing a large position jump.
    // Threshold of 0.5 s avoids chasing our own 250 ms timer updates.
    if (Math.abs(position - this.internalPosition) > 0.5) {
      this.howl?.seek(position);
      this.internalPosition = position;
    }
  };

  // ---------------------------------------------------------------------------
  // Private — Howl lifecycle
  // ---------------------------------------------------------------------------

  private loadTrack(url: string | null, autoPlay: boolean): void {
    this.stopPositionSync();
    this.howl?.unload();
    this.howl = null;
    this.internalPosition = 0;

    if (!url) {
      // No audio URL on the current track — skip to next.
      usePlayerStore.getState().next();
      return;
    }

    const howl = new Howl({
      src: [url],
      // html5: true enables streaming (avoids full download before play) and
      // is required for iOS background audio.
      html5: true,

      onload: () => {
        // Prefer the actual audio metadata duration over the stored estimate.
        const actualDuration = howl.duration();
        if (actualDuration > 0) {
          usePlayerStore.setState({ duration: actualDuration });
        }

        // Set crossOrigin: "anonymous" on the underlying HTMLAudioElement so
        // CORS-restricted responses are usable with Web Audio API if needed.
        const sounds = (
          howl as unknown as { _sounds: Array<{ _node?: HTMLAudioElement }> }
        )._sounds;
        const audioNode = sounds?.[0]?._node;
        if (audioNode) {
          audioNode.crossOrigin = 'anonymous';
        }
      },

      onplay: () => {
        this.startPositionSync();
      },

      onpause: () => {
        this.stopPositionSync();
      },

      onstop: () => {
        this.stopPositionSync();
      },

      onend: () => {
        // Track finished naturally — advance to next in queue.
        this.stopPositionSync();
        usePlayerStore.getState().next();
      },

      onloaderror: (_id: number, error: unknown) => {
        console.error('[AudioEngine] Failed to load audio:', url, error);
        // Mark track as errored by skipping to next.
        usePlayerStore.getState().next();
      },

      onplayerror: (_id: number, error: unknown) => {
        console.error('[AudioEngine] Playback error:', error);
        // Common on iOS — retry once the AudioContext is unlocked by a user gesture.
        howl.once('unlock', () => {
          howl.play();
        });
      },
    });

    this.howl = howl;

    if (autoPlay) {
      howl.play();
    }
  }

  // ---------------------------------------------------------------------------
  // Private — position sync interval
  // ---------------------------------------------------------------------------

  private startPositionSync(): void {
    if (this.positionInterval !== null) return; // already running
    this.positionInterval = setInterval(() => {
      if (!this.howl?.playing()) return;
      const pos = this.howl.seek() as number;
      if (typeof pos !== 'number' || !isFinite(pos)) return;
      this.internalPosition = pos;
      usePlayerStore.getState().setPosition(pos);
    }, 250);
  }

  private stopPositionSync(): void {
    if (this.positionInterval !== null) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }
}

/**
 * Module-level singleton — the engine is imported and `.init()` / `.destroy()`
 * are called by AudioProvider in the React tree.
 */
export const audioEngine = new AudioEngine();
