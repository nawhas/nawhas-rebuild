import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MobileSearchOverlay } from '../mobile-search-overlay';
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
    {
      id: 'r1',
      name: 'Hussain Al Akrami',
      slug: 'hussain-al-akrami',
      highlights: [{ field: 'name', snippet: '<mark>Hussain</mark> Al Akrami' }],
    },
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

function getTriggerButton(): HTMLElement {
  return screen.getByRole('button', { name: /open search/i });
}

function openOverlay(): void {
  fireEvent.click(getTriggerButton());
}

// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('MobileSearchOverlay', () => {
  describe('trigger button', () => {
    it('renders the search trigger button', () => {
      render(<MobileSearchOverlay />);
      expect(getTriggerButton()).toBeDefined();
    });

    it('trigger button has aria-haspopup="dialog"', () => {
      render(<MobileSearchOverlay />);
      expect(getTriggerButton().getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('overlay is not visible initially', () => {
      render(<MobileSearchOverlay />);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('open/close', () => {
    it('opens the overlay when trigger is clicked', () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('overlay has correct ARIA attributes', () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-label')).toBe('Search');
    });

    it('close button closes the overlay', () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      expect(screen.getByRole('dialog')).toBeDefined();

      const closeBtn = screen.getByRole('button', { name: /close search/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('Escape key closes the overlay', async () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      expect(screen.getByRole('dialog')).toBeDefined();

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('restores focus to trigger button after closing', async () => {
      render(<MobileSearchOverlay />);
      const trigger = getTriggerButton();
      trigger.focus();

      openOverlay();

      const closeBtn = screen.getByRole('button', { name: /close search/i });
      fireEvent.click(closeBtn);

      // Focus restoration uses requestAnimationFrame — flush it
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      // In jsdom, focus is restored
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('search input', () => {
    it('renders a combobox input inside the overlay', () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      expect(screen.getByRole('combobox')).toBeDefined();
    });

    it('input has correct aria-label', () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-label')).toBe('Search reciters, albums, and tracks');
    });

    it('input starts with aria-expanded=false', () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('autocomplete results', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    async function openAndSearch(query: string): Promise<HTMLElement> {
      mockAutocompleteSearch.mockResolvedValue(SAMPLE_RESULTS);
      render(<MobileSearchOverlay />);
      openOverlay();
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: query } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });
      return input;
    }

    it('shows grouped results after debounce', async () => {
      await openAndSearch('hussain');
      expect(screen.getByRole('listbox')).toBeDefined();
      expect(screen.getByText('Reciters')).toBeDefined();
      expect(screen.getByText('Albums')).toBeDefined();
      expect(screen.getByText('Tracks')).toBeDefined();
    });

    it('result options have role=option', async () => {
      await openAndSearch('hussain');
      const options = screen.getAllByRole('option');
      expect(options.length).toBe(3); // 1 reciter + 1 album + 1 track
    });

    it('sets aria-expanded=true when results are open', async () => {
      const input = await openAndSearch('hussain');
      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    it('shows "no results" message for empty results', async () => {
      mockAutocompleteSearch.mockResolvedValue(EMPTY_RESULTS);
      render(<MobileSearchOverlay />);
      openOverlay();
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'zzz' } });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });
      expect(screen.getByText(/No results for/)).toBeDefined();
    });

    it('closes overlay when a result link is clicked', async () => {
      await openAndSearch('hussain');
      const options = screen.getAllByRole('option');
      fireEvent.click(options[0]!);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('reciter result links to /reciters/:slug', async () => {
      await openAndSearch('hussain');
      const links = screen.getAllByRole('option') as HTMLAnchorElement[];
      const reciterLink = links.find((l) => l.href?.includes('/reciters/hussain-al-akrami'));
      expect(reciterLink).toBeDefined();
    });

    it('Escape in input closes the overlay (not just the dropdown)', async () => {
      const input = await openAndSearch('hussain');
      // Results are open (aria-expanded=true)
      expect(input.getAttribute('aria-expanded')).toBe('true');

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Escape' });
      });
      // Entire overlay should be closed
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('focus management', () => {
    it('overlay contains a focusable close button and input', () => {
      render(<MobileSearchOverlay />);
      openOverlay();
      expect(screen.getByRole('combobox')).toBeDefined();
      expect(screen.getByRole('button', { name: /close search/i })).toBeDefined();
    });
  });
});
