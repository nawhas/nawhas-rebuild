import { create } from 'zustand';
import type { LyricDTO, TrackDTO } from '@nawhas/types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface PlayerState {
  currentTrack: TrackDTO | null;
  queue: TrackDTO[];
  queueIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isQueueOpen: boolean;
  isMobileOverlayOpen: boolean;
  currentLyrics: LyricDTO[];
  position: number; // seconds
  duration: number; // seconds
  volume: number; // 0–1
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface PlayerActions {
  play: (track: TrackDTO) => void;
  pause: () => void;
  resume: () => void;
  /** Dismiss the player: clear the current track and queue, reset position. */
  stop: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: TrackDTO) => void;
  removeFromQueue: (index: number) => void;
  playAlbum: (tracks: TrackDTO[]) => void;
  setPosition: (seconds: number) => void;
  toggleShuffle: () => void;
  setVolume: (level: number) => void;
  reorderQueue: (from: number, to: number) => void;
  toggleQueue: () => void;
  toggleMobileOverlay: () => void;
  openMobileOverlay: () => void;
  closeMobileOverlay: () => void;
  setCurrentLyrics: (lyrics: LyricDTO[]) => void;
}

export type PlayerStore = PlayerState & PlayerActions;

// ---------------------------------------------------------------------------
// Selectors — typed accessors for each piece of state
// ---------------------------------------------------------------------------

export const selectCurrentTrack = (s: PlayerStore) => s.currentTrack;
export const selectQueue = (s: PlayerStore) => s.queue;
export const selectQueueIndex = (s: PlayerStore) => s.queueIndex;
export const selectIsPlaying = (s: PlayerStore) => s.isPlaying;
export const selectIsShuffle = (s: PlayerStore) => s.isShuffle;
export const selectIsQueueOpen = (s: PlayerStore) => s.isQueueOpen;
export const selectIsMobileOverlayOpen = (s: PlayerStore) => s.isMobileOverlayOpen;
export const selectCurrentLyrics = (s: PlayerStore) => s.currentLyrics;
export const selectPosition = (s: PlayerStore) => s.position;
export const selectDuration = (s: PlayerStore) => s.duration;
export const selectVolume = (s: PlayerStore) => s.volume;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultState: PlayerState = {
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
};

// ---------------------------------------------------------------------------
// Store — singleton, no SSR hydration concerns (audio is client-only)
// ---------------------------------------------------------------------------

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  ...defaultState,

  play(track) {
    set({
      currentTrack: track,
      queue: [track],
      queueIndex: 0,
      isPlaying: true,
      position: 0,
      duration: track.duration ?? 0,
      currentLyrics: [],
    });
  },

  pause() {
    set({ isPlaying: false });
  },

  resume() {
    if (get().currentTrack !== null) {
      set({ isPlaying: true });
    }
  },

  stop() {
    set({
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      position: 0,
      duration: 0,
      currentLyrics: [],
      isQueueOpen: false,
      isMobileOverlayOpen: false,
    });
  },

  next() {
    const { queue, queueIndex, isShuffle } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      // End of queue — stop playback and clear state.
      if (nextIndex >= queue.length) {
        set({ currentTrack: null, queue: [], queueIndex: -1, isPlaying: false, position: 0, duration: 0 });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (!nextTrack) return;
    set({
      currentTrack: nextTrack,
      queueIndex: nextIndex,
      isPlaying: true,
      position: 0,
      duration: nextTrack.duration ?? 0,
    });
  },

  previous() {
    const { queue, queueIndex, position } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current track instead of going back.
    if (position > 3) {
      set({ position: 0 });
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIndex];
    if (!prevTrack) return;
    set({
      currentTrack: prevTrack,
      queueIndex: prevIndex,
      isPlaying: true,
      position: 0,
      duration: prevTrack.duration ?? 0,
    });
  },

  addToQueue(track) {
    set((state) => ({ queue: [...state.queue, track] }));
  },

  removeFromQueue(index) {
    const { queue, queueIndex, currentTrack } = get();
    if (index < 0 || index >= queue.length) return;

    const next = queue.filter((_, i) => i !== index);

    // Keep queueIndex pointing at the same track after removal.
    let newQueueIndex = queueIndex;
    if (currentTrack) {
      const idx = next.findIndex((t) => t.id === currentTrack.id);
      newQueueIndex = idx; // -1 if removed track was the current one
    }

    // If the currently playing track was removed, stop playback.
    if (newQueueIndex === -1) {
      set({ queue: next, currentTrack: null, queueIndex: -1, isPlaying: false, position: 0, duration: 0 });
    } else {
      set({ queue: next, queueIndex: newQueueIndex });
    }
  },

  toggleQueue() {
    set((state) => ({ isQueueOpen: !state.isQueueOpen }));
  },

  toggleMobileOverlay() {
    set((state) => ({ isMobileOverlayOpen: !state.isMobileOverlayOpen }));
  },

  openMobileOverlay() {
    set({ isMobileOverlayOpen: true });
  },

  closeMobileOverlay() {
    set({ isMobileOverlayOpen: false });
  },

  setCurrentLyrics(lyrics) {
    set({ currentLyrics: lyrics });
  },

  playAlbum(tracks) {
    if (tracks.length === 0) return;
    const first = tracks[0];
    if (!first) return;
    set({
      currentTrack: first,
      queue: tracks,
      queueIndex: 0,
      isPlaying: true,
      position: 0,
      duration: first.duration ?? 0,
    });
  },

  setPosition(seconds) {
    set({ position: Math.max(0, seconds) });
  },

  toggleShuffle() {
    set((state) => ({ isShuffle: !state.isShuffle }));
  },

  setVolume(level) {
    set({ volume: Math.min(1, Math.max(0, level)) });
  },

  reorderQueue(from, to) {
    const { queue, queueIndex, currentTrack } = get();
    if (from === to) return;
    if (from < 0 || from >= queue.length) return;
    if (to < 0 || to >= queue.length) return;

    const reordered = [...queue];
    const [moved] = reordered.splice(from, 1);
    if (!moved) return;
    reordered.splice(to, 0, moved);

    // Keep queueIndex pointing at the same track after reorder.
    let newQueueIndex = queueIndex;
    if (currentTrack) {
      const idx = reordered.findIndex((t) => t.id === currentTrack.id);
      if (idx !== -1) newQueueIndex = idx;
    }

    set({ queue: reordered, queueIndex: newQueueIndex });
  },
}));
