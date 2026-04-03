'use client';

import { useState, useRef, useTransition, useEffect, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AutocompleteDTO,
  ReciterSearchItemDTO,
  AlbumSearchItemDTO,
  TrackSearchItemDTO,
  SearchHighlightDTO,
} from '@nawhas/types';
import { autocompleteSearch } from '@/server/actions/search';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface FlatItem {
  id: string;
  href: string;
  primaryText: string;
  secondaryText?: string;
  highlightSnippet?: string;
}

export type GroupKey = 'reciter' | 'album' | 'track';

export const GROUP_LABELS: Record<GroupKey, string> = {
  reciter: 'Reciters',
  album: 'Albums',
  track: 'Tracks',
};

export interface GroupedSection {
  key: GroupKey;
  label: string;
  items: Array<{ item: FlatItem; globalIndex: number }>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getHighlightSnippet(
  highlights: SearchHighlightDTO[],
  preferredField: string,
): string | undefined {
  const preferred = highlights.find((h) => h.field === preferredField);
  return preferred?.snippet ?? highlights[0]?.snippet;
}

function buildFlatItems(results: AutocompleteDTO | null): FlatItem[] {
  if (!results) return [];
  const items: FlatItem[] = [];

  for (const r of results.reciters as Array<ReciterSearchItemDTO & { highlights: SearchHighlightDTO[] }>) {
    items.push({
      id: `reciter-${r.id}`,
      href: `/reciters/${r.slug}`,
      primaryText: r.name,
      highlightSnippet: getHighlightSnippet(r.highlights, 'name'),
    });
  }

  for (const a of results.albums as Array<AlbumSearchItemDTO & { highlights: SearchHighlightDTO[] }>) {
    items.push({
      id: `album-${a.id}`,
      href: `/albums/${a.slug}`,
      primaryText: a.title,
      secondaryText: a.reciterName,
      highlightSnippet: getHighlightSnippet(a.highlights, 'title'),
    });
  }

  for (const t of results.tracks as Array<TrackSearchItemDTO & { highlights: SearchHighlightDTO[] }>) {
    items.push({
      id: `track-${t.id}`,
      href: `/reciters/${t.reciterSlug}/albums/${t.albumSlug}/tracks/${t.slug}`,
      primaryText: t.title,
      secondaryText: `${t.reciterName} · ${t.albumTitle}`,
      highlightSnippet: getHighlightSnippet(t.highlights, 'title'),
    });
  }

  return items;
}

function getGroupKey(item: FlatItem): GroupKey {
  if (item.id.startsWith('reciter-')) return 'reciter';
  if (item.id.startsWith('album-')) return 'album';
  return 'track';
}

function buildGroupedSections(flatItems: FlatItem[]): GroupedSection[] {
  const sections: GroupedSection[] = [];
  let globalIdx = 0;
  for (const groupKey of ['reciter', 'album', 'track'] as GroupKey[]) {
    const sectionItems: Array<{ item: FlatItem; globalIndex: number }> = [];
    for (const item of flatItems) {
      if (getGroupKey(item) === groupKey) {
        sectionItems.push({ item, globalIndex: globalIdx++ });
      }
    }
    if (sectionItems.length > 0) {
      sections.push({ key: groupKey, label: GROUP_LABELS[groupKey], items: sectionItems });
    }
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseSearchAutocompleteReturn {
  query: string;
  results: AutocompleteDTO | null;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeIndex: number;
  isPending: boolean;
  flatItems: FlatItem[];
  hasResults: boolean;
  groupedSections: GroupedSection[];
  listboxId: string;
  activeOptionId: string | undefined;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  closeDropdown: () => void;
  reset: () => void;
}

/**
 * Shared autocomplete search hook.
 *
 * Manages query state, debounced fetching, result grouping, and keyboard
 * navigation for the combobox pattern. Used by both the desktop SearchBar
 * and the mobile MobileSearchOverlay.
 */
export function useSearchAutocomplete(): UseSearchAutocompleteReturn {
  const listboxId = useId();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteDTO | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatItems = buildFlatItems(results);
  const hasResults =
    results !== null &&
    (results.reciters.length > 0 || results.albums.length > 0 || results.tracks.length > 0);
  const groupedSections = buildGroupedSections(flatItems);

  const activeOptionId =
    activeIndex >= 0 && flatItems[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    setResults(null);
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await autocompleteSearch(value.trim());
        setResults(data);
        setIsOpen(true);
        setActiveIndex(-1);
      });
    }, 200);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (activeIndex >= 0 && flatItems[activeIndex]) {
            router.push(flatItems[activeIndex].href);
            closeDropdown();
            setQuery('');
          } else if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            closeDropdown();
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          closeDropdown();
          break;
        }
        case 'Tab': {
          closeDropdown();
          break;
        }
      }
    },
    [isOpen, flatItems, activeIndex, query, router, closeDropdown],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    query,
    results,
    isOpen,
    setIsOpen,
    activeIndex,
    isPending,
    flatItems,
    hasResults,
    groupedSections,
    listboxId,
    activeOptionId,
    handleChange,
    handleKeyDown,
    closeDropdown,
    reset,
  };
}
