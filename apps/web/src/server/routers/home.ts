import { desc } from 'drizzle-orm';
import { albums, reciters, tracks } from '@nawhas/db';
import { router, publicProcedure } from '../trpc/trpc';
import type { FeaturedDTO } from '@nawhas/types';

// Number of featured items per category returned on the home page.
const FEATURED_RECITERS_LIMIT = 6;
const RECENT_ALBUMS_LIMIT = 6;
const POPULAR_TRACKS_LIMIT = 6;

export const homeRouter = router({
  /**
   * Returns featured content for the home page:
   * - Featured reciters (most recently added)
   * - Recent albums (by creation date)
   * - Popular tracks (most recently added as a proxy for popularity)
   */
  getFeatured: publicProcedure.query(async ({ ctx }): Promise<FeaturedDTO> => {
    const [featuredReciters, recentAlbums, popularTracks] = await Promise.all([
      ctx.db
        .select()
        .from(reciters)
        .orderBy(desc(reciters.createdAt))
        .limit(FEATURED_RECITERS_LIMIT),

      ctx.db
        .select()
        .from(albums)
        .orderBy(desc(albums.createdAt))
        .limit(RECENT_ALBUMS_LIMIT),

      ctx.db
        .select()
        .from(tracks)
        .orderBy(desc(tracks.createdAt))
        .limit(POPULAR_TRACKS_LIMIT),
    ]);

    return {
      reciters: featuredReciters,
      albums: recentAlbums,
      tracks: popularTracks,
    };
  }),
});
