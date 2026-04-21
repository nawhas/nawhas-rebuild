import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { userLikedTracks } from '@nawhas/db';
import { router, protectedProcedure } from '../trpc/trpc';

export const likesRouter = router({
  /**
   * Like a track (idempotent upsert).
   */
  like: protectedProcedure
    .input(z.object({ trackId: z.uuid() }))
    .mutation(async ({ ctx, input }): Promise<void> => {
      await ctx.db
        .insert(userLikedTracks)
        .values({ userId: ctx.user.id, trackId: input.trackId })
        .onConflictDoNothing();
    }),

  /**
   * Remove a like from a track.
   */
  unlike: protectedProcedure
    .input(z.object({ trackId: z.uuid() }))
    .mutation(async ({ ctx, input }): Promise<void> => {
      await ctx.db
        .delete(userLikedTracks)
        .where(
          and(
            eq(userLikedTracks.userId, ctx.user.id),
            eq(userLikedTracks.trackId, input.trackId),
          ),
        );
    }),

  /**
   * Returns true if the authenticated user has liked the given track.
   */
  isLiked: protectedProcedure
    .input(z.object({ trackId: z.uuid() }))
    .query(async ({ ctx, input }): Promise<boolean> => {
      const row = await ctx.db.query.userLikedTracks.findFirst({
        where: and(
          eq(userLikedTracks.userId, ctx.user.id),
          eq(userLikedTracks.trackId, input.trackId),
        ),
        columns: { trackId: true },
      });
      return row !== undefined;
    }),

  /**
   * Returns a map of trackId → liked boolean for a batch of track IDs.
   * Avoids N+1 queries in list views.
   */
  batchStatus: protectedProcedure
    .input(z.object({ trackIds: z.array(z.uuid()).max(200) }))
    .query(async ({ ctx, input }): Promise<Record<string, boolean>> => {
      if (input.trackIds.length === 0) return {};

      const rows = await ctx.db
        .select({ trackId: userLikedTracks.trackId })
        .from(userLikedTracks)
        .where(
          and(
            eq(userLikedTracks.userId, ctx.user.id),
            inArray(userLikedTracks.trackId, input.trackIds),
          ),
        );

      const likedSet = new Set(rows.map((r) => r.trackId));
      return Object.fromEntries(input.trackIds.map((id) => [id, likedSet.has(id)]));
    }),
});
