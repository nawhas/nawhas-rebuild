import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlbumGrid } from '../album-grid';
import type { AlbumListItemDTO, PaginatedResult } from '@nawhas/types';

// Mock next/link so it renders as a plain anchor.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Stub @nawhas/ui so CoverArt doesn't require next-intl internals.
vi.mock('@nawhas/ui', () => ({
  CoverArt: ({ label }: { label?: string }) => <div aria-label={label}>{label}</div>,
}));

// Mock the server action — tests control what it resolves to.
const mockFetchMoreAlbums = vi.fn<(cursor: string) => Promise<PaginatedResult<AlbumListItemDTO>>>();
vi.mock('@/server/actions/albums', () => ({
  fetchMoreAlbums: (cursor: string) => mockFetchMoreAlbums(cursor),
}));

function makeAlbum(id: string, title: string): AlbumListItemDTO {
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    reciterId: 'r1',
    reciterName: 'Test Reciter',
    reciterSlug: 'test-reciter',
    year: 2020,
    artworkUrl: null,
    trackCount: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TWO_ALBUMS: AlbumListItemDTO[] = [
  makeAlbum('1', 'Album One'),
  makeAlbum('2', 'Album Two'),
];

describe('AlbumGrid', () => {
  it('renders the initial list of album cards', () => {
    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor={null} />);
    // Title appears in both CoverArt label and the visible span — use getAllByText.
    expect(screen.getAllByText('Album One').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Album Two').length).toBeGreaterThanOrEqual(1);
  });

  it('renders a list with role="list" and aria-label "Albums"', () => {
    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor={null} />);
    expect(screen.getByRole('list', { name: /albums/i })).toBeDefined();
  });

  it('does not show Load More button when there is no cursor', () => {
    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor={null} />);
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('shows Load More button when a cursor is provided', () => {
    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor="cursor-abc" />);
    expect(screen.getByRole('button', { name: /load more/i })).toBeDefined();
  });

  it('calls fetchMoreAlbums with the current cursor when Load More is clicked', async () => {
    mockFetchMoreAlbums.mockResolvedValue({ items: [], nextCursor: null });

    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor="my-cursor" />);
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(mockFetchMoreAlbums).toHaveBeenCalledWith('my-cursor');
    });
  });

  it('appends new albums when Load More is clicked', async () => {
    const nextPage: AlbumListItemDTO[] = [makeAlbum('3', 'Album Three')];
    mockFetchMoreAlbums.mockResolvedValue({ items: nextPage, nextCursor: null });

    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor="cursor-abc" />);
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Album Three').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Album One').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Album Two').length).toBeGreaterThanOrEqual(1);
  });

  it('hides Load More button after last page is loaded', async () => {
    mockFetchMoreAlbums.mockResolvedValue({ items: [], nextCursor: null });

    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor="cursor-abc" />);
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    });
  });

  it('renders album cards with reciterName and trackCount', () => {
    const album = makeAlbum('1', 'Panjtan Pak');
    render(<AlbumGrid initialItems={[album]} initialCursor={null} />);
    // reciterName should appear in the card
    expect(screen.getByText('Test Reciter')).toBeDefined();
    // trackCount = 5 should render "5 tracks"
    expect(screen.getByText(/5 tracks/i)).toBeDefined();
  });

  it('renders album links pointing to /albums/:slug', () => {
    render(<AlbumGrid initialItems={TWO_ALBUMS} initialCursor={null} />);
    const link = screen.getByRole('link', { name: /album one/i });
    expect(link.getAttribute('href')).toBe('/albums/album-one');
  });
});
