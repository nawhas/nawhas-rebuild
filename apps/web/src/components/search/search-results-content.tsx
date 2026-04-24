'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type {
  SearchResultDTO,
  SearchHitDTO,
  ReciterSearchItemDTO,
  AlbumSearchItemDTO,
  TrackSearchItemDTO,
  SearchHighlightDTO,
} from '@nawhas/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@nawhas/ui/components/tabs';
import { CoverArt, ReciterAvatar } from '@nawhas/ui';

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
  return (
    <span
      dir={dir}
      lang={lang}
      // Token-backed highlight — matches mobile-search-overlay. Without these
      // the browser's default <mark> yellow bleeds through and reads as a
      // text selection, especially on the dark theme.
      className="[&_mark]:rounded-sm [&_mark]:bg-warning-200 [&_mark]:px-0.5 [&_mark]:text-warning-950 dark:[&_mark]:bg-warning-800 dark:[&_mark]:text-warning-50"
      dangerouslySetInnerHTML={{ __html: snippet }}
    />
  );
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
  const nameSnippet = findSnippet(highlights, 'name');

  return (
    <Link
      href={`/reciters/${item.slug}`}
      className="group flex flex-col items-center gap-3 rounded-lg p-4 text-center transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`View ${item.name}'s profile`}
    >
      <div className="h-16 w-16">
        <ReciterAvatar name={item.name} size="sm" fluid />
      </div>
      <span className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
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
      className="group flex flex-col gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`View album: ${item.title}${item.year ? `, ${item.year}` : ''}`}
    >
      <div className="aspect-square w-full overflow-hidden">
        <CoverArt
          slug={item.slug}
          artworkUrl={item.artworkUrl}
          label={item.title}
          size="sm"
          fluid
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="line-clamp-2 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
          <HighlightedText snippet={titleSnippet} fallback={item.title} />
        </span>
        <span className="text-xs text-[var(--text-dim)]">
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
      className="group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      aria-label={`View track ${item.title} from ${item.albumTitle} by ${item.reciterName}`}
    >
      {/* Album cover thumbnail — TrackSearchItemDTO has no artworkUrl, so
       * CoverArt renders a deterministic gradient seeded by the album slug.
       * Replaces the legacy track-number badge for visual consistency with
       * the album/reciter result rows. */}
      <div className="h-12 w-12 shrink-0 overflow-hidden">
        <CoverArt
          slug={item.albumSlug}
          label={item.albumTitle}
          size="sm"
          fluid
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
          <HighlightedText snippet={titleSnippet} fallback={item.title} />
        </p>
        <p className="truncate text-xs text-[var(--text-dim)]">
          <HighlightedText snippet={reciterSnippet} fallback={item.reciterName} />
          {' · '}
          <HighlightedText snippet={albumSnippet} fallback={item.albumTitle} />
        </p>
        {lyricsHighlight && (
          <p className="mt-0.5 truncate text-xs italic text-[var(--text-faint)]">
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
  const t = useTranslations('search.pagination');

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
      aria-label={t('navLabel')}
      className="mt-10 flex items-center justify-center gap-4"
    >
      {hasPrev ? (
        <Link
          href={pageHref(currentPage - 1)}
          className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t('previousLabel')}
        >
          {t('previous')}
        </Link>
      ) : (
        <button
          disabled
          className="cursor-not-allowed rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-faint)]"
          aria-label={t('previousLabel')}
        >
          {t('previous')}
        </button>
      )}

      <span className="text-sm text-[var(--text-dim)]" aria-live="polite" aria-atomic="true">
        {t('pageOf', { current: currentPage, total: totalPages })}
      </span>

      {hasNext ? (
        <Link
          href={pageHref(currentPage + 1)}
          className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t('nextLabel')}
          scroll={false}
        >
          {t('next')}
        </Link>
      ) : (
        <button
          disabled
          className="cursor-not-allowed rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-faint)]"
          aria-label={t('nextLabel')}
        >
          {t('next')}
        </button>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ query }: { query: string }) {
  const t = useTranslations('search.empty');

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <div aria-hidden="true" className="text-5xl">🔍</div>
      <p className="text-lg font-medium text-[var(--text)]">
        {t.rich('noResults', {
          query,
          italic: (chunks) => <span className="italic">&ldquo;{chunks}&rdquo;</span>,
        })}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--text-dim)]">
        <li>{t('tip1')}</li>
        <li>{t('tip2')}</li>
        <li>{t('tip3')}</li>
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

function groupHits(hits: SearchHitDTO[], labels: { reciters: string; albums: string; tracks: string }): HitGroup[] {
  const groups: Record<string, HitGroup> = {
    reciter: { label: labels.reciters, type: 'reciter', hits: [] },
    album: { label: labels.albums, type: 'album', hits: [] },
    track: { label: labels.tracks, type: 'track', hits: [] },
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
  const t = useTranslations('search');

  if (currentType === 'tracks') {
    // Track results displayed as a list (like AlbumDetail track list).
    return (
      <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
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
        aria-label={t('reciterResultsLabel')}
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
        aria-label={t('albumResultsLabel')}
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
  const groupLabels = {
    reciters: t('groups.reciters'),
    albums: t('groups.albums'),
    tracks: t('groups.tracks'),
  };
  const groups = groupHits(hits, groupLabels);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.type} aria-label={group.label}>
          <h2 className="mb-4 font-serif text-2xl font-medium text-[var(--text)]">{group.label}</h2>
          {group.type === 'track' ? (
            <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
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
// Tabs panel content — renders results (or empty state) for the active tab.
//
// Only the `currentType` tab's hits are fetched server-side, so the other
// three TabsContent blocks render empty placeholders. Radix hides them via
// `hidden` anyway; they exist purely so every TabsTrigger has a valid
// aria-controls target and the tab/tabpanel pairing is complete.
// ---------------------------------------------------------------------------

function ActivePanelBody({
  query,
  results,
  currentType,
  currentPage,
}: {
  query: string;
  results: SearchResultDTO;
  currentType: SearchType;
  currentPage: number;
}) {
  if (results.hits.length === 0) {
    return <EmptyState query={query} />;
  }
  return (
    <>
      <ResultsGrid hits={results.hits} currentType={currentType} />
      <Pagination
        query={query}
        currentType={currentType}
        currentPage={currentPage}
        totalPages={results.totalPages}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

interface TabDescriptor {
  type: SearchType;
  label: string;
  count: number;
}

/**
 * Client wrapper for the search results page.
 *
 * Receives pre-fetched results from the Server Component parent; handles:
 * - Tab navigation via URL params — each TabsTrigger delegates to a
 *   Next.js <Link> (asChild) so clicking a tab navigates to a new URL,
 *   triggering a fresh server render with updated searchParams. The
 *   Radix <Tabs> `value` is bound to `currentType` so the active-tab
 *   styling and `aria-selected` stay in sync with the URL.
 * - Grouped / typed result rendering with highlight support.
 * - URL-based pagination with scroll-to-top on page change.
 *
 * Swapping the hand-rolled tablist for Radix <Tabs> resolves the Critical
 * a11y finding from the 2.1e audit: the previous markup had role="tab"
 * triggers but no matching role="tabpanel" nor aria-controls wiring.
 * <Tabs>/<TabsContent> provides both automatically, plus keyboard
 * arrow-key navigation and roving tabindex.
 */
export function SearchResultsContent({
  query,
  results,
  typeCounts,
  currentType,
  currentPage,
}: SearchResultsContentProps) {
  const t = useTranslations('search');

  // Scroll to top when page changes (pagination navigation).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const totalFound =
    typeCounts.reciters + typeCounts.albums + typeCounts.tracks;

  const tabs: TabDescriptor[] = [
    { type: 'all', label: t('tabs.all'), count: totalFound },
    { type: 'reciters', label: t('tabs.reciters'), count: typeCounts.reciters },
    { type: 'albums', label: t('tabs.albums'), count: typeCounts.albums },
    { type: 'tracks', label: t('tabs.tracks'), count: typeCounts.tracks },
  ];

  function tabHref(tabType: SearchType): string {
    const params = new URLSearchParams({ q: query });
    if (tabType !== 'all') params.set('type', tabType);
    return `/search?${params.toString()}`;
  }

  return (
    <Tabs value={currentType}>
      <TabsList
        aria-label={t('tabsNavLabel')}
        className="mb-6 flex h-auto w-full justify-start gap-0 rounded-none border-b border-[var(--border)] bg-transparent p-0"
      >
        {tabs.map((tab) => {
          const isActive = currentType === tab.type;
          return (
            <TabsTrigger
              key={tab.type}
              value={tab.type}
              asChild
              className="inline-flex items-center gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-medium text-[var(--text-dim)] shadow-none transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=active]:border-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--accent)] data-[state=active]:shadow-none"
            >
              <Link href={tabHref(tab.type)}>
                {tab.label}
                {tab.count > 0 && (
                  <span
                    aria-label={t('resultsCount', { count: tab.count })}
                    className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface)] text-[var(--text-dim)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/*
       * Render a TabsContent block for every tab value so Radix can wire
       * role="tabpanel" + aria-controls on every trigger. Only the active
       * tab's body is populated (others render nothing — Radix hides them
       * with `hidden` anyway).
       */}
      {tabs.map((tab) => (
        <TabsContent key={tab.type} value={tab.type}>
          {tab.type === currentType ? (
            <ActivePanelBody
              query={query}
              results={results}
              currentType={currentType}
              currentPage={currentPage}
            />
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
