import { create } from 'zustand';
import type { TrackDTO } from '@nawhas/types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface PlayerState {
  currentTrack: TrackDTO | null;
  queue: TrackDTO[];
  queueIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
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
  next: () => void;
  previous: () => void;
  addToQueue: (track: TrackDTO) => void;
  playAlbum: (tracks: TrackDTO[]) => void;
  setPosition: (seconds: number) => void;
  toggleShuffle: () => void;
  setVolume: (level: number) => void;
  reorderQueue: (from: number, to: number) => void;
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

  next() {
    const { queue, queueIndex, isShuffle } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) nextIndex = 0;
    }

    const nextTrack = queue[nextIndex];
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

  playAlbum(tracks) {
    if (tracks.length === 0) return;
    const first = tracks[0];
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
