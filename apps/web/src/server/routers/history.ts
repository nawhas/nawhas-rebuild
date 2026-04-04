import { z } from 'zod';
import { and, desc, asc, eq, gte, gt, lt, or } from 'drizzle-orm';
import { listeningHistory, tracks } from '@nawhas/db';
import { router, protectedProcedure } from '../trpc/trpc';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import type { ListenHistoryEntryDTO, PaginatedResult } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** 30-second server-side dedup window in milliseconds. */
const DEDUP_WINDOW_MS = 30_000;

export const historyRouter = router({
  /**
   * Records a track play in listening history.
   * 30s server-side dedup: skips insert if the same track was recorded
   * within the last 30 seconds for this user.
   */
  record: protectedProcedure
    .input(z.object({ trackId: z.string().uuid() }))
    .mutation(async ({ ctx, input }): Promise<void> => {
      const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS);

      const [recent] = await ctx.db
        .select({ id: listeningHistory.id })
        .from(listeningHistory)
        .where(
          and(
            eq(listeningHistory.userId, ctx.user.id),
            eq(listeningHistory.trackId, input.trackId),
            gte(listeningHistory.playedAt, windowStart),
          ),
        )
        .limit(1);

      if (recent) return;

      await ctx.db.insert(listeningHistory).values({
        userId: ctx.user.id,
        trackId: input.trackId,
      });
    }),

  /**
   * Paginated listening history, newest first.
   * Cursor encodes (playedAt, id).
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<ListenHistoryEntryDTO>> => {
      const limit = input.limit;

      const cursorWhere = input.cursor
        ? (() => {
            const { createdAt: playedAt, id } = decodeCursor(input.cursor);
            return or(
              lt(listeningHistory.playedAt, playedAt),
              and(eq(listeningHistory.playedAt, playedAt), gt(listeningHistory.id, id)),
            );
          })()
        : undefined;

      const rows = await ctx.db
        .select({
          id: listeningHistory.id,
          trackId: listeningHistory.trackId,
          playedAt: listeningHistory.playedAt,
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
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .where(
          cursorWhere
            ? and(eq(listeningHistory.userId, ctx.user.id), cursorWhere)
            : eq(listeningHistory.userId, ctx.user.id),
        )
        .orderBy(desc(listeningHistory.playedAt), asc(listeningHistory.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem ? encodeCursor(lastItem.playedAt, lastItem.id) : null;

      return {
        items: items.map((r) => ({
          id: r.id,
          trackId: r.trackId,
          playedAt: r.playedAt.toISOString(),
          track: r.track,
        })),
        nextCursor,
      };
    }),

  /**
   * Clears the entire listening history for the authenticated user.
   */
  clear: protectedProcedure.mutation(async ({ ctx }): Promise<void> => {
    await ctx.db
      .delete(listeningHistory)
      .where(eq(listeningHistory.userId, ctx.user.id));
  }),
});
