import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SaveButton } from '@/components/SaveButton';
import { LikeButton } from '@/components/LikeButton';

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockPathname = '/reciters/test-reciter/albums/test-album/tracks/test-track';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Mock auth-client useSession
// ---------------------------------------------------------------------------

const mockUseSession = vi.fn();

vi.mock('@/lib/auth-client', () => ({
  useSession: () => mockUseSession(),
}));

// ---------------------------------------------------------------------------
// Mock server actions
// ---------------------------------------------------------------------------

const mockSaveTrack = vi.fn().mockResolvedValue(undefined);
const mockUnsaveTrack = vi.fn().mockResolvedValue(undefined);
const mockGetIsSaved = vi.fn().mockResolvedValue(false);

vi.mock('@/server/actions/library', () => ({
  saveTrack: (...args: unknown[]) => mockSaveTrack(...args),
  unsaveTrack: (...args: unknown[]) => mockUnsaveTrack(...args),
  getIsSaved: (...args: unknown[]) => mockGetIsSaved(...args),
}));

const mockLikeTrack = vi.fn().mockResolvedValue(undefined);
const mockUnlikeTrack = vi.fn().mockResolvedValue(undefined);
const mockGetIsLiked = vi.fn().mockResolvedValue(false);

vi.mock('@/server/actions/likes', () => ({
  likeTrack: (...args: unknown[]) => mockLikeTrack(...args),
  unlikeTrack: (...args: unknown[]) => mockUnlikeTrack(...args),
  getIsLiked: (...args: unknown[]) => mockGetIsLiked(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuthenticatedSession() {
  mockUseSession.mockReturnValue({
    data: { user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
    isPending: false,
  });
}

function mockUnauthenticatedSession() {
  mockUseSession.mockReturnValue({ data: null, isPending: false });
}

function mockLoadingSession() {
  mockUseSession.mockReturnValue({ data: null, isPending: true });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Restore default mocks after each test
  mockSaveTrack.mockResolvedValue(undefined);
  mockUnsaveTrack.mockResolvedValue(undefined);
  mockGetIsSaved.mockResolvedValue(false);
  mockLikeTrack.mockResolvedValue(undefined);
  mockUnlikeTrack.mockResolvedValue(undefined);
  mockGetIsLiked.mockResolvedValue(false);
});

// ---------------------------------------------------------------------------
// SaveButton
// ---------------------------------------------------------------------------

describe('SaveButton', () => {
  describe('unauthenticated user', () => {
    beforeEach(() => mockUnauthenticatedSession());

    it('renders a "Save to library" button', () => {
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      expect(screen.getByRole('button', { name: /save to library/i })).toBeDefined();
    });

    it('has aria-pressed=false when not saved', () => {
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      const btn = screen.getByRole('button', { name: /save to library/i });
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('redirects to /login with callbackUrl and reason=save on click', () => {
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockPush).toHaveBeenCalledWith(
        `/login?callbackUrl=${encodeURIComponent(mockPathname)}&reason=save`,
      );
    });

    it('does not call saveTrack when unauthenticated', () => {
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockSaveTrack).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => mockAuthenticatedSession());

    it('renders with initialSaved=false state immediately', () => {
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      const btn = screen.getByRole('button', { name: /save to library/i });
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('renders with initialSaved=true state immediately', () => {
      render(<SaveButton trackId="track-1" initialSaved={true} />);
      const btn = screen.getByRole('button', { name: /remove from library/i });
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('optimistically saves on click (false → true)', async () => {
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
      // Optimistic update — should immediately show "Remove from library"
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /remove from library/i })).toBeDefined(),
      );
      expect(mockSaveTrack).toHaveBeenCalledWith('track-1');
    });

    it('optimistically unsaves on click (true → false)', async () => {
      render(<SaveButton trackId="track-1" initialSaved={true} />);
      fireEvent.click(screen.getByRole('button', { name: /remove from library/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /save to library/i })).toBeDefined(),
      );
      expect(mockUnsaveTrack).toHaveBeenCalledWith('track-1');
    });

    it('rolls back optimistic update when saveTrack throws', async () => {
      mockSaveTrack.mockRejectedValue(new Error('Network error'));
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      fireEvent.click(screen.getByRole('button', { name: /save to library/i }));
      // After rollback, button should be back to "Save to library"
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /save to library/i })).toBeDefined(),
      );
    });

    it('fetches initial state on mount when initialSaved is not provided', async () => {
      mockGetIsSaved.mockResolvedValue(true);
      render(<SaveButton trackId="track-1" />);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /remove from library/i })).toBeDefined(),
      );
      expect(mockGetIsSaved).toHaveBeenCalledWith('track-1');
    });

    it('does not call getIsSaved when initialSaved is provided', () => {
      render(<SaveButton trackId="track-1" initialSaved={false} />);
      expect(mockGetIsSaved).not.toHaveBeenCalled();
    });
  });

  describe('session loading', () => {
    it('does not fetch initial state while session is loading', () => {
      mockLoadingSession();
      render(<SaveButton trackId="track-1" />);
      expect(mockGetIsSaved).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// LikeButton
// ---------------------------------------------------------------------------

describe('LikeButton', () => {
  describe('unauthenticated user', () => {
    beforeEach(() => mockUnauthenticatedSession());

    it('renders a "Like track" button', () => {
      render(<LikeButton trackId="track-1" initialLiked={false} />);
      expect(screen.getByRole('button', { name: /like track/i })).toBeDefined();
    });

    it('redirects to /login with callbackUrl and reason=like on click', () => {
      render(<LikeButton trackId="track-1" initialLiked={false} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockPush).toHaveBeenCalledWith(
        `/login?callbackUrl=${encodeURIComponent(mockPathname)}&reason=like`,
      );
    });

    it('does not call likeTrack when unauthenticated', () => {
      render(<LikeButton trackId="track-1" initialLiked={false} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockLikeTrack).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => mockAuthenticatedSession());

    it('renders with initialLiked=false state immediately', () => {
      render(<LikeButton trackId="track-1" initialLiked={false} />);
      expect(screen.getByRole('button', { name: /like track/i }).getAttribute('aria-pressed')).toBe(
        'false',
      );
    });

    it('renders with initialLiked=true state immediately', () => {
      render(<LikeButton trackId="track-1" initialLiked={true} />);
      expect(
        screen.getByRole('button', { name: /unlike track/i }).getAttribute('aria-pressed'),
      ).toBe('true');
    });

    it('optimistically likes on click (false → true)', async () => {
      render(<LikeButton trackId="track-1" initialLiked={false} />);
      fireEvent.click(screen.getByRole('button', { name: /like track/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /unlike track/i })).toBeDefined(),
      );
      expect(mockLikeTrack).toHaveBeenCalledWith('track-1');
    });

    it('optimistically unlikes on click (true → false)', async () => {
      render(<LikeButton trackId="track-1" initialLiked={true} />);
      fireEvent.click(screen.getByRole('button', { name: /unlike track/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /like track/i })).toBeDefined(),
      );
      expect(mockUnlikeTrack).toHaveBeenCalledWith('track-1');
    });

    it('rolls back optimistic update when likeTrack throws', async () => {
      mockLikeTrack.mockRejectedValue(new Error('Network error'));
      render(<LikeButton trackId="track-1" initialLiked={false} />);
      fireEvent.click(screen.getByRole('button', { name: /like track/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /like track/i })).toBeDefined(),
      );
    });

    it('fetches initial state on mount when initialLiked is not provided', async () => {
      mockGetIsLiked.mockResolvedValue(true);
      render(<LikeButton trackId="track-1" />);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /unlike track/i })).toBeDefined(),
      );
      expect(mockGetIsLiked).toHaveBeenCalledWith('track-1');
    });

    it('does not call getIsLiked when initialLiked is provided', () => {
      render(<LikeButton trackId="track-1" initialLiked={false} />);
      expect(mockGetIsLiked).not.toHaveBeenCalled();
    });
  });
});
