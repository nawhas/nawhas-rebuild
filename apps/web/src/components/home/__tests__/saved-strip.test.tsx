import { describe, it, expect, afterEach, vi, type Mock } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';

// Stub the library server action — SavedStrip calls getRecentSavedTracks
vi.mock('@/server/actions/library', () => ({
  getRecentSavedTracks: vi.fn(),
}));

// Stub the auth client's useSession hook
vi.mock('@/lib/auth-client', () => ({
  useSession: vi.fn(),
}));

// Stub next/link → plain <a>
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Stub @nawhas/ui/components/section-title
vi.mock('@nawhas/ui/components/section-title', () => ({
  SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id}>{children}</h2>
  ),
}));

import { SavedStrip } from '../saved-strip';
import { useSession } from '@/lib/auth-client';
import { getRecentSavedTracks } from '@/server/actions/library';
import type { TrackListItemDTO } from '@nawhas/types';

afterEach(() => cleanup());

const mockUseSession = useSession as Mock;
const mockGetRecentSavedTracks = getRecentSavedTracks as Mock;

function makeTrack(id: string, title: string): TrackListItemDTO {
  return {
    id,
    title,
    slug: `track-${id}`,
    albumId: 'a1',
    trackNumber: null,
    audioUrl: null,
    youtubeId: null,
    duration: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    reciterSlug: 'ali-safdar',
    reciterName: 'Ali Safdar',
    albumSlug: 'panjtan-pak',
    albumTitle: 'Panjtan Pak',
  } as TrackListItemDTO;
}

describe('SavedStrip', () => {
  it('renders nothing when there is no authenticated session (unauthenticated)', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false });
    mockGetRecentSavedTracks.mockResolvedValue([]);

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<SavedStrip />));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while session is still loading', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true });
    mockGetRecentSavedTracks.mockResolvedValue([]);

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<SavedStrip />));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for a signed-in user with an empty saved library', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', name: 'Test User', email: 'test@example.com' } },
      isPending: false,
    });
    mockGetRecentSavedTracks.mockResolvedValue([]);

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<SavedStrip />));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders saved tracks for a signed-in user', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', name: 'Test User', email: 'test@example.com' } },
      isPending: false,
    });
    const tracks = [
      makeTrack('t1', 'Salam Hussain'),
      makeTrack('t2', 'Ya Ali'),
    ];
    mockGetRecentSavedTracks.mockResolvedValue(tracks);

    await act(async () => {
      render(<SavedStrip />);
    });

    expect(screen.getByText('Salam Hussain')).toBeDefined();
    expect(screen.getByText('Ya Ali')).toBeDefined();
  });

  it('renders the section heading when tracks are present', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', name: 'Test User', email: 'test@example.com' } },
      isPending: false,
    });
    mockGetRecentSavedTracks.mockResolvedValue([makeTrack('t1', 'Salam Hussain')]);

    await act(async () => {
      render(<SavedStrip />);
    });

    // en.json: home.sections.recentlySaved = "Recently Saved"
    expect(screen.getByText('Recently Saved')).toBeDefined();
  });

  it('links each track to its canonical track page', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', name: 'Test User', email: 'test@example.com' } },
      isPending: false,
    });
    const track = makeTrack('t1', 'Salam Hussain');
    mockGetRecentSavedTracks.mockResolvedValue([track]);

    await act(async () => {
      render(<SavedStrip />);
    });

    const links = screen.getAllByRole('link');
    const expectedHref = `/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`;
    expect(links.some((l) => l.getAttribute('href') === expectedHref)).toBe(true);
  });
});
