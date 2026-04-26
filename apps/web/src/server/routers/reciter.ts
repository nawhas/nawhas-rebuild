import { z } from 'zod';
import { and, asc, desc, eq, gt, lt, or, sql } from 'drizzle-orm';
import { reciters, albums, tracks } from '@nawhas/db';
import { router, publicProcedure } from '../trpc/trpc';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import type {
  PaginatedResult,
  ReciterFeaturedDTO,
  ReciterWithAlbumsDTO,
} from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const reciterRouter = router({
  /**
   * Returns a paginated list of reciters ordered by creation date (newest first),
   * enriched with `albumCount` + `trackCount` per row so list/grid cards can
   * render the "{N} tracks · {N} albums" subtitle without an N+1 fetch.
   *
   * Cursor encodes (createdAt, id); next page satisfies:
   *   (created_at < cursor_created_at) OR (created_at = cursor_created_at AND id > cursor_id)
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<ReciterFeaturedDTO>> => {
      const limit = input.limit;

      const cursorWhere = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return or(
              lt(reciters.createdAt, createdAt),
              and(eq(reciters.createdAt, createdAt), gt(reciters.id, id)),
            );
          })()
        : undefined;

      const rows = await ctx.db
        .select({
          id: reciters.id,
          name: reciters.name,
          slug: reciters.slug,
          arabicName: reciters.arabicName,
          country: reciters.country,
          birthYear: reciters.birthYear,
          description: reciters.description,
          avatarUrl: reciters.avatarUrl,
          createdAt: reciters.createdAt,
          updatedAt: reciters.updatedAt,
          albumCount: sql<number>`count(distinct ${albums.id})::int`,
          trackCount: sql<number>`count(distinct ${tracks.id})::int`,
        })
        .from(reciters)
        .leftJoin(albums, eq(albums.reciterId, reciters.id))
        .leftJoin(tracks, eq(tracks.albumId, albums.id))
        .where(cursorWhere)
        .groupBy(reciters.id)
        .orderBy(desc(reciters.createdAt), asc(reciters.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items, nextCursor };
    }),

  /**
   * Returns a single reciter by slug, including their albums ordered by year desc,
   * plus aggregated `albumCount` and `trackCount` for the profile-header stats line.
   *
   * Track count is computed via a single tracks⨝albums aggregation rather than
   * loading every track row through the relational API — relevant only for the
   * profile-header stats and we don't need the rows themselves here.
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<ReciterWithAlbumsDTO | null> => {
      const reciter = await ctx.db.query.reciters.findFirst({
        where: eq(reciters.slug, input.slug),
        with: {
          albums: {
            orderBy: [desc(albums.year), desc(albums.createdAt)],
          },
        },
      });

      if (!reciter) return null;

      const [counts] = await ctx.db
        .select({ trackCount: sql<number>`count(${tracks.id})::int` })
        .from(tracks)
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .where(eq(albums.reciterId, reciter.id));

      return {
        ...reciter,
        albumCount: reciter.albums.length,
        trackCount: counts?.trackCount ?? 0,
      };
    }),
});
