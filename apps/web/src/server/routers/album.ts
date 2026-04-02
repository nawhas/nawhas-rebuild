import { z } from 'zod';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { albums, reciters, tracks } from '@nawhas/db';
import { router, publicProcedure } from '../trpc/trpc';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import type { AlbumDTO, AlbumWithTracksDTO, PaginatedResult } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const albumRouter = router({
  /**
   * Returns a paginated list of albums ordered by creation date (newest first).
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
    .query(async ({ ctx, input }): Promise<PaginatedResult<AlbumDTO>> => {
      const limit = input.limit;

      const where = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return or(
              lt(albums.createdAt, createdAt),
              and(eq(albums.createdAt, createdAt), gt(albums.id, id)),
            );
          })()
        : undefined;

      const rows = await ctx.db
        .select()
        .from(albums)
        .where(where)
        .orderBy(desc(albums.createdAt), asc(albums.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items, nextCursor };
    }),

  /**
   * Returns a single album by slug (scoped to a reciter slug), including ordered tracks.
   */
  getBySlug: publicProcedure
    .input(
      z.object({
        reciterSlug: z.string().min(1),
        albumSlug: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }): Promise<AlbumWithTracksDTO | null> => {
      // Resolve reciter first to scope the album lookup.
      const reciter = await ctx.db.query.reciters.findFirst({
        where: eq(reciters.slug, input.reciterSlug),
        columns: { id: true },
      });

      if (!reciter) return null;

      const album = await ctx.db.query.albums.findFirst({
        where: and(eq(albums.reciterId, reciter.id), eq(albums.slug, input.albumSlug)),
        with: {
          tracks: {
            orderBy: [asc(tracks.trackNumber), asc(tracks.createdAt)],
          },
        },
      });

      return album ?? null;
    }),

  /**
   * Returns a paginated list of albums for a given reciter slug.
   */
  listByReciter: publicProcedure
    .input(
      z.object({
        reciterSlug: z.string().min(1),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<AlbumDTO>> => {
      const limit = input.limit;

      const reciter = await ctx.db.query.reciters.findFirst({
        where: eq(reciters.slug, input.reciterSlug),
        columns: { id: true },
      });

      if (!reciter) return { items: [], nextCursor: null };

      const cursorWhere = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return or(
              lt(albums.createdAt, createdAt),
              and(eq(albums.createdAt, createdAt), gt(albums.id, id)),
            );
          })()
        : undefined;

      const rows = await ctx.db
        .select()
        .from(albums)
        .where(
          cursorWhere
            ? and(eq(albums.reciterId, reciter.id), cursorWhere)
            : eq(albums.reciterId, reciter.id),
        )
        .orderBy(desc(albums.year), desc(albums.createdAt), asc(albums.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items, nextCursor };
    }),
});
