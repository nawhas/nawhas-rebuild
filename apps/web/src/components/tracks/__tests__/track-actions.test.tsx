import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// TrackActions renders SaveButton and LikeButton — both pull in auth, navigation,
// and server actions. Stub the heavy dependencies so tests stay unit-level.
vi.mock('next/navigation', () => ({
  usePathname: () => '/tracks/test-track',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

vi.mock('@/server/actions/library', () => ({
  getIsSaved: vi.fn().mockResolvedValue(false),
  saveTrack: vi.fn().mockResolvedValue(undefined),
  unsaveTrack: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/server/actions/likes', () => ({
  getIsLiked: vi.fn().mockResolvedValue(false),
  likeTrack: vi.fn().mockResolvedValue(undefined),
  unlikeTrack: vi.fn().mockResolvedValue(undefined),
}));

import { TrackActions } from '../track-actions';

afterEach(() => cleanup());

describe('TrackActions', () => {
  it('renders a Save button', () => {
    render(<TrackActions trackId="track-abc" />);
    // SaveButton aria-label is "Save to library" (from common.save in en.json)
    expect(screen.getByRole('button', { name: /save to library/i })).toBeDefined();
  });

  it('renders a Like button', () => {
    render(<TrackActions trackId="track-abc" />);
    // LikeButton aria-label is "Like track" (from common.like in en.json)
    expect(screen.getByRole('button', { name: /like track/i })).toBeDefined();
  });

  it('renders both buttons inside a container', () => {
    render(<TrackActions trackId="track-abc" />);
    // Both buttons should be present simultaneously
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('marks both buttons as not pressed initially (unauthenticated)', () => {
    render(<TrackActions trackId="track-abc" />);
    const saveBtn = screen.getByRole('button', { name: /save to library/i });
    const likeBtn = screen.getByRole('button', { name: /like track/i });
    expect(saveBtn.getAttribute('aria-pressed')).toBe('false');
    expect(likeBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
