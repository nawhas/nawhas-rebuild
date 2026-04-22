import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { albums, reciters, tracks, userSavedTracks } from '@nawhas/db';
import { router, protectedProcedure, publicProcedure } from '../trpc/trpc';
import type { FeaturedDTO, TrackListItemDTO } from '@nawhas/types';

// Number of featured items per category returned on the home page.
const FEATURED_RECITERS_LIMIT = 6;
const RECENT_ALBUMS_LIMIT = 6;
const POPULAR_TRACKS_LIMIT = 6;
const TOP_TRACKS_DEFAULT_LIMIT = 10;
const TOP_TRACKS_MAX_LIMIT = 25;
const RECENT_SAVED_DEFAULT_LIMIT = 6;
const RECENT_SAVED_MAX_LIMIT = 12;

/** Shared projection that joins a track row to reciter + album slugs. */
const trackListItemColumns = {
  id: tracks.id,
  title: tracks.title,
  slug: tracks.slug,
  albumId: tracks.albumId,
  trackNumber: tracks.trackNumber,
  audioUrl: tracks.audioUrl,
  youtubeId: tracks.youtubeId,
  duration: tracks.duration,
  createdAt: tracks.createdAt,
  updatedAt: tracks.updatedAt,
  reciterSlug: reciters.slug,
  reciterName: reciters.name,
  albumSlug: albums.slug,
  albumTitle: albums.title,
} as const;

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

  /**
   * Returns the top tracks for the home-page "Top Nawhas" table, enriched
   * with the reciter + album slugs needed to build canonical track hrefs.
   *
   * Popularity proxy: newest tracks first (matches getFeatured convention
   * until true popularity metrics land — see Phase 2.3 roadmap).
   */
  getTopTracks: publicProcedure
    .input(
      z
        .object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(TOP_TRACKS_MAX_LIMIT)
            .optional()
            .default(TOP_TRACKS_DEFAULT_LIMIT),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<TrackListItemDTO[]> => {
      const limit = input?.limit ?? TOP_TRACKS_DEFAULT_LIMIT;
      return ctx.db
        .select(trackListItemColumns)
        .from(tracks)
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .innerJoin(reciters, eq(albums.reciterId, reciters.id))
        .orderBy(desc(tracks.createdAt))
        .limit(limit);
    }),

  /**
   * Returns the most recently saved tracks for the authenticated user,
   * enriched with reciter + album slugs for the home-page "Recently Saved"
   * strip.
   *
   * Ordered by savedAt DESC (most recent first). Returns an empty array for
   * users with no saved tracks.
   */
  getRecentSaved: protectedProcedure
    .input(
      z
        .object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(RECENT_SAVED_MAX_LIMIT)
            .optional()
            .default(RECENT_SAVED_DEFAULT_LIMIT),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<TrackListItemDTO[]> => {
      const limit = input?.limit ?? RECENT_SAVED_DEFAULT_LIMIT;
      return ctx.db
        .select(trackListItemColumns)
        .from(userSavedTracks)
        .innerJoin(tracks, eq(userSavedTracks.trackId, tracks.id))
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .innerJoin(reciters, eq(albums.reciterId, reciters.id))
        .where(eq(userSavedTracks.userId, ctx.user.id))
        .orderBy(desc(userSavedTracks.savedAt), desc(userSavedTracks.trackId))
        .limit(limit);
    }),
});
