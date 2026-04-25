import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { SearchResultsContent } from '../search-results-content';
import type { SearchResultDTO } from '@nawhas/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    role,
    'aria-selected': ariaSelected,
    'aria-label': ariaLabel,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    role?: string;
    'aria-selected'?: boolean;
    'aria-label'?: string;
    [key: string]: unknown;
  }) => (
    <a
      href={href}
      className={className}
      role={role}
      aria-selected={ariaSelected}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </a>
  ),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// CoverArt + ReciterAvatar (from @nawhas/ui) call useTranslations('coverArt')
// internally. The web-app vitest.setup.ts mocks next-intl for app-resolved
// imports, but @nawhas/ui resolves via a different module URL in workspace
// test runs so the mock doesn't catch. Stub both primitives directly; their
// real renders are covered in packages/ui.
vi.mock('@nawhas/ui', () => ({
  CoverArt: ({
    slug,
    artworkUrl,
    label,
  }: {
    slug: string;
    artworkUrl?: string | null;
    label?: string;
  }) =>
    artworkUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- test stub, not production code
      <img src={artworkUrl} alt={label ?? 'cover'} data-testid="cover-img" />
    ) : (
      <div data-cover-variant="cov-1" data-slug={slug} aria-label={label}>
        {label}
      </div>
    ),
  ReciterAvatar: ({ name }: { name: string }) => (
    <div data-testid="reciter-avatar" aria-label={name}>
      {name}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_RESULTS: SearchResultDTO = {
  hits: [],
  found: 0,
  page: 1,
  totalPages: 0,
  perPage: 20,
};

const TYPE_COUNTS = { reciters: 0, albums: 0, tracks: 0 };

const RECITER_HIT = {
  type: 'reciter' as const,
  item: { id: 'r1', name: 'Hussain Al Akrami', slug: 'hussain-al-akrami' },
  highlights: [{ field: 'name', snippet: '<mark>Hussain</mark> Al Akrami' }],
};

const ALBUM_HIT = {
  type: 'album' as const,
  item: {
    id: 'a1',
    title: 'Safar',
    slug: 'safar',
    reciterId: 'r1',
    reciterName: 'Hussain Al Akrami',
    year: 2020,
    artworkUrl: null,
  },
  highlights: [{ field: 'title', snippet: '<mark>Safar</mark>' }],
};

const TRACK_HIT = {
  type: 'track' as const,
  item: {
    id: 't1',
    title: 'Ya Hussain',
    slug: 'ya-hussain',
    trackNumber: 1,
    albumId: 'a1',
    albumTitle: 'Safar',
    albumSlug: 'safar',
    reciterId: 'r1',
    reciterName: 'Hussain Al Akrami',
    reciterSlug: 'hussain-al-akrami',
  },
  highlights: [{ field: 'title', snippet: '<mark>Ya</mark> Hussain' }],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchResultsContent', () => {
  describe('empty state', () => {
    it('shows empty state message when there are no hits', () => {
      render(
        <SearchResultsContent
          query="xyz123"
          results={BASE_RESULTS}
          typeCounts={TYPE_COUNTS}
          currentType="all"
          currentPage={1}
        />,
      );

      expect(screen.getByText(/no results for/i)).toBeDefined();
      expect(screen.getByText(/xyz123/i)).toBeDefined();
    });

    it('includes suggestions in the empty state', () => {
      render(
        <SearchResultsContent
          query="xyz"
          results={BASE_RESULTS}
          typeCounts={TYPE_COUNTS}
          currentType="all"
          currentPage={1}
        />,
      );

      expect(screen.getByText(/Try searching in English, Arabic, or Urdu/i)).toBeDefined();
    });
  });

  describe('tabs', () => {
    it('renders all four tabs', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={BASE_RESULTS}
          typeCounts={{ reciters: 2, albums: 5, tracks: 10 }}
          currentType="all"
          currentPage={1}
        />,
      );

      const tabs = screen.getAllByRole('tab');
      const tabText = tabs.map((t) => t.textContent ?? '').join(' ');
      expect(tabText).toMatch(/All/);
      expect(tabText).toMatch(/Reciters/);
      expect(tabText).toMatch(/Albums/);
      expect(tabText).toMatch(/Tracks/);
    });

    it('marks the active tab with aria-selected=true', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={BASE_RESULTS}
          typeCounts={{ reciters: 2, albums: 5, tracks: 10 }}
          currentType="albums"
          currentPage={1}
        />,
      );

      const tabs = screen.getAllByRole('tab');
      const albumsTab = tabs.find((t) => t.textContent?.includes('Albums'));
      expect(albumsTab).toBeDefined();
      expect(albumsTab?.getAttribute('aria-selected')).toBe('true');
    });

    it('tab hrefs include the correct type param', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={BASE_RESULTS}
          typeCounts={{ reciters: 2, albums: 5, tracks: 10 }}
          currentType="all"
          currentPage={1}
        />,
      );

      const tabs = screen.getAllByRole('tab') as HTMLAnchorElement[];
      const tracksTab = tabs.find((t) => t.textContent?.includes('Tracks'));
      expect(tracksTab?.getAttribute('href')).toContain('type=tracks');
    });

    it('All tab href does not include a type param', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={BASE_RESULTS}
          typeCounts={{ reciters: 2, albums: 5, tracks: 10 }}
          currentType="tracks"
          currentPage={1}
        />,
      );

      const tabs = screen.getAllByRole('tab') as HTMLAnchorElement[];
      const allTab = tabs.find((t) => /^All/.test(t.textContent?.trim() ?? ''));
      expect(allTab?.getAttribute('href')).not.toContain('type=');
    });

    it('shows result count badges for non-zero counts', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={BASE_RESULTS}
          typeCounts={{ reciters: 3, albums: 0, tracks: 8 }}
          currentType="all"
          currentPage={1}
        />,
      );

      expect(screen.getByLabelText('3 results')).toBeDefined();
      expect(screen.getByLabelText('8 results')).toBeDefined();
      expect(screen.queryByLabelText('0 results')).toBeNull();
    });
  });

  describe('reciter results', () => {
    it('renders reciter name as a link with accessible label', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={{ ...BASE_RESULTS, hits: [RECITER_HIT], found: 1 }}
          typeCounts={{ reciters: 1, albums: 0, tracks: 0 }}
          currentType="reciters"
          currentPage={1}
        />,
      );

      // Text may be split by <mark> highlight tags; check via aria-label instead.
      const link = screen.getByRole('link', { name: /hussain al akrami/i });
      expect(link).toBeDefined();
    });

    it('reciter link points to /reciters/:slug', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={{ ...BASE_RESULTS, hits: [RECITER_HIT], found: 1 }}
          typeCounts={{ reciters: 1, albums: 0, tracks: 0 }}
          currentType="reciters"
          currentPage={1}
        />,
      );

      const link = screen.getByRole('link', { name: /hussain al akrami/i });
      expect(link.getAttribute('href')).toBe('/reciters/hussain-al-akrami');
    });
  });

  describe('album results', () => {
    it('renders album title and reciter name', () => {
      render(
        <SearchResultsContent
          query="safar"
          results={{ ...BASE_RESULTS, hits: [ALBUM_HIT], found: 1 }}
          typeCounts={{ reciters: 0, albums: 1, tracks: 0 }}
          currentType="albums"
          currentPage={1}
        />,
      );

      // "Safar" appears twice — once as the CoverArt placeholder label,
      // once as the visible title text inside the link.
      expect(screen.getAllByText(/Safar/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Hussain Al Akrami/i)).toBeDefined();
    });

    it('album link points to /albums/:slug', () => {
      render(
        <SearchResultsContent
          query="safar"
          results={{ ...BASE_RESULTS, hits: [ALBUM_HIT], found: 1 }}
          typeCounts={{ reciters: 0, albums: 1, tracks: 0 }}
          currentType="albums"
          currentPage={1}
        />,
      );

      const link = screen.getByRole('link', { name: /safar/i });
      expect(link.getAttribute('href')).toBe('/albums/safar');
    });
  });

  describe('track results', () => {
    it('renders track title via accessible link label', () => {
      render(
        <SearchResultsContent
          query="ya hussain"
          results={{ ...BASE_RESULTS, hits: [TRACK_HIT], found: 1 }}
          typeCounts={{ reciters: 0, albums: 0, tracks: 1 }}
          currentType="tracks"
          currentPage={1}
        />,
      );

      // Text may be split by <mark> highlight tags; check via aria-label instead.
      const link = screen.getByRole('link', { name: /ya hussain/i });
      expect(link).toBeDefined();
    });

    it('track link points to /reciters/:reciterSlug/albums/:albumSlug/tracks/:slug', () => {
      render(
        <SearchResultsContent
          query="ya hussain"
          results={{ ...BASE_RESULTS, hits: [TRACK_HIT], found: 1 }}
          typeCounts={{ reciters: 0, albums: 0, tracks: 1 }}
          currentType="tracks"
          currentPage={1}
        />,
      );

      const link = screen.getByRole('link', { name: /ya hussain/i });
      expect(link.getAttribute('href')).toBe(
        '/reciters/hussain-al-akrami/albums/safar/tracks/ya-hussain',
      );
    });
  });

  describe('all tab — grouped results', () => {
    it('renders section headings for each type present', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={{
            ...BASE_RESULTS,
            hits: [RECITER_HIT, ALBUM_HIT, TRACK_HIT],
            found: 3,
          }}
          typeCounts={{ reciters: 1, albums: 1, tracks: 1 }}
          currentType="all"
          currentPage={1}
        />,
      );

      expect(screen.getByRole('heading', { name: 'Reciters' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Albums' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Tracks' })).toBeDefined();
    });
  });

  describe('pagination', () => {
    it('shows pagination nav when totalPages > 1', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={{ ...BASE_RESULTS, hits: [RECITER_HIT], found: 40, totalPages: 2 }}
          typeCounts={{ reciters: 40, albums: 0, tracks: 0 }}
          currentType="reciters"
          currentPage={1}
        />,
      );

      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeDefined();
      expect(screen.getByText(/page 1 of 2/i)).toBeDefined();
    });

    it('hides pagination when totalPages <= 1', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={{ ...BASE_RESULTS, hits: [RECITER_HIT], found: 1, totalPages: 1 }}
          typeCounts={{ reciters: 1, albums: 0, tracks: 0 }}
          currentType="reciters"
          currentPage={1}
        />,
      );

      expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull();
    });

    it('next page link includes correct page param', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={{ ...BASE_RESULTS, hits: [RECITER_HIT], found: 40, totalPages: 3 }}
          typeCounts={{ reciters: 40, albums: 0, tracks: 0 }}
          currentType="reciters"
          currentPage={2}
        />,
      );

      const nextLink = screen.getByRole('link', { name: /next page/i });
      expect(nextLink.getAttribute('href')).toContain('page=3');
    });

    it('previous link to page 1 omits the page param', () => {
      render(
        <SearchResultsContent
          query="hussain"
          results={{ ...BASE_RESULTS, hits: [RECITER_HIT], found: 40, totalPages: 3 }}
          typeCounts={{ reciters: 40, albums: 0, tracks: 0 }}
          currentType="reciters"
          currentPage={2}
        />,
      );

      const prevLink = screen.getByRole('link', { name: /previous page/i });
      // Page 1 is the default — no page= needed in the URL.
      expect(prevLink.getAttribute('href')).not.toContain('page=');
    });
  });
});
