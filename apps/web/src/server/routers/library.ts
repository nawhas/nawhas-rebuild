import { z } from 'zod';
import { and, asc, desc, eq, gt, inArray, lt, or } from 'drizzle-orm';
import { tracks, userSavedTracks } from '@nawhas/db';
import { router, protectedProcedure } from '../trpc/trpc';
import { decodeCursor, encodeCursor } from '../lib/cursor';
import type { PaginatedResult, SavedTrackDTO, TrackDTO } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Maps a tracks row to TrackDTO.
 */
function toTrackDTO(row: typeof tracks.$inferSelect): TrackDTO {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    albumId: row.albumId,
    trackNumber: row.trackNumber,
    audioUrl: row.audioUrl,
    youtubeId: row.youtubeId,
    duration: row.duration,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const libraryRouter = router({
  /**
   * Save a track to the authenticated user's library (idempotent upsert).
   */
  save: protectedProcedure
    .input(z.object({ trackId: z.string().uuid() }))
    .mutation(async ({ ctx, input }): Promise<void> => {
      await ctx.db
        .insert(userSavedTracks)
        .values({ userId: ctx.user.id, trackId: input.trackId })
        .onConflictDoNothing();
    }),

  /**
   * Remove a track from the authenticated user's library.
   */
  unsave: protectedProcedure
    .input(z.object({ trackId: z.string().uuid() }))
    .mutation(async ({ ctx, input }): Promise<void> => {
      await ctx.db
        .delete(userSavedTracks)
        .where(
          and(
            eq(userSavedTracks.userId, ctx.user.id),
            eq(userSavedTracks.trackId, input.trackId),
          ),
        );
    }),

  /**
   * Returns true if the authenticated user has saved the given track.
   */
  isSaved: protectedProcedure
    .input(z.object({ trackId: z.string().uuid() }))
    .query(async ({ ctx, input }): Promise<boolean> => {
      const row = await ctx.db.query.userSavedTracks.findFirst({
        where: and(
          eq(userSavedTracks.userId, ctx.user.id),
          eq(userSavedTracks.trackId, input.trackId),
        ),
        columns: { trackId: true },
      });
      return row !== undefined;
    }),

  /**
   * Returns a map of trackId → saved boolean for a batch of track IDs.
   * Avoids N+1 queries in list views.
   */
  isSavedBatch: protectedProcedure
    .input(z.object({ trackIds: z.array(z.string().uuid()).max(200) }))
    .query(async ({ ctx, input }): Promise<Record<string, boolean>> => {
      if (input.trackIds.length === 0) return {};

      const rows = await ctx.db
        .select({ trackId: userSavedTracks.trackId })
        .from(userSavedTracks)
        .where(
          and(
            eq(userSavedTracks.userId, ctx.user.id),
            inArray(userSavedTracks.trackId, input.trackIds),
          ),
        );

      const savedSet = new Set(rows.map((r) => r.trackId));
      return Object.fromEntries(input.trackIds.map((id) => [id, savedSet.has(id)]));
    }),

  /**
   * Paginated list of saved tracks, ordered by savedAt DESC (newest first).
   * Cursor encodes (savedAt, trackId).
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<SavedTrackDTO>> => {
      const limit = input.limit;

      const cursorWhere = input.cursor
        ? (() => {
            const { createdAt: savedAt, id: trackId } = decodeCursor(input.cursor);
            return or(
              lt(userSavedTracks.savedAt, savedAt),
              and(eq(userSavedTracks.savedAt, savedAt), gt(userSavedTracks.trackId, trackId)),
            );
          })()
        : undefined;

      const rows = await ctx.db
        .select({
          trackId: userSavedTracks.trackId,
          savedAt: userSavedTracks.savedAt,
          track: {
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
          },
        })
        .from(userSavedTracks)
        .innerJoin(tracks, eq(userSavedTracks.trackId, tracks.id))
        .where(
          cursorWhere
            ? and(eq(userSavedTracks.userId, ctx.user.id), cursorWhere)
            : eq(userSavedTracks.userId, ctx.user.id),
        )
        .orderBy(desc(userSavedTracks.savedAt), asc(userSavedTracks.trackId))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem ? encodeCursor(lastItem.savedAt, lastItem.trackId) : null;

      return {
        items: items.map((r) => ({
          trackId: r.trackId,
          savedAt: r.savedAt.toISOString(),
          track: r.track,
        })),
        nextCursor,
      };
    }),

  /**
   * Returns all saved tracks in savedAt ASC order for queue injection.
   * Oldest-saved first so the queue plays in the order tracks were added.
   * No pagination — intended for play-all scenarios.
   */
  playAll: protectedProcedure.query(async ({ ctx }): Promise<TrackDTO[]> => {
    const rows = await ctx.db
      .select({
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
      })
      .from(userSavedTracks)
      .innerJoin(tracks, eq(userSavedTracks.trackId, tracks.id))
      .where(eq(userSavedTracks.userId, ctx.user.id))
      .orderBy(asc(userSavedTracks.savedAt), asc(userSavedTracks.trackId));

    return rows;
  }),
});
