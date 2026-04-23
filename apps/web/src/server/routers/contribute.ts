import { z } from 'zod';
import { asc, eq, ilike } from 'drizzle-orm';
import { albums, reciters } from '@nawhas/db';
import { router, contributorProcedure } from '../trpc/trpc';

const SEARCH_LIMIT = 20;

export const contributeRouter = router({
  /**
   * Typeahead for the album form's reciter picker.
   * Returns up to 20 reciters matching the query (case-insensitive substring).
   */
  searchReciters: contributorProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: reciters.id,
          name: reciters.name,
          slug: reciters.slug,
          avatarUrl: reciters.avatarUrl,
        })
        .from(reciters)
        .where(ilike(reciters.name, `%${input.query}%`))
        .orderBy(asc(reciters.name))
        .limit(SEARCH_LIMIT);
    }),

  /**
   * Typeahead for the track form's album picker.
   * Joins albums with reciters so the client can render grouped-by-reciter options.
   */
  searchAlbums: contributorProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          reciterId: albums.reciterId,
          reciterName: reciters.name,
        })
        .from(albums)
        .innerJoin(reciters, eq(reciters.id, albums.reciterId))
        .where(ilike(albums.title, `%${input.query}%`))
        .orderBy(asc(reciters.name), asc(albums.title))
        .limit(SEARCH_LIMIT);
    }),
});
