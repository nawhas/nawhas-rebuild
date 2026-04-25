import { z } from 'zod';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { albums, lyrics as lyricsTable, reciters, tracks } from '@nawhas/db';
import { router, publicProcedure } from '../trpc/trpc';
import type { TrackDTO, TrackListItemDTO, TrackWithRelationsDTO } from '@nawhas/types';

/** Track row projected with the reciter + album slugs needed to build canonical track URLs. */
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

const RELATED_TRACKS_DEFAULT_LIMIT = 8;
const RELATED_TRACKS_MAX_LIMIT = 16;

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
            orderBy: [asc(lyricsTable.language)],
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

  /**
   * Returns "related" tracks to surface in the track-detail sidebar:
   * other tracks by the same reciter, excluding the one being viewed.
   * Ordered by createdAt desc; limited to 8 by default.
   *
   * Returns an empty array when the input track does not exist (or has
   * no reciter), matching the behaviour expected by the sidebar — no
   * 404, just an empty list, since the page itself already 404s on a
   * bad track id upstream of this query.
   */
  getRelated: publicProcedure
    .input(
      z.object({
        trackId: z.string().uuid(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(RELATED_TRACKS_MAX_LIMIT)
          .optional()
          .default(RELATED_TRACKS_DEFAULT_LIMIT),
      }),
    )
    .query(async ({ ctx, input }): Promise<TrackListItemDTO[]> => {
      // Resolve the reciter for this track via its album.
      const [base] = await ctx.db
        .select({ reciterId: albums.reciterId })
        .from(tracks)
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .where(eq(tracks.id, input.trackId))
        .limit(1);

      if (!base) return [];

      return ctx.db
        .select(trackListItemColumns)
        .from(tracks)
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .innerJoin(reciters, eq(albums.reciterId, reciters.id))
        .where(and(eq(albums.reciterId, base.reciterId), ne(tracks.id, input.trackId)))
        .orderBy(desc(tracks.createdAt))
        .limit(input.limit);
    }),
});
