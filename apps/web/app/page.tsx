import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { FeaturedReciters } from '@/components/home/featured-reciters';
import { HeroSection } from '@/components/home/hero-section';
import { PopularTracks } from '@/components/home/popular-tracks';
import { QuoteBanner } from '@/components/home/quote-banner';
import { SavedStrip } from '@/components/home/saved-strip';
import { TopNawhasTable } from '@/components/home/top-nawhas-table';
import { TrendingTracks } from '@/components/home/trending-tracks';
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
 * Layout order (post-Phase-2.6 POC alignment):
 *   1. HeroSection — POC dark+red-glow + Inter sans slogan + hero SearchBar.
 *   2. TrendingTracks — 5-up cover-grid (B-impl, see roadmap follow-up).
 *   3. SavedStrip (client) — always rendered; empty state with sign-in CTA.
 *   4. QuoteBanner — POC editorial pull-quote (hardcoded copy).
 *   5. FeaturedReciters — flat avatar grid with album/track counts.
 *   6. PopularTracks — POC 2-col card grid with cover + reciter + duration.
 *   7. TopNawhasTable — numbered ordered list with serif rank numerals.
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
            <TrendingTracks tracks={topTracks.slice(0, 5)} />
            <SavedStrip />
            <QuoteBanner />
            <FeaturedReciters reciters={featured.reciters} />
            <PopularTracks tracks={featured.tracks} />
            <TopNawhasTable tracks={topTracks} />
          </div>
        </Container>
      </div>
    </>
  );
}
