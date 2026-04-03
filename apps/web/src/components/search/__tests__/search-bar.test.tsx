import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from '../search-bar';
import type { AutocompleteDTO } from '@nawhas/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockAutocompleteSearch = vi.fn<(q: string) => Promise<AutocompleteDTO>>();
vi.mock('@/server/actions/search', () => ({
  autocompleteSearch: (q: string) => mockAutocompleteSearch(q),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_RESULTS: AutocompleteDTO = { reciters: [], albums: [], tracks: [] };

const SAMPLE_RESULTS: AutocompleteDTO = {
  reciters: [
    { id: 'r1', name: 'Hussain Al Akrami', slug: 'hussain-al-akrami', highlights: [{ field: 'name', snippet: '<mark>Hussain</mark> Al Akrami' }] },
  ],
  albums: [
    {
      id: 'a1',
      title: 'Safar',
      slug: 'safar',
      reciterId: 'r1',
      reciterName: 'Hussain Al Akrami',
      year: 2022,
      artworkUrl: null,
      highlights: [{ field: 'title', snippet: '<mark>Safar</mark>' }],
    },
  ],
  tracks: [
    {
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
      highlights: [{ field: 'title', snippet: '<mark>Ya Hussain</mark>' }],
    },
  ],
};

// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('SearchBar', () => {
  describe('renders', () => {
    it('renders the search input', () => {
      render(<SearchBar />);
      expect(screen.getByRole('combobox')).toBeDefined();
    });

    it('has aria-label on the input', () => {
      render(<SearchBar />);
      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-label')).toBe('Search reciters, albums, and tracks');
    });

    it('starts with aria-expanded=false', () => {
      render(<SearchBar />);
      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('does not show dropdown initially', () => {
      render(<SearchBar />);
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });

  describe('debounce and fetching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('does not call autocomplete for empty/whitespace input', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '   ' } });
      await act(async () => vi.runAllTimersAsync());
      expect(mockAutocompleteSearch).not.toHaveBeenCalled();
    });

    it('calls autocomplete after 200ms debounce', async () => {
      mockAutocompleteSearch.mockResolvedValue(EMPTY_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'hussain' } });
      expect(mockAutocompleteSearch).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      expect(mockAutocompleteSearch).toHaveBeenCalledWith('hussain');
    });

    it('debounces rapid typing — only one call for fast keystrokes', async () => {
      mockAutocompleteSearch.mockResolvedValue(EMPTY_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'h' } });
      fireEvent.change(input, { target: { value: 'hu' } });
      fireEvent.change(input, { target: { value: 'hus' } });

      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      expect(mockAutocompleteSearch).toHaveBeenCalledTimes(1);
      expect(mockAutocompleteSearch).toHaveBeenCalledWith('hus');
    });
  });

  describe('dropdown with results', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('shows grouped results after fetching', async () => {
      mockAutocompleteSearch.mockResolvedValue(SAMPLE_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'hussain' } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      expect(screen.getByRole('listbox')).toBeDefined();
      expect(screen.getByText('Reciters')).toBeDefined();
      expect(screen.getByText('Albums')).toBeDefined();
      expect(screen.getByText('Tracks')).toBeDefined();
    });

    it('sets aria-expanded=true when dropdown is open', async () => {
      mockAutocompleteSearch.mockResolvedValue(SAMPLE_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'hussain' } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    it('result options have role=option', async () => {
      mockAutocompleteSearch.mockResolvedValue(SAMPLE_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'hussain' } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(3); // 1 reciter + 1 album + 1 track
    });

    it('shows "no results" message when results are empty', async () => {
      mockAutocompleteSearch.mockResolvedValue(EMPTY_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'zzz' } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      expect(screen.getByText(/No results for/)).toBeDefined();
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    async function openWithResults() {
      mockAutocompleteSearch.mockResolvedValue(SAMPLE_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'hussain' } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });
      return input;
    }

    it('ArrowDown moves focus to first option', async () => {
      const input = await openWithResults();
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const options = screen.getAllByRole('option');
      expect(options[0]!.getAttribute('aria-selected')).toBe('true');
    });

    it('ArrowDown cycles through all options and wraps', async () => {
      const input = await openWithResults();
      // 3 items total: 1 reciter + 1 album + 1 track
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 0
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 1
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 2
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // wraps to 0

      const options = screen.getAllByRole('option');
      expect(options[0]!.getAttribute('aria-selected')).toBe('true');
    });

    it('ArrowUp moves focus to last option from start', async () => {
      const input = await openWithResults();
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const options = screen.getAllByRole('option');
      expect(options[options.length - 1]!.getAttribute('aria-selected')).toBe('true');
    });

    it('Escape closes the dropdown', async () => {
      const input = await openWithResults();
      expect(screen.getByRole('listbox')).toBeDefined();

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Escape' });
      });
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('Tab closes the dropdown', async () => {
      const input = await openWithResults();
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Tab' });
      });
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('Enter navigates to the selected option', async () => {
      const input = await openWithResults();
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // select first (reciter)
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockPush).toHaveBeenCalledWith('/reciters/hussain-al-akrami');
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('Enter navigates to search page when no option is selected', async () => {
      const input = await openWithResults();
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/search?q='));
    });

    it('aria-activedescendant updates as focus moves', async () => {
      const input = await openWithResults();
      await act(async () => {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
      });
      expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
    });
  });

  describe('result links', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    async function openWithResults() {
      mockAutocompleteSearch.mockResolvedValue(SAMPLE_RESULTS);
      render(<SearchBar />);
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'hussain' } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });
    }

    it('reciter result links to /reciters/:slug', async () => {
      await openWithResults();
      const links = screen.getAllByRole('option') as HTMLAnchorElement[];
      const reciterLink = links.find((l) => l.href?.includes('/reciters/hussain-al-akrami'));
      expect(reciterLink).toBeDefined();
    });

    it('album result links to /albums/:slug', async () => {
      await openWithResults();
      const links = screen.getAllByRole('option') as HTMLAnchorElement[];
      const albumLink = links.find((l) => l.href?.includes('/albums/safar'));
      expect(albumLink).toBeDefined();
    });

    it('track result links to /reciters/:reciterSlug/albums/:albumSlug/tracks/:slug', async () => {
      await openWithResults();
      const links = screen.getAllByRole('option') as HTMLAnchorElement[];
      const trackLink = links.find((l) =>
        l.href?.includes('/reciters/hussain-al-akrami/albums/safar/tracks/ya-hussain'),
      );
      expect(trackLink).toBeDefined();
    });
  });
});
