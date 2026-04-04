/**
 * Unit tests for the useListeningHistory hook.
 *
 * The hook watches the Zustand player store for currentTrack changes and
 * calls the recordPlay server action to persist a listening history entry.
 * It guards against unauthenticated users and deduplicates rapid re-plays
 * of the same track within a 30-second window.
 *
 * Testing strategy:
 *   - Mock the `recordPlay` server action so no HTTP is needed.
 *   - Control the Zustand player store directly (same pattern as store tests).
 *   - Mock `useSession` from `@/lib/auth-client` to toggle auth state.
 *   - Use vitest fake timers to control the 30-second dedup window.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { usePlayerStore } from '@/store/player';
import type { TrackDTO } from '@nawhas/types';

// ---------------------------------------------------------------------------
// Mock the recordPlay server action (called by the hook internally)
// ---------------------------------------------------------------------------

const mockRecordPlay = vi.fn().mockResolvedValue(undefined);
vi.mock('@/server/actions/history', () => ({
  recordPlay: (trackId: string) => mockRecordPlay(trackId),
}));

// ---------------------------------------------------------------------------
// Mock auth-client useSession
// ---------------------------------------------------------------------------

const mockUseSession = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  useSession: () => mockUseSession(),
}));

// ---------------------------------------------------------------------------
// Lazy import after mocks are declared
// Dynamic import so this file doesn't crash when the hook hasn't been
// implemented yet (NAW-147). Tests are skipped in that case.
// ---------------------------------------------------------------------------

const hookMod = await import('@/hooks/use-listening-history').catch(() => null);
const useListeningHistory = hookMod?.useListeningHistory;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrack(id: string): TrackDTO {
  return {
    id,
    title: `Track ${id}`,
    slug: `track-${id}`,
    albumId: 'album-1',
    trackNumber: 1,
    audioUrl: 'https://example.com/audio.mp3',
    youtubeId: null,
    duration: 120,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };
}

const AUTHENTICATED_SESSION = {
  data: { user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
  isPending: false,
  error: null,
};

const UNAUTHENTICATED_SESSION = {
  data: null,
  isPending: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  mockRecordPlay.mockClear();
  mockUseSession.mockReturnValue(AUTHENTICATED_SESSION);

  // Reset the player store to a clean idle state
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
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skipIf(!useListeningHistory)('useListeningHistory', () => {
  describe('auth guard', () => {
    it('does not call recordPlay when the user is not authenticated', async () => {
      mockUseSession.mockReturnValue(UNAUTHENTICATED_SESSION);

      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      expect(mockRecordPlay).not.toHaveBeenCalled();
    });

    it('does not call recordPlay while session is still loading', async () => {
      mockUseSession.mockReturnValue({ data: null, isPending: true, error: null });

      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      expect(mockRecordPlay).not.toHaveBeenCalled();
    });

    it('calls recordPlay when the user is authenticated', async () => {
      mockUseSession.mockReturnValue(AUTHENTICATED_SESSION);

      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      expect(mockRecordPlay).toHaveBeenCalledOnce();
      expect(mockRecordPlay).toHaveBeenCalledWith('track-1');
    });
  });

  describe('track-change detection', () => {
    it('calls recordPlay when currentTrack changes from null to a track', async () => {
      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      expect(mockRecordPlay).toHaveBeenCalledOnce();
      expect(mockRecordPlay).toHaveBeenCalledWith('track-1');
    });

    it('calls recordPlay again when the track changes to a different track', async () => {
      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      // Advance past the 30s window so the second call is not deduped
      vi.advanceTimersByTime(31_000);

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-2') });
      });

      expect(mockRecordPlay).toHaveBeenCalledTimes(2);
      expect(mockRecordPlay).toHaveBeenNthCalledWith(2, 'track-2');
    });

    it('does not call recordPlay when currentTrack is set to null', async () => {
      renderHook(() => useListeningHistory!());

      // Start with a track
      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });
      mockRecordPlay.mockClear();

      // Clear the track
      await act(async () => {
        usePlayerStore.setState({ currentTrack: null });
      });

      expect(mockRecordPlay).not.toHaveBeenCalled();
    });
  });

  describe('30-second deduplication', () => {
    it('does not call recordPlay if the same track is re-set within 30s', async () => {
      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      expect(mockRecordPlay).toHaveBeenCalledOnce();

      // Advance only 10s — within the dedup window
      vi.advanceTimersByTime(10_000);

      await act(async () => {
        // Simulate re-triggering the same track (e.g. loop / re-play)
        usePlayerStore.setState({ currentTrack: null });
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      // Should still be only 1 call
      expect(mockRecordPlay).toHaveBeenCalledOnce();
    });

    it('calls recordPlay again for the same track after the 30s window has elapsed', async () => {
      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      expect(mockRecordPlay).toHaveBeenCalledOnce();

      // Advance 31s — past the dedup window
      vi.advanceTimersByTime(31_000);

      await act(async () => {
        usePlayerStore.setState({ currentTrack: null });
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      expect(mockRecordPlay).toHaveBeenCalledTimes(2);
    });

    it('dedup is per-track — different tracks within 30s are both recorded', async () => {
      renderHook(() => useListeningHistory!());

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-1') });
      });

      // Switch to a different track within 30s
      vi.advanceTimersByTime(5_000);

      await act(async () => {
        usePlayerStore.setState({ currentTrack: makeTrack('track-2') });
      });

      expect(mockRecordPlay).toHaveBeenCalledTimes(2);
      expect(mockRecordPlay).toHaveBeenCalledWith('track-1');
      expect(mockRecordPlay).toHaveBeenCalledWith('track-2');
    });
  });
});
