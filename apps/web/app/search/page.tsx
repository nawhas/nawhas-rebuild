import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { SearchResultsContent } from '@/components/search/search-results-content';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { serverLogger } from '@/lib/logger/server';

// Dynamic rendering required for searchParams access
export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

// Search pages must not be indexed — results are dynamic and query-specific.
// No ISR: content is user-driven, not cacheable at the route level.

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  try {
    const { q } = await searchParams;
    const query = q?.trim() ?? '';

    if (!query) {
      return buildMetadata({ title: 'Search', noIndex: true, canonical: `${siteUrl()}/search` });
    }

    return buildMetadata({
      title: `"${query}" — Search`,
      description: `Search results for "${query}" on Nawhas.com`,
      noIndex: true,
      canonical: `${siteUrl()}/search?q=${encodeURIComponent(query)}`,
    });
  } catch (error) {
    await serverLogger.error('search.generateMetadata_failed', error, {
      route: '/search',
      dynamicConfig: dynamic,
      usesSearchParams: true,
      usesHeaders: false,
      usesCookies: false,
    });
    throw error;
  }
}

const VALID_TYPES = ['all', 'reciters', 'albums', 'tracks'] as const;
type SearchType = (typeof VALID_TYPES)[number];

function parseType(raw: string | undefined): SearchType {
  if (raw && (VALID_TYPES as readonly string[]).includes(raw)) {
    return raw as SearchType;
  }
  return 'all';
}

function parsePage(raw: string | undefined): number {
  const n = parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Search Results Page
 *
 * Server Component — fetches results and per-type counts server-side for SEO
 * and no loading flash on initial render. Tab switching and pagination are
 * handled client-side via URL navigation (Link / router.push), which triggers
 * a new server render with updated searchParams.
 */
export default async function SearchPage({ searchParams }: SearchPageProps): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const requestId = reqHeaders.get('x-request-id');
  const host = reqHeaders.get('host');
  const t = await getTranslations('search');
  const { q, type, page } = await searchParams;

  const query = q?.trim() ?? '';
  const currentType = parseType(type);
  const currentPage = parsePage(page);

  // Empty query — prompt the user to search.
  if (!query) {
    return (
      <div className="py-10">
        <Container>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t('heading')}</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('emptyQueryPrompt')}
          </p>
        </Container>
      </div>
    );
  }

  const caller = createCaller({ db, session: null, user: null });

  // Fetch the main results page and per-type found counts in parallel.
  // Count queries use perPage=1 — we only need the `found` field.
  const [results, recitersResult, albumsResult, tracksResult] = await (async () => {
    try {
      return await Promise.all([
        caller.search.query({ q: query, type: currentType, page: currentPage, perPage: 20 }),
        caller.search.query({ q: query, type: 'reciters', page: 1, perPage: 1 }),
        caller.search.query({ q: query, type: 'albums', page: 1, perPage: 1 }),
        caller.search.query({ q: query, type: 'tracks', page: 1, perPage: 1 }),
      ]);
    } catch (error) {
      await serverLogger.error('search.page_query_failed', error, {
        route: '/search',
        requestId,
        host,
        query,
        type: currentType,
        page: currentPage,
        rawSearchParams: { q, type, page },
        dynamicConfig: dynamic,
        usesSearchParams: true,
        usesHeaders: true,
        usesCookies: false,
      });
      throw error;
    }
  })();

  const typeCounts = {
    reciters: recitersResult.found,
    albums: albumsResult.found,
    tracks: tracksResult.found,
  };

  return (
    <div className="py-10">
      <Container>
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          {t.rich('resultsHeading', {
            query,
            italic: (chunks) => <span className="italic text-gray-600 dark:text-gray-400">&ldquo;{chunks}&rdquo;</span>,
          })}
        </h1>
        <SearchResultsContent
          query={query}
          results={results}
          typeCounts={typeCounts}
          currentType={currentType}
          currentPage={currentPage}
        />
      </Container>
    </div>
  );
}
