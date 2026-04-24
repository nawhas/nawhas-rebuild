import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReciterGrid } from '../reciter-grid';
import type { ReciterDTO, PaginatedResult } from '@nawhas/types';

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

// Mock the server action — tests control what it resolves to.
const mockFetchMoreReciters = vi.fn<(cursor: string) => Promise<PaginatedResult<ReciterDTO>>>();
vi.mock('@/server/actions/reciters', () => ({
  fetchMoreReciters: (cursor: string) => mockFetchMoreReciters(cursor),
}));

function makeReciter(id: string, name: string): ReciterDTO {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TWO_RECITERS: ReciterDTO[] = [
  makeReciter('1', 'Reciter One'),
  makeReciter('2', 'Reciter Two'),
];

describe('ReciterGrid', () => {
  it('renders the initial list of reciter cards', () => {
    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor={null} />);
    expect(screen.getByText('Reciter One')).toBeDefined();
    expect(screen.getByText('Reciter Two')).toBeDefined();
  });

  it('renders a list with role="list" per letter section', () => {
    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor={null} />);
    // Both reciters start with 'R', so a single per-letter list is emitted.
    expect(screen.getByRole('list', { name: /reciters starting with R/i })).toBeDefined();
  });

  it('does not show Load More button when there is no cursor', () => {
    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor={null} />);
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('shows Load More button when a cursor is provided', () => {
    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor="cursor-abc" />);
    expect(screen.getByRole('button', { name: 'Load More' })).toBeDefined();
  });

  it('appends new reciters when Load More is clicked', async () => {
    const nextPage: ReciterDTO[] = [makeReciter('3', 'Reciter Three')];
    mockFetchMoreReciters.mockResolvedValue({ items: nextPage, nextCursor: null });

    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor="cursor-abc" />);
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));

    await waitFor(() => {
      expect(screen.getByText('Reciter Three')).toBeDefined();
    });
    expect(screen.getByText('Reciter One')).toBeDefined();
    expect(screen.getByText('Reciter Two')).toBeDefined();
  });

  it('hides Load More button after last page is loaded', async () => {
    mockFetchMoreReciters.mockResolvedValue({ items: [], nextCursor: null });

    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor="cursor-abc" />);
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    });
  });

  it('calls fetchMoreReciters with the current cursor', async () => {
    mockFetchMoreReciters.mockResolvedValue({ items: [], nextCursor: null });

    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor="my-cursor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));

    await waitFor(() => {
      expect(mockFetchMoreReciters).toHaveBeenCalledWith('my-cursor');
    });
  });

  it('renders reciter links pointing to /reciters/:slug', () => {
    render(<ReciterGrid initialItems={TWO_RECITERS} initialCursor={null} />);
    const link = screen.getByRole('link', { name: /reciter one/i });
    expect(link.getAttribute('href')).toBe('/reciters/reciter-one');
  });

  it('renders A–Z anchor nav with one link per occupied letter', () => {
    render(
      <ReciterGrid
        initialItems={[makeReciter('1', 'Ali Safdar'), makeReciter('2', 'Bashir Hussain')]}
        initialCursor={null}
      />,
    );
    const nav = screen.getByRole('navigation', { name: /reciters by letter/i });
    expect(nav).toBeDefined();
    expect(screen.getByRole('link', { name: 'A' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'B' })).toBeDefined();
  });

  it('groups non-alpha names under #', () => {
    render(
      <ReciterGrid
        initialItems={[makeReciter('1', '€uro Reciter')]}
        initialCursor={null}
      />,
    );
    expect(screen.getByRole('link', { name: '#' })).toBeDefined();
    expect(screen.getByRole('region', { name: /reciters starting with #/i })).toBeDefined();
  });

  it('re-groups Load More entries into their letter sections', async () => {
    mockFetchMoreReciters.mockResolvedValue({
      items: [makeReciter('3', 'Carlos Reciter')],
      nextCursor: null,
    });

    render(
      <ReciterGrid
        initialItems={[makeReciter('1', 'Ali Safdar'), makeReciter('2', 'Bashir Hussain')]}
        initialCursor="cursor-abc"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'C' })).toBeDefined();
    });
    const cSection = screen.getByRole('region', { name: /reciters starting with C/i });
    expect(cSection.textContent).toContain('Carlos Reciter');
  });
});
