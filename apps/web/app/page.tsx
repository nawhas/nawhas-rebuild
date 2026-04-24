import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { FeaturedReciters } from '@/components/home/featured-reciters';
import { HeroSection } from '@/components/home/hero-section';
import { PopularTracks } from '@/components/home/popular-tracks';
import { RecentAlbums } from '@/components/home/recent-albums';
import { SavedStrip } from '@/components/home/saved-strip';
import { TopNawhasTable } from '@/components/home/top-nawhas-table';
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
 *
 * Layout order:
 *   1. HeroSection — POC red-gradient + Fraunces slogan + hero SearchBar.
 *   2. SavedStrip (client) — only renders for signed-in users with saves.
 *   3. FeaturedReciters / RecentAlbums / PopularTracks — pre-existing.
 *   4. TopNawhasTable — numbered ordered list with deep links.
 */
export default async function HomePage(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const caller = createCaller({ db, session: null, user: null });
  const [featured, topTracks] = await Promise.all([
    caller.home.getFeatured(),
    caller.home.getTopTracks({ limit: 10 }),
  ]);

  return (
    <>
      <HeroSection />
      <div className="py-10">
        <Container>
          <div className="flex flex-col gap-12">
            <SavedStrip />
            <FeaturedReciters reciters={featured.reciters} />
            <RecentAlbums albums={featured.albums} />
            <PopularTracks tracks={featured.tracks} />
            <TopNawhasTable tracks={topTracks} />
          </div>
        </Container>
      </div>
    </>
  );
}
