import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LibraryTracksList } from '@/components/library/library-tracks-list';
import { usePlayerStore } from '@/store/player';
import type { SavedTrackDTO, TrackDTO } from '@nawhas/types';

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  usePathname: () => '/library/tracks',
  useRouter: () => ({ push: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock auth-client (authenticated for all these tests)
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// Mock server actions
// ---------------------------------------------------------------------------

const mockFetchMore = vi.fn();
const mockPlayAll = vi.fn();
const mockUnsaveTrack = vi.fn().mockResolvedValue(undefined);
const mockGetIsSaved = vi.fn().mockResolvedValue(true);

vi.mock('@/server/actions/library', () => ({
  fetchMoreLibraryTracks: (...args: unknown[]) => mockFetchMore(...args),
  playAllLibraryTracks: (...args: unknown[]) => mockPlayAll(...args),
  saveTrack: vi.fn().mockResolvedValue(undefined),
  unsaveTrack: (...args: unknown[]) => mockUnsaveTrack(...args),
  getIsSaved: (...args: unknown[]) => mockGetIsSaved(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrack(id: string, title: string): TrackDTO {
  return {
    id,
    title,
    slug: `track-${id}`,
    albumId: 'album-1',
    trackNumber: 1,
    audioUrl: null,
    youtubeId: null,
    duration: 180,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

function makeSavedTrack(id: string, title: string): SavedTrackDTO {
  return {
    trackId: id,
    savedAt: '2024-01-01T00:00:00.000Z',
    track: makeTrack(id, title),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockUnsaveTrack.mockResolvedValue(undefined);
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

// ---------------------------------------------------------------------------
// LibraryTracksList
// ---------------------------------------------------------------------------

describe('LibraryTracksList', () => {
  describe('empty state', () => {
    it('shows empty state message when no tracks', () => {
      render(<LibraryTracksList initialItems={[]} initialCursor={null} />);
      expect(screen.getByText(/no saved tracks yet/i)).toBeDefined();
    });

    it('shows browse albums CTA in empty state', () => {
      render(<LibraryTracksList initialItems={[]} initialCursor={null} />);
      expect(screen.getByRole('link', { name: /browse albums/i })).toBeDefined();
    });
  });

  describe('with tracks', () => {
    const items = [
      makeSavedTrack('t1', 'Track One'),
      makeSavedTrack('t2', 'Track Two'),
      makeSavedTrack('t3', 'Track Three'),
    ];

    it('renders all track titles', () => {
      render(<LibraryTracksList initialItems={items} initialCursor={null} />);
      expect(screen.getByText('Track One')).toBeDefined();
      expect(screen.getByText('Track Two')).toBeDefined();
      expect(screen.getByText('Track Three')).toBeDefined();
    });

    it('shows track count', () => {
      render(<LibraryTracksList initialItems={items} initialCursor={null} />);
      expect(screen.getByText(/3 tracks saved/i)).toBeDefined();
    });

    it('shows Play All button', () => {
      render(<LibraryTracksList initialItems={items} initialCursor={null} />);
      expect(screen.getByRole('button', { name: /play all/i })).toBeDefined();
    });

    it('does not show Load More when no cursor', () => {
      render(<LibraryTracksList initialItems={items} initialCursor={null} />);
      expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    });

    it('shows Load More when cursor is present', () => {
      render(<LibraryTracksList initialItems={items} initialCursor="some-cursor" />);
      expect(screen.getByRole('button', { name: /load more/i })).toBeDefined();
    });
  });

  describe('Load More', () => {
    it('appends next page when Load More clicked', async () => {
      const items = [makeSavedTrack('t1', 'Track One')];
      const nextPage = [makeSavedTrack('t2', 'Track Two')];
      mockFetchMore.mockResolvedValue({ items: nextPage, nextCursor: null });

      render(<LibraryTracksList initialItems={items} initialCursor="cursor-1" />);
      fireEvent.click(screen.getByRole('button', { name: /load more/i }));

      await waitFor(() => expect(screen.getByText('Track Two')).toBeDefined());
      expect(mockFetchMore).toHaveBeenCalledWith('cursor-1');
    });

    it('hides Load More after last page', async () => {
      const items = [makeSavedTrack('t1', 'Track One')];
      mockFetchMore.mockResolvedValue({ items: [], nextCursor: null });

      render(<LibraryTracksList initialItems={items} initialCursor="cursor-1" />);
      fireEvent.click(screen.getByRole('button', { name: /load more/i }));

      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /load more/i })).toBeNull(),
      );
    });
  });

  describe('Play All', () => {
    it('calls playAlbum with fetched tracks', async () => {
      const tracks = [makeTrack('t1', 'Track One'), makeTrack('t2', 'Track Two')];
      mockPlayAll.mockResolvedValue(tracks);

      render(<LibraryTracksList initialItems={[makeSavedTrack('t1', 'Track One')]} initialCursor={null} />);
      fireEvent.click(screen.getByRole('button', { name: /play all/i }));

      await waitFor(() => {
        const state = usePlayerStore.getState();
        expect(state.currentTrack?.id).toBe('t1');
        expect(state.isPlaying).toBe(true);
      });
    });
  });

  describe('optimistic unsave', () => {
    it('removes track from list when Save button toggled off', async () => {
      const items = [
        makeSavedTrack('t1', 'Track One'),
        makeSavedTrack('t2', 'Track Two'),
      ];
      render(<LibraryTracksList initialItems={items} initialCursor={null} />);

      // Click the "Remove from library" button for Track One
      const saveButtons = screen.getAllByRole('button', { name: /remove from library/i });
      fireEvent.click(saveButtons[0]!);

      await waitFor(() =>
        expect(screen.queryByText('Track One')).toBeNull(),
      );
      // Track Two should still be visible
      expect(screen.getByText('Track Two')).toBeDefined();
    });
  });
});
