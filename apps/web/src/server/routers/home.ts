import { z } from 'zod';
import { and, asc, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { albums, auditLog, reciters, submissions, tracks, userSavedTracks, users } from '@nawhas/db';
import { router, protectedProcedure, publicProcedure } from '../trpc/trpc';
import type { ContributorHeatmapBucketDTO, ContributorProfileDTO, FeaturedDTO, PaginatedResult, RecentChangeDTO, ReciterFeaturedDTO, TrackListItemDTO } from '@nawhas/types';
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
  albumYear: albums.year,
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
      // Aggregated reciter list — joins albums + tracks to surface counts
      // for the home-page "Top Reciters" cards in a single query.
      ctx.db
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
        .groupBy(reciters.id)
        .orderBy(desc(reciters.createdAt))
        .limit(FEATURED_RECITERS_LIMIT),

      ctx.db
        .select()
        .from(albums)
        .orderBy(desc(albums.createdAt))
        .limit(RECENT_ALBUMS_LIMIT),

      ctx.db
        .select(trackListItemColumns)
        .from(tracks)
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .innerJoin(reciters, eq(albums.reciterId, reciters.id))
        .orderBy(desc(tracks.createdAt))
        .limit(POPULAR_TRACKS_LIMIT),
    ]);

    return {
      reciters: featuredReciters as ReciterFeaturedDTO[],
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
      let processedCount = 0;

      for (const r of rows) {
        if (items.length >= limit) break;
        processedCount++;
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

      const lastProcessed = processedCount > 0 ? rows[processedCount - 1] : null;
      const hasMore = rows.length > processedCount;
      const nextCursor = hasMore && lastProcessed
        ? encodeCursor(lastProcessed.createdAt, lastProcessed.id)
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

  /**
   * Public contributor profile lookup by username (case-insensitive).
   * Returns null on unknown username (route renders 404).
   * Stats: total / approved (status=applied) / pending (pending+changes_requested) /
   * approvalRate = approved / (total - withdrawn).
   */
  contributorProfile: publicProcedure
    .input(z.object({ username: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }): Promise<ContributorProfileDTO | null> => {
      const [user] = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          bio: users.bio,
          trustLevel: users.trustLevel,
        })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${input.username})`)
        .limit(1);
      if (!user || !user.username) return null;

      const [agg] = await ctx.db
        .select({
          total: sql<number>`count(*)::int`,
          approved: sql<number>`count(*) filter (where status = 'applied')::int`,
          pending: sql<number>`count(*) filter (where status in ('pending', 'changes_requested'))::int`,
          withdrawn: sql<number>`count(*) filter (where status = 'withdrawn')::int`,
        })
        .from(submissions)
        .where(eq(submissions.submittedByUserId, user.id));

      const total = Number(agg?.total ?? 0);
      const approved = Number(agg?.approved ?? 0);
      const pending = Number(agg?.pending ?? 0);
      const withdrawn = Number(agg?.withdrawn ?? 0);
      const denom = total - withdrawn;
      const approvalRate = denom > 0 ? approved / denom : 0;

      const initials = user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');

      return {
        userId: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        trustLevel: user.trustLevel as ContributorProfileDTO['trustLevel'],
        avatarInitials: initials || '·',
        stats: { total, approved, pending, approvalRate },
      };
    }),

  /**
   * Public contributor activity heatmap. Returns dense buckets — only days
   * with count > 0 — so transmitting 365 zeros is avoided. UI fills the grid
   * client-side from the year start.
   */
  contributorHeatmap: publicProcedure
    .input(
      z.object({
        username: z.string().min(1).max(64),
        year: z.number().int().min(2020).max(2100).optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<ContributorHeatmapBucketDTO[]> => {
      const [user] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${input.username})`)
        .limit(1);
      if (!user) return [];

      const year = input.year ?? new Date().getUTCFullYear();
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

      const buckets = await ctx.db.execute<{ d: string; n: number }>(sql`
        SELECT to_char(${submissions.createdAt} at time zone 'UTC', 'YYYY-MM-DD') AS d,
               COUNT(*)::int AS n
        FROM ${submissions}
        WHERE ${submissions.submittedByUserId} = ${user.id}
          AND ${submissions.createdAt} >= ${yearStart.toISOString()}
          AND ${submissions.createdAt} < ${yearEnd.toISOString()}
        GROUP BY d
        ORDER BY d ASC
      `);
      const rows = Array.isArray(buckets) ? buckets : (buckets as { rows?: { d: string; n: number }[] }).rows ?? [];
      return rows.map((r) => ({ date: String(r.d), count: Number(r.n) }));
    }),
});
