'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type {
  SearchResultDTO,
  SearchHitDTO,
  ReciterSearchItemDTO,
  AlbumSearchItemDTO,
  TrackSearchItemDTO,
  SearchHighlightDTO,
} from '@nawhas/types';
import { AppImage } from '@/components/ui/image';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchType = 'all' | 'reciters' | 'albums' | 'tracks';

interface TypeCounts {
  reciters: number;
  albums: number;
  tracks: number;
}

export interface SearchResultsContentProps {
  query: string;
  results: SearchResultDTO;
  typeCounts: TypeCounts;
  currentType: SearchType;
  currentPage: number;
}

// ---------------------------------------------------------------------------
// Highlight helper
// ---------------------------------------------------------------------------

/**
 * Renders a Typesense snippet that may contain <mark> tags.
 * Content originates from our own server — safe to dangerouslySetInnerHTML.
 * Pass dir="rtl" and a lang code for Arabic/Urdu content.
 */
function HighlightedText({
  snippet,
  fallback,
  dir,
  lang,
}: {
  snippet: string | undefined;
  fallback: string;
  dir?: 'rtl' | 'ltr';
  lang?: string;
}) {
  if (!snippet) return <span dir={dir} lang={lang}>{fallback}</span>;
  return <span dir={dir} lang={lang} dangerouslySetInnerHTML={{ __html: snippet }} />;
}

/**
 * Finds the first lyrics highlight from any field matching `lyrics_<lang>`.
 * Returns the field name and snippet so the caller can derive the lang code.
 */
function findLyricsHighlight(
  highlights: SearchHighlightDTO[],
): { field: string; snippet: string } | undefined {
  return highlights.find(
    (h): h is { field: string; snippet: string } =>
      typeof h.field === 'string' &&
      h.field.startsWith('lyrics_') &&
      h.snippet != null,
  ) as { field: string; snippet: string } | undefined;
}

/** Derive RTL attributes from a Typesense field name like `lyrics_ar`. */
function rtlAttrsForField(field: string): { dir: 'rtl'; lang: string } | undefined {
  if (field === 'lyrics_ar') return { dir: 'rtl', lang: 'ar' };
  if (field === 'lyrics_ur') return { dir: 'rtl', lang: 'ur' };
  return undefined;
}

/** Find the first highlight snippet for a given field name. */
function findSnippet(
  highlights: SearchHighlightDTO[],
  field: string,
): string | undefined {
  return highlights.find((h) => h.field === field)?.snippet;
}

// ---------------------------------------------------------------------------
// Per-type result display components
//
// These are not new card designs — they deliberately match the visual style of
// ReciterCard, AlbumCard, and TrackListItem but accept the lighter SearchItemDTOs
// which lack timestamps, audioUrl, etc. that the full DTO card components require.
// ---------------------------------------------------------------------------

function ReciterResult({
  item,
  highlights,
}: {
  item: ReciterSearchItemDTO;
  highlights: SearchHighlightDTO[];
}) {
  const initials = item.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const nameSnippet = findSnippet(highlights, 'name');

  return (
    <Link
      href={`/reciters/${item.slug}`}
      className="group flex flex-col items-center gap-3 rounded-lg p-4 text-center transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      aria-label={`View ${item.name}'s profile`}
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-700 transition-colors group-hover:bg-gray-300"
      >
        {initials}
      </div>
      <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
        <HighlightedText snippet={nameSnippet} fallback={item.name} />
      </span>
    </Link>
  );
}

function AlbumResult({
  item,
  highlights,
}: {
  item: AlbumSearchItemDTO;
  highlights: SearchHighlightDTO[];
}) {
  const titleSnippet = findSnippet(highlights, 'title');
  const reciterSnippet = findSnippet(highlights, 'reciterName');

  return (
    <Link
      href={`/albums/${item.slug}`}
      className="group flex flex-col gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      aria-label={`View album: ${item.title}${item.year ? `, ${item.year}` : ''}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        {item.artworkUrl ? (
          <AppImage
            src={item.artworkUrl}
            alt={`${item.title} album cover`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-gray-700">
          <HighlightedText snippet={titleSnippet} fallback={item.title} />
        </span>
        <span className="text-xs text-gray-500">
          <HighlightedText snippet={reciterSnippet} fallback={item.reciterName} />
          {item.year ? ` · ${item.year}` : ''}
        </span>
      </div>
    </Link>
  );
}

function TrackResult({
  item,
  highlights,
}: {
  item: TrackSearchItemDTO;
  highlights: SearchHighlightDTO[];
}) {
  const titleSnippet = findSnippet(highlights, 'title');
  const albumSnippet = findSnippet(highlights, 'albumTitle');
  const reciterSnippet = findSnippet(highlights, 'reciterName');
  const lyricsHighlight = findLyricsHighlight(highlights);
  const lyricsRtlAttrs = lyricsHighlight ? rtlAttrsForField(lyricsHighlight.field) : undefined;

  const href = `/reciters/${item.reciterSlug}/albums/${item.albumSlug}/tracks/${item.slug}`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900"
      aria-label={`Play ${item.title} from ${item.albumTitle} by ${item.reciterName}`}
    >
      {/* Track number badge */}
      {item.trackNumber != null && (
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs tabular-nums text-gray-500 group-hover:bg-gray-200"
        >
          {item.trackNumber}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-gray-700">
          <HighlightedText snippet={titleSnippet} fallback={item.title} />
        </p>
        <p className="truncate text-xs text-gray-500">
          <HighlightedText snippet={reciterSnippet} fallback={item.reciterName} />
          {' · '}
          <HighlightedText snippet={albumSnippet} fallback={item.albumTitle} />
        </p>
        {lyricsHighlight && (
          <p className="mt-0.5 truncate text-xs italic text-gray-600">
            <HighlightedText
              snippet={lyricsHighlight.snippet}
              fallback=""
              {...(lyricsRtlAttrs ?? {})}
            />
          </p>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Hit renderer — dispatches to the right component by hit.type
// ---------------------------------------------------------------------------

function SearchHit({ hit }: { hit: SearchHitDTO }) {
  if (hit.type === 'reciter') {
    return <ReciterResult item={hit.item} highlights={hit.highlights} />;
  }
  if (hit.type === 'album') {
    return <AlbumResult item={hit.item} highlights={hit.highlights} />;
  }
  return <TrackResult item={hit.item} highlights={hit.highlights} />;
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

interface TabItem {
  type: SearchType;
  label: string;
  count: number;
}

function SearchTabs({
  query,
  currentType,
  typeCounts,
  totalFound,
}: {
  query: string;
  currentType: SearchType;
  typeCounts: TypeCounts;
  totalFound: number;
}) {
  const tabs: TabItem[] = [
    { type: 'all', label: 'All', count: totalFound },
    { type: 'reciters', label: 'Reciters', count: typeCounts.reciters },
    { type: 'albums', label: 'Albums', count: typeCounts.albums },
    { type: 'tracks', label: 'Tracks', count: typeCounts.tracks },
  ];

  function tabHref(tabType: SearchType): string {
    const params = new URLSearchParams({ q: query });
    if (tabType !== 'all') params.set('type', tabType);
    return `/search?${params.toString()}`;
  }

  return (
    <nav aria-label="Search result categories" className="mb-6">
      <ul role="tablist" className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = currentType === tab.type;
          return (
            <li key={tab.type} role="presentation">
              <Link
                href={tabHref(tab.type)}
                role="tab"
                aria-selected={isActive}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 ${
                  isActive
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    aria-label={`${tab.count} results`}
                    className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  query,
  currentType,
  currentPage,
  totalPages,
}: {
  query: string;
  currentType: SearchType;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  function pageHref(page: number): string {
    const params = new URLSearchParams({ q: query });
    if (currentType !== 'all') params.set('type', currentType);
    if (page > 1) params.set('page', String(page));
    return `/search?${params.toString()}`;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Search results pagination"
      className="mt-10 flex items-center justify-center gap-4"
    >
      {hasPrev ? (
        <Link
          href={pageHref(currentPage - 1)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          aria-label="Previous page"
        >
          ← Previous
        </Link>
      ) : (
        <button
          disabled
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed"
          aria-label="Previous page"
        >
          ← Previous
        </button>
      )}

      <span className="text-sm text-gray-600" aria-live="polite" aria-atomic="true">
        Page {currentPage} of {totalPages}
      </span>

      {hasNext ? (
        <Link
          href={pageHref(currentPage + 1)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          aria-label="Next page"
          scroll={false}
        >
          Next →
        </Link>
      ) : (
        <button
          disabled
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed"
          aria-label="Next page"
        >
          Next →
        </button>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ query }: { query: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <div aria-hidden="true" className="text-5xl">🔍</div>
      <p className="text-lg font-medium text-gray-900">
        No results for{' '}
        <span className="italic">"{query}"</span>
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-500">
        <li>Try searching in English, Arabic, or Urdu</li>
        <li>Check for spelling mistakes</li>
        <li>Try a broader term (e.g. a reciter's first name)</li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results grid / list — layout adapts to the types being shown
// ---------------------------------------------------------------------------

/** Group hits by type for the "All" tab view. */
interface HitGroup {
  label: string;
  type: 'reciter' | 'album' | 'track';
  hits: SearchHitDTO[];
}

function groupHits(hits: SearchHitDTO[]): HitGroup[] {
  const groups: Record<string, HitGroup> = {
    reciter: { label: 'Reciters', type: 'reciter', hits: [] },
    album: { label: 'Albums', type: 'album', hits: [] },
    track: { label: 'Tracks', type: 'track', hits: [] },
  };

  for (const hit of hits) {
    groups[hit.type]!.hits.push(hit);
  }

  return Object.values(groups).filter((g) => g.hits.length > 0);
}

function ResultsGrid({
  hits,
  currentType,
}: {
  hits: SearchHitDTO[];
  currentType: SearchType;
}) {
  if (currentType === 'tracks') {
    // Track results displayed as a list (like AlbumDetail track list).
    return (
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
        {hits.map((hit) => (
          <li key={`${hit.type}-${hit.item.id}`}>
            <SearchHit hit={hit} />
          </li>
        ))}
      </ul>
    );
  }

  if (currentType === 'reciters') {
    return (
      <ul
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        aria-label="Reciter results"
      >
        {hits.map((hit) => (
          <li key={`${hit.type}-${hit.item.id}`}>
            <SearchHit hit={hit} />
          </li>
        ))}
      </ul>
    );
  }

  if (currentType === 'albums') {
    return (
      <ul
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        aria-label="Album results"
      >
        {hits.map((hit) => (
          <li key={`${hit.type}-${hit.item.id}`}>
            <SearchHit hit={hit} />
          </li>
        ))}
      </ul>
    );
  }

  // currentType === 'all' — group by type with section headers.
  const groups = groupHits(hits);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.type} aria-label={group.label}>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{group.label}</h2>
          {group.type === 'track' ? (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {group.hits.map((hit) => (
                <li key={`${hit.type}-${hit.item.id}`}>
                  <SearchHit hit={hit} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {group.hits.map((hit) => (
                <li key={`${hit.type}-${hit.item.id}`}>
                  <SearchHit hit={hit} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

/**
 * Client wrapper for the search results page.
 *
 * Receives pre-fetched results from the Server Component parent; handles:
 * - Tab navigation via URL params (Link-based, no JS required for navigation)
 * - Grouped / typed result rendering with highlight support
 * - URL-based pagination with scroll-to-top on page change
 */
export function SearchResultsContent({
  query,
  results,
  typeCounts,
  currentType,
  currentPage,
}: SearchResultsContentProps) {
  // Scroll to top when page changes (pagination navigation).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const totalFound =
    typeCounts.reciters + typeCounts.albums + typeCounts.tracks;

  return (
    <div>
      <SearchTabs
        query={query}
        currentType={currentType}
        typeCounts={typeCounts}
        totalFound={totalFound}
      />

      {results.hits.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <>
          <ResultsGrid hits={results.hits} currentType={currentType} />
          <Pagination
            query={query}
            currentType={currentType}
            currentPage={currentPage}
            totalPages={results.totalPages}
          />
        </>
      )}
    </div>
  );
}
