import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { AlbumGrid } from '@/components/albums/album-grid';
import { YearFilter } from '@/components/albums/year-filter';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// Dynamic rendering avoids build-time DB access in CI/container builds.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Albums',
  description: 'Browse all nawha albums in our comprehensive digital library.',
  canonical: `${siteUrl()}/albums`,
});

const createCaller = createCallerFactory(appRouter);

interface AlbumsPageProps {
  searchParams: Promise<{ year?: string }>;
}

/**
 * Albums Listing Page
 *
 * Server Component — fetches the first page of albums (with reciter name and
 * track count via JOIN) plus the distinct release years for the filter
 * dropdown, then passes initial data + cursor to the AlbumGrid client
 * component for "Load More" pagination.
 *
 * The `?year=` query param scopes the listing server-side; selecting a
 * value in the dropdown triggers a router push, which re-runs this page
 * with the new param. AlbumGrid resets its accumulated cursor state when
 * the filter changes.
 */
export default async function AlbumsPage({
  searchParams,
}: AlbumsPageProps): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const t = await getTranslations('common');
  const tPage = await getTranslations('albumsPage');
  const caller = createCaller({ db, session: null, user: null });

  const { year: yearParam } = await searchParams;
  const parsedYear = yearParam !== undefined ? Number.parseInt(yearParam, 10) : NaN;
  const year = Number.isFinite(parsedYear) ? parsedYear : null;

  const [{ items, nextCursor }, availableYears] = await Promise.all([
    caller.album.list({
      limit: 24,
      ...(year !== null ? { year } : {}),
    }),
    caller.album.listAvailableYears(),
  ]);

  return (
    <div className="py-10">
      <Container>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)]">
            {t('albums')}
          </h1>
          {availableYears.length > 0 && (
            <YearFilter years={availableYears} selectedYear={year} />
          )}
        </div>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] px-6 py-12 text-center text-[var(--text-dim)]">
            {tPage('noResults')}
          </p>
        ) : (
          <AlbumGrid initialItems={items} initialCursor={nextCursor} year={year} />
        )}
      </Container>
    </div>
  );
}
