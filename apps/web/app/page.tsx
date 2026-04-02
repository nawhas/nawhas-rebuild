import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { FeaturedReciters } from '@/components/home/featured-reciters';
import { RecentAlbums } from '@/components/home/recent-albums';
import { PopularTracks } from '@/components/home/popular-tracks';

// ISR: revalidate every hour so featured content stays fresh.
export const revalidate = 3600;

const createCaller = createCallerFactory(appRouter);

/**
 * Home / Discovery Page
 *
 * Server Component — fetches featured content via tRPC server-side caller
 * and passes it to pure-presentation section components.
 */
export default async function HomePage(): Promise<React.JSX.Element> {
  const caller = createCaller({ db, session: null, user: null });
  const featured = await caller.home.getFeatured();

  return (
    <main id="main-content" className="py-10">
      <Container>
        <div className="flex flex-col gap-12">
          <FeaturedReciters reciters={featured.reciters} />
          <RecentAlbums albums={featured.albums} />
          <PopularTracks tracks={featured.tracks} />
        </div>
      </Container>
    </main>
  );
}
