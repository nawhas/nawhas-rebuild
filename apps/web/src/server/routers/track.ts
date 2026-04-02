import { z } from 'zod';
import { and, asc, desc, eq } from 'drizzle-orm';
import { albums, reciters, tracks } from '@nawhas/db';
import { router, publicProcedure } from '../trpc/trpc';
import type { TrackDTO, TrackWithRelationsDTO } from '@nawhas/types';

export const trackRouter = router({
  /**
   * Returns a single track by slug (scoped to reciter + album slugs),
   * including reciter, album, and all lyrics variants.
   */
  getBySlug: publicProcedure
    .input(
      z.object({
        reciterSlug: z.string().min(1),
        albumSlug: z.string().min(1),
        trackSlug: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }): Promise<TrackWithRelationsDTO | null> => {
      const reciter = await ctx.db.query.reciters.findFirst({
        where: eq(reciters.slug, input.reciterSlug),
        columns: { id: true },
      });

      if (!reciter) return null;

      const album = await ctx.db.query.albums.findFirst({
        where: and(eq(albums.reciterId, reciter.id), eq(albums.slug, input.albumSlug)),
        columns: { id: true },
      });

      if (!album) return null;

      const track = await ctx.db.query.tracks.findFirst({
        where: and(eq(tracks.albumId, album.id), eq(tracks.slug, input.trackSlug)),
        with: {
          album: {
            with: {
              reciter: true,
            },
          },
          lyrics: {
            orderBy: [asc(tracks.createdAt)],
          },
        },
      });

      if (!track) return null;

      // Flatten the nested album.reciter into the expected DTO shape.
      const { album: trackAlbum, lyrics, ...trackFields } = track;
      const { reciter: albumReciter, ...albumFields } = trackAlbum;

      return {
        ...trackFields,
        album: albumFields,
        reciter: albumReciter,
        lyrics,
      };
    }),

  /**
   * Returns all tracks for a given album (by reciter slug + album slug),
   * ordered by track number then creation date.
   */
  listByAlbum: publicProcedure
    .input(
      z.object({
        reciterSlug: z.string().min(1),
        albumSlug: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }): Promise<TrackDTO[]> => {
      const reciter = await ctx.db.query.reciters.findFirst({
        where: eq(reciters.slug, input.reciterSlug),
        columns: { id: true },
      });

      if (!reciter) return [];

      const album = await ctx.db.query.albums.findFirst({
        where: and(eq(albums.reciterId, reciter.id), eq(albums.slug, input.albumSlug)),
        columns: { id: true },
      });

      if (!album) return [];

      return ctx.db
        .select()
        .from(tracks)
        .where(eq(tracks.albumId, album.id))
        .orderBy(asc(tracks.trackNumber), desc(tracks.createdAt));
    }),
});
