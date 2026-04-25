import { z } from 'zod';
import { and, asc, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { albums, auditLog, reciters, submissions, tracks, userSavedTracks, users } from '@nawhas/db';
import { router, protectedProcedure, publicProcedure } from '../trpc/trpc';
import type { FeaturedDTO, PaginatedResult, RecentChangeDTO, TrackListItemDTO } from '@nawhas/types';
import { encodeCursor, decodeCursor } from '../lib/cursor';

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
   * Public day-grouped catalogue feed source. Surfaces only
   * action='submission.applied' audit events, joined to the canonical
   * entity for title + slug + cover/avatar URL, plus the submitter's
   * display name. Internal moderator actions (role.changed, notes_updated,
   * etc.) never surface here.
   */
  recentChanges: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<RecentChangeDTO>> => {
      const limit = input.limit;

      const conditions: SQL[] = [eq(auditLog.action, 'submission.applied')];
      if (input.cursor) {
        const { createdAt, id } = decodeCursor(input.cursor);
        conditions.push(
          or(
            lt(auditLog.createdAt, createdAt),
            and(eq(auditLog.createdAt, createdAt), gt(auditLog.id, id)),
          )!,
        );
      }

      // Pull more than `limit` rows so we can still return `limit` after
      // dropping rows whose canonical entity got deleted (the join would
      // otherwise return fewer than `limit` items, falsely signaling "no more").
      const rows = await ctx.db
        .select({
          id: auditLog.id,
          createdAt: auditLog.createdAt,
          targetType: auditLog.targetType,
          targetId: auditLog.targetId,
          submissionId: sql<string>`(${auditLog.meta}->>'submissionId')`,
          submissionAction: sql<'create' | 'edit'>`(${auditLog.meta}->>'submissionAction')`,
          submitterName: users.name,
        })
        .from(auditLog)
        .innerJoin(submissions, sql`${submissions.id}::text = (${auditLog.meta}->>'submissionId')`)
        .innerJoin(users, eq(submissions.submittedByUserId, users.id))
        .where(and(...conditions))
        .orderBy(desc(auditLog.createdAt), asc(auditLog.id))
        .limit(limit + 1);

      const reciterIds = rows.filter((r) => r.targetType === 'reciter').map((r) => r.targetId).filter((x): x is string => !!x);
      const albumIds = rows.filter((r) => r.targetType === 'album').map((r) => r.targetId).filter((x): x is string => !!x);
      const trackIds = rows.filter((r) => r.targetType === 'track').map((r) => r.targetId).filter((x): x is string => !!x);

      const reciterMap = reciterIds.length === 0
        ? new Map<string, { id: string; name: string; slug: string; avatarUrl: string | null }>()
        : new Map(
          (
            await ctx.db
              .select({ id: reciters.id, name: reciters.name, slug: reciters.slug, avatarUrl: reciters.avatarUrl })
              .from(reciters)
              .where(inArray(reciters.id, reciterIds))
          ).map((r) => [r.id, r]),
        );

      const albumMap = albumIds.length === 0
        ? new Map<string, { id: string; title: string; slug: string; artworkUrl: string | null; reciterSlug: string }>()
        : new Map(
          (
            await ctx.db
              .select({
                id: albums.id,
                title: albums.title,
                slug: albums.slug,
                artworkUrl: albums.artworkUrl,
                reciterSlug: reciters.slug,
              })
              .from(albums)
              .innerJoin(reciters, eq(reciters.id, albums.reciterId))
              .where(inArray(albums.id, albumIds))
          ).map((a) => [a.id, a]),
        );

      const trackMap = trackIds.length === 0
        ? new Map<string, { id: string; title: string; slug: string; albumSlug: string; reciterSlug: string; artworkUrl: string | null }>()
        : new Map(
          (
            await ctx.db
              .select({
                id: tracks.id,
                title: tracks.title,
                slug: tracks.slug,
                albumSlug: albums.slug,
                reciterSlug: reciters.slug,
                artworkUrl: albums.artworkUrl,
              })
              .from(tracks)
              .innerJoin(albums, eq(albums.id, tracks.albumId))
              .innerJoin(reciters, eq(reciters.id, albums.reciterId))
              .where(inArray(tracks.id, trackIds))
          ).map((t) => [t.id, t]),
        );

      const items: RecentChangeDTO[] = [];
      for (const r of rows) {
        if (items.length >= limit) break;
        if (!r.targetId) continue;
        if (r.targetType === 'reciter') {
          const ent = reciterMap.get(r.targetId);
          if (!ent) continue;
          items.push({
            id: r.id,
            action: r.submissionAction,
            entityType: 'reciter',
            entityTitle: ent.name,
            entitySlugPath: `/reciters/${ent.slug}`,
            avatarUrl: ent.avatarUrl ?? null,
            submitterName: r.submitterName ?? 'A contributor',
            at: r.createdAt,
          });
        } else if (r.targetType === 'album') {
          const ent = albumMap.get(r.targetId);
          if (!ent) continue;
          items.push({
            id: r.id,
            action: r.submissionAction,
            entityType: 'album',
            entityTitle: ent.title,
            entitySlugPath: `/reciters/${ent.reciterSlug}/albums/${ent.slug}`,
            avatarUrl: ent.artworkUrl ?? null,
            submitterName: r.submitterName ?? 'A contributor',
            at: r.createdAt,
          });
        } else if (r.targetType === 'track') {
          const ent = trackMap.get(r.targetId);
          if (!ent) continue;
          items.push({
            id: r.id,
            action: r.submissionAction,
            entityType: 'track',
            entityTitle: ent.title,
            entitySlugPath: `/reciters/${ent.reciterSlug}/albums/${ent.albumSlug}/tracks/${ent.slug}`,
            avatarUrl: ent.artworkUrl ?? null,
            submitterName: r.submitterName ?? 'A contributor',
            at: r.createdAt,
          });
        }
      }

      const lastIncludedSourceRow = rows[items.length - 1];
      const hasMore = rows.length > items.length;
      const nextCursor = hasMore && lastIncludedSourceRow
        ? encodeCursor(lastIncludedSourceRow.createdAt, lastIncludedSourceRow.id)
        : null;

      return { items, nextCursor };
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
