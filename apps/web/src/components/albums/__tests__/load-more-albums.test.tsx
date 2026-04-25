import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoadMoreAlbums } from '../load-more-albums';
import type { AlbumDTO, PaginatedResult } from '@nawhas/types';

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

// Stub @nawhas/ui — CoverArt and Button.
vi.mock('@nawhas/ui', () => ({
  CoverArt: ({ label }: { label?: string }) => <div aria-label={label}>{label}</div>,
  Button: ({
    children,
    onClick,
    disabled,
    'aria-busy': ariaBusy,
    type,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-busy'?: boolean;
    type?: 'button' | 'submit' | 'reset';
    [key: string]: unknown;
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} aria-busy={ariaBusy} {...props}>
      {children}
    </button>
  ),
}));

// Mock the server action — tests control what it resolves to.
const mockFetchMoreAlbumsForReciter = vi.fn<
  (input: { reciterSlug: string; cursor: string; limit?: number }) => Promise<PaginatedResult<AlbumDTO>>
>();
vi.mock('@/server/actions/albums', () => ({
  fetchMoreAlbumsForReciter: (input: { reciterSlug: string; cursor: string; limit?: number }) =>
    mockFetchMoreAlbumsForReciter(input),
}));

function makeAlbum(id: string, title: string): AlbumDTO {
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    reciterId: 'r1',
    year: 2020,
    artworkUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TWO_ALBUMS: AlbumDTO[] = [
  makeAlbum('1', 'Album One'),
  makeAlbum('2', 'Album Two'),
];

describe('LoadMoreAlbums', () => {
  it('renders the initial list of albums', () => {
    render(
      <LoadMoreAlbums
        reciterSlug="ali-safdar"
        initialAlbums={TWO_ALBUMS}
        initialCursor={null}
      />,
    );
    // Title appears in both CoverArt label and the visible span — use getAllByText.
    expect(screen.getAllByText('Album One').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Album Two').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show Load More button when there is no cursor', () => {
    render(
      <LoadMoreAlbums
        reciterSlug="ali-safdar"
        initialAlbums={TWO_ALBUMS}
        initialCursor={null}
      />,
    );
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('shows Load More button when a cursor is provided', () => {
    render(
      <LoadMoreAlbums
        reciterSlug="ali-safdar"
        initialAlbums={TWO_ALBUMS}
        initialCursor="cursor-abc"
      />,
    );
    expect(screen.getByRole('button', { name: /load more/i })).toBeDefined();
  });

  it('calls fetchMoreAlbumsForReciter with correct reciterSlug and cursor', async () => {
    mockFetchMoreAlbumsForReciter.mockResolvedValue({ items: [], nextCursor: null });

    render(
      <LoadMoreAlbums
        reciterSlug="ali-safdar"
        initialAlbums={TWO_ALBUMS}
        initialCursor="my-cursor"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(mockFetchMoreAlbumsForReciter).toHaveBeenCalledWith(
        expect.objectContaining({ reciterSlug: 'ali-safdar', cursor: 'my-cursor' }),
      );
    });
  });

  it('appends new albums when Load More is clicked', async () => {
    const nextPage: AlbumDTO[] = [makeAlbum('3', 'Album Three')];
    mockFetchMoreAlbumsForReciter.mockResolvedValue({ items: nextPage, nextCursor: null });

    render(
      <LoadMoreAlbums
        reciterSlug="ali-safdar"
        initialAlbums={TWO_ALBUMS}
        initialCursor="cursor-abc"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Album Three').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Album One').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Album Two').length).toBeGreaterThanOrEqual(1);
  });

  it('hides Load More button after last page is loaded', async () => {
    mockFetchMoreAlbumsForReciter.mockResolvedValue({ items: [], nextCursor: null });

    render(
      <LoadMoreAlbums
        reciterSlug="ali-safdar"
        initialAlbums={TWO_ALBUMS}
        initialCursor="cursor-abc"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    });
  });

  it('button reflects aria-busy during loading', async () => {
    // Use a promise we control to inspect intermediate state
    let resolveAction!: (value: PaginatedResult<AlbumDTO>) => void;
    const pending = new Promise<PaginatedResult<AlbumDTO>>((res) => {
      resolveAction = res;
    });
    mockFetchMoreAlbumsForReciter.mockReturnValue(pending);

    render(
      <LoadMoreAlbums
        reciterSlug="ali-safdar"
        initialAlbums={TWO_ALBUMS}
        initialCursor="cursor-abc"
      />,
    );
    const btn = screen.getByRole('button', { name: /load more/i });
    fireEvent.click(btn);

    // After clicking, aria-busy should become true (loading state)
    await waitFor(() => {
      expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
    });

    // Resolve the action so the component can finish
    resolveAction({ items: [], nextCursor: null });
  });
});
