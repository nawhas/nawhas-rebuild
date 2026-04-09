import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { AlbumGrid } from '@/components/albums/album-grid';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// ISR: revalidate every hour.
export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'Albums',
  description: 'Browse all nawha albums in our comprehensive digital library.',
  canonical: `${siteUrl()}/albums`,
});

const createCaller = createCallerFactory(appRouter);

/**
 * Albums Listing Page
 *
 * Server Component — fetches the first page of albums (with reciter name and
 * track count via JOIN) and passes initial data + cursor to the AlbumGrid
 * client component for "Load More" pagination.
 */
export default async function AlbumsPage(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const t = await getTranslations('common');
  const caller = createCaller({ db, session: null, user: null });
  const { items, nextCursor } = await caller.album.list({ limit: 24 });

  return (
    <div className="py-10">
      <Container>
        <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">{t('albums')}</h1>
        <AlbumGrid initialItems={items} initialCursor={nextCursor} />
      </Container>
    </div>
  );
}
