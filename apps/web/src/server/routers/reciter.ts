import { z } from 'zod';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { reciters, albums } from '@nawhas/db';
import { router, publicProcedure } from '../trpc/trpc';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import type { PaginatedResult, ReciterDTO, ReciterWithAlbumsDTO } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const reciterRouter = router({
  /**
   * Returns a paginated list of reciters ordered by creation date (newest first).
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
    .query(async ({ ctx, input }): Promise<PaginatedResult<ReciterDTO>> => {
      const limit = input.limit;

      const where = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return or(
              lt(reciters.createdAt, createdAt),
              and(eq(reciters.createdAt, createdAt), gt(reciters.id, id)),
            );
          })()
        : undefined;

      const rows = await ctx.db
        .select()
        .from(reciters)
        .where(where)
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
   * Returns a single reciter by slug, including their albums ordered by year desc.
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

      return reciter ?? null;
    }),
});
