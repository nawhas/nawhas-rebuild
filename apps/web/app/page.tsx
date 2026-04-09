import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { FeaturedReciters } from '@/components/home/featured-reciters';
import { RecentAlbums } from '@/components/home/recent-albums';
import { PopularTracks } from '@/components/home/popular-tracks';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// Dynamic rendering avoids build-time DB access in CI/container builds.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Nawhas — Discover Recitations',
  description: 'A comprehensive digital library of nawha recitations.',
  canonical: siteUrl(),
});

const createCaller = createCallerFactory(appRouter);

/**
 * Home / Discovery Page
 *
 * Server Component — fetches featured content via tRPC server-side caller
 * and passes it to pure-presentation section components.
 */
export default async function HomePage(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const caller = createCaller({ db, session: null, user: null });
  const featured = await caller.home.getFeatured();

  return (
    <div className="py-10">
      <Container>
        <h1 className="sr-only">Nawhas — Discover Recitations</h1>
        <div className="flex flex-col gap-12">
          <FeaturedReciters reciters={featured.reciters} />
          <RecentAlbums albums={featured.albums} />
          <PopularTracks tracks={featured.tracks} />
        </div>
      </Container>
    </div>
  );
}
