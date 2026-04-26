import { z } from 'zod';
import { and, asc, desc, eq, gt, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { albums, reciters, tracks } from '@nawhas/db';
import { router, publicProcedure } from '../trpc/trpc';
import { encodeCursor, decodeCursor, encodeAlbumCursor, decodeAlbumCursor } from '../lib/cursor';
import type { AlbumDetailDTO, AlbumDTO, AlbumListItemDTO, AlbumWithTracksDTO, PaginatedResult } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const albumRouter = router({
  /**
   * Returns a paginated list of albums ordered by creation date (newest first).
   * Joins with reciters for the reciter name/slug and subquery-counts tracks.
   * Cursor encodes (createdAt, id); next page satisfies:
   *   (created_at < cursor_created_at) OR (created_at = cursor_created_at AND id > cursor_id)
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
        /** Optional release-year filter for the catalogue list page. */
        year: z.number().int().min(1900).max(2200).optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<AlbumListItemDTO>> => {
      const limit = input.limit;

      const cursorWhere = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return or(
              lt(albums.createdAt, createdAt),
              and(eq(albums.createdAt, createdAt), gt(albums.id, id)),
            );
          })()
        : undefined;

      const yearWhere = input.year !== undefined ? eq(albums.year, input.year) : undefined;

      const conditions = [cursorWhere, yearWhere].filter(
        (c): c is NonNullable<typeof c> => c !== undefined,
      );
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await ctx.db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          reciterId: albums.reciterId,
          year: albums.year,
          artworkUrl: albums.artworkUrl,
          createdAt: albums.createdAt,
          updatedAt: albums.updatedAt,
          reciterName: reciters.name,
          reciterSlug: reciters.slug,
          trackCount: sql<number>`(SELECT COUNT(*) FROM ${tracks} WHERE ${tracks.albumId} = ${albums.id})`,
        })
        .from(albums)
        .innerJoin(reciters, eq(albums.reciterId, reciters.id))
        .where(where)
        .orderBy(desc(albums.createdAt), asc(albums.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items: items.map((r) => ({ ...r, trackCount: Number(r.trackCount) })), nextCursor };
    }),

  /**
   * Returns the distinct release years present in the catalogue, ordered
   * newest-first. Used to populate the year filter dropdown on /albums.
   * Excludes albums with `year IS NULL`.
   */
  listAvailableYears: publicProcedure
    .query(async ({ ctx }): Promise<number[]> => {
      const rows = await ctx.db
        .selectDistinct({ year: albums.year })
        .from(albums)
        .where(isNotNull(albums.year))
        .orderBy(desc(albums.year));
      return rows.map((r) => r.year).filter((y): y is number => y !== null);
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
   * Returns a single album by its own slug (global lookup), including ordered tracks
   * and the reciter's name and slug for display and linking purposes.
   */
  getDetail: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<AlbumDetailDTO | null> => {
      const rows = await ctx.db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          reciterId: albums.reciterId,
          year: albums.year,
          artworkUrl: albums.artworkUrl,
          createdAt: albums.createdAt,
          updatedAt: albums.updatedAt,
          reciterName: reciters.name,
          reciterSlug: reciters.slug,
        })
        .from(albums)
        .innerJoin(reciters, eq(albums.reciterId, reciters.id))
        .where(eq(albums.slug, input.slug))
        .limit(1);

      const albumRow = rows[0];
      if (!albumRow) return null;

      const albumTracks = await ctx.db
        .select()
        .from(tracks)
        .where(eq(tracks.albumId, albumRow.id))
        .orderBy(asc(tracks.trackNumber), asc(tracks.createdAt));

      return { ...albumRow, tracks: albumTracks };
    }),

  /**
   * Returns a paginated list of albums for a given reciter slug.
   * Ordered by (year DESC NULLS FIRST, createdAt DESC, id ASC).
   * Cursor encodes (year, createdAt, id); next-page condition:
   *   If cursor year IS NULL:
   *     (year IS NULL AND (createdAt < cursor_createdAt OR (createdAt = cursor_createdAt AND id > cursor_id)))
   *     OR (year IS NOT NULL)
   *   If cursor year IS NOT NULL:
   *     (year < cursor_year)
   *     OR (year = cursor_year AND createdAt < cursor_createdAt)
   *     OR (year = cursor_year AND createdAt = cursor_createdAt AND id > cursor_id)
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
            const { year, createdAt, id } = decodeAlbumCursor(input.cursor);
            if (year === null) {
              // NULL years sort first (NULLS FIRST in DESC); next items are remaining
              // null-year rows or any non-null year row.
              return or(
                and(
                  isNull(albums.year),
                  or(
                    lt(albums.createdAt, createdAt),
                    and(eq(albums.createdAt, createdAt), gt(albums.id, id)),
                  ),
                ),
                isNotNull(albums.year),
              );
            }
            return or(
              lt(albums.year, year),
              and(eq(albums.year, year), lt(albums.createdAt, createdAt)),
              and(eq(albums.year, year), eq(albums.createdAt, createdAt), gt(albums.id, id)),
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
        hasMore && lastItem
          ? encodeAlbumCursor(lastItem.year, lastItem.createdAt, lastItem.id)
          : null;

      return { items, nextCursor };
    }),
});
