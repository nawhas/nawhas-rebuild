import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import type { LyricDTO } from '@nawhas/types';

// Stub ArabicText and UrduText — these have their own tests; we just need
// to verify that LyricsDisplay invokes the correct wrapper per language.
vi.mock('@/components/ui/arabic-text', () => ({
  ArabicText: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="arabic-text" dir="rtl" lang="ar">
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/urdu-text', () => ({
  UrduText: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="urdu-text" dir="rtl" lang="ur">
      {children}
    </div>
  ),
}));

import { LyricsDisplay } from '../lyrics-display';

// Helper to build a LyricDTO.
function makeLyric(language: string, text: string): LyricDTO {
  return {
    id: `lyric-${language}`,
    trackId: 'track-1',
    language,
    text,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

beforeEach(() => {
  // Ensure localStorage is clean before each test.
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LyricsDisplay', () => {
  describe('empty state', () => {
    it('returns null when lyrics array is empty', () => {
      const { container } = render(<LyricsDisplay lyrics={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('section heading', () => {
    it('renders a "Lyrics" heading when lyrics are present', () => {
      render(<LyricsDisplay lyrics={[makeLyric('en', 'Hello world')]} />);
      expect(screen.getByRole('heading', { name: /lyrics/i })).toBeDefined();
    });

    it('wraps the section with aria-labelledby pointing at the heading', () => {
      render(<LyricsDisplay lyrics={[makeLyric('en', 'Hello world')]} />);
      const section = screen.getByRole('region', { name: /lyrics/i });
      expect(section).toBeDefined();
    });
  });

  describe('single-language — no tabs shown', () => {
    it('does not render a tab list when only one language is present', () => {
      render(<LyricsDisplay lyrics={[makeLyric('en', 'English only')]} />);
      expect(screen.queryByRole('tablist')).toBeNull();
    });

    it('renders the lyric text directly', () => {
      render(<LyricsDisplay lyrics={[makeLyric('en', 'English only')]} />);
      expect(screen.getByText('English only')).toBeDefined();
    });
  });

  describe('multi-language — tab list shown', () => {
    const multiLyrics = [
      makeLyric('ar', 'النص العربي'),
      makeLyric('en', 'English text'),
    ];

    it('renders a tab list when multiple languages are present', () => {
      render(<LyricsDisplay lyrics={multiLyrics} />);
      expect(screen.getByRole('tablist', { name: /lyrics language/i })).toBeDefined();
    });

    it('renders one tab per available language', () => {
      render(<LyricsDisplay lyrics={multiLyrics} />);
      expect(screen.getByRole('tab', { name: /arabic/i })).toBeDefined();
      expect(screen.getByRole('tab', { name: /english/i })).toBeDefined();
    });

    it('labels the transliteration tab as "Romanized"', () => {
      render(
        <LyricsDisplay
          lyrics={[makeLyric('ar', 'عربي'), makeLyric('transliteration', 'arabi')]}
        />,
      );
      expect(screen.getByRole('tab', { name: /romanized/i })).toBeDefined();
    });

    it('defaults to Arabic tab when Arabic is available', () => {
      render(<LyricsDisplay lyrics={multiLyrics} />);
      const arTab = screen.getByRole('tab', { name: /arabic/i });
      expect(arTab.getAttribute('data-state')).toBe('active');
    });

    it('defaults to Urdu tab when Arabic is absent but Urdu is present', () => {
      const urduFirst = [makeLyric('ur', 'اردو متن'), makeLyric('en', 'English text')];
      render(<LyricsDisplay lyrics={urduFirst} />);
      const urTab = screen.getByRole('tab', { name: /urdu/i });
      expect(urTab.getAttribute('data-state')).toBe('active');
    });
  });

  describe('tab switching', () => {
    const arEnLyrics = [
      makeLyric('ar', 'النص العربي'),
      makeLyric('en', 'English text'),
    ];

    it('switching to the English tab makes its content visible', () => {
      render(<LyricsDisplay lyrics={arEnLyrics} />);
      // Radix Tabs requires a full pointer sequence to register a tab switch.
      const enTab = screen.getByRole('tab', { name: /english/i });
      act(() => {
        fireEvent.mouseDown(enTab);
        fireEvent.mouseUp(enTab);
        fireEvent.click(enTab);
      });
      expect(screen.getByRole('tab', { name: /english/i }).getAttribute('data-state')).toBe('active');
    });

    it('persists the selected language to localStorage on tab click', () => {
      render(<LyricsDisplay lyrics={arEnLyrics} />);
      const enTab = screen.getByRole('tab', { name: /english/i });
      act(() => {
        fireEvent.mouseDown(enTab);
        fireEvent.mouseUp(enTab);
        fireEvent.click(enTab);
      });
      expect(localStorage.getItem('nawhas-lyrics-language')).toBe('en');
    });

    it('restores the saved language preference from localStorage on mount', () => {
      localStorage.setItem('nawhas-lyrics-language', 'en');
      render(<LyricsDisplay lyrics={arEnLyrics} />);
      const enTab = screen.getByRole('tab', { name: /english/i });
      expect(enTab.getAttribute('data-state')).toBe('active');
    });

    it('ignores a saved preference that is not available in the current lyrics', () => {
      // Only Arabic is present, but localStorage says 'ur'
      localStorage.setItem('nawhas-lyrics-language', 'ur');
      render(<LyricsDisplay lyrics={[makeLyric('ar', 'عربي')]} />);
      // No tabs rendered (single language), and no crash
      expect(screen.queryByRole('tablist')).toBeNull();
      expect(screen.getByText('عربي')).toBeDefined();
    });
  });

  describe('language wrappers', () => {
    it('wraps Arabic lyrics with ArabicText', () => {
      render(<LyricsDisplay lyrics={[makeLyric('ar', 'النص العربي')]} />);
      expect(screen.getByTestId('arabic-text')).toBeDefined();
    });

    it('wraps Urdu lyrics with UrduText', () => {
      render(<LyricsDisplay lyrics={[makeLyric('ur', 'اردو')]} />);
      expect(screen.getByTestId('urdu-text')).toBeDefined();
    });

    it('renders English lyrics as a <p> with lang="en"', () => {
      render(<LyricsDisplay lyrics={[makeLyric('en', 'English lyrics')]} />);
      const p = screen.getByText('English lyrics');
      expect(p.tagName).toBe('P');
      expect(p.getAttribute('lang')).toBe('en');
    });

    it('renders transliteration with lang="en-Latn"', () => {
      render(<LyricsDisplay lyrics={[makeLyric('transliteration', 'ya husain')]} />);
      const p = screen.getByText('ya husain');
      expect(p.tagName).toBe('P');
      expect(p.getAttribute('lang')).toBe('en-Latn');
    });
  });

  describe('tab ordering', () => {
    it('always orders languages Arabic > Urdu > English > Romanized', () => {
      // Provide in reverse order to verify canonical ordering is applied
      const mixed = [
        makeLyric('transliteration', 'romanized'),
        makeLyric('en', 'english'),
        makeLyric('ur', 'urdu'),
        makeLyric('ar', 'arabic'),
      ];
      render(<LyricsDisplay lyrics={mixed} />);
      const tabs = screen.getAllByRole('tab');
      const tabNames = tabs.map((t) => t.textContent);
      expect(tabNames).toEqual(['Arabic', 'Urdu', 'English', 'Romanized']);
    });
  });

  describe('tabs only for content that exists', () => {
    it('shows only one tab when only one language lyric is provided in multi-lyric scenario', () => {
      // Multi-lyric but same single language — deduped, no tab list
      render(<LyricsDisplay lyrics={[makeLyric('en', 'line 1')]} />);
      expect(screen.queryByRole('tab')).toBeNull();
    });
  });
});
