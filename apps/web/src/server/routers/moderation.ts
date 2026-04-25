import { z } from 'zod';
import { and, asc, desc, eq, gt, ilike, inArray, lt, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { auditLog, lyrics, reciters, albums, tracks, submissions, submissionReviews, users } from '@nawhas/db';
import { router, moderatorProcedure } from '../trpc/trpc';
import { sendSubmissionApproved, sendSubmissionFeedback } from '@/lib/email';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import { slugify, findFreeSlug } from '../lib/slug';
import { reciterDataSchema, albumDataSchema, trackDataSchema } from './submission';
import type { AuditLogDTO, PaginatedResult, SubmissionDTO } from '@nawhas/types';
import type { Database } from '@nawhas/db';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DbTx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Returns a collision-safe slug for a reciter name.
 * If `candidate` is already taken, appends -2, -3, … until a free one is found.
 */
async function pickReciterSlug(tx: DbTx, name: string): Promise<string> {
  const candidate = slugify(name);
  const existing = await tx
    .select({ slug: reciters.slug })
    .from(reciters)
    .where(or(eq(reciters.slug, candidate), ilike(reciters.slug, `${candidate}-%`)));
  return findFreeSlug(candidate, existing.map((r) => r.slug));
}

async function pickAlbumSlug(
  tx: DbTx,
  reciterId: string,
  title: string,
): Promise<string> {
  const candidate = slugify(title);
  const existing = await tx
    .select({ slug: albums.slug })
    .from(albums)
    .where(
      and(
        eq(albums.reciterId, reciterId),
        or(eq(albums.slug, candidate), ilike(albums.slug, `${candidate}-%`)),
      ),
    );
  return findFreeSlug(candidate, existing.map((a) => a.slug));
}

async function pickTrackSlug(
  tx: DbTx,
  albumId: string,
  title: string,
): Promise<string> {
  const candidate = slugify(title);
  const existing = await tx
    .select({ slug: tracks.slug })
    .from(tracks)
    .where(
      and(
        eq(tracks.albumId, albumId),
        or(eq(tracks.slug, candidate), ilike(tracks.slug, `${candidate}-%`)),
      ),
    );
  return findFreeSlug(candidate, existing.map((t) => t.slug));
}

// ---------------------------------------------------------------------------
// applyToCanonical helper
// ---------------------------------------------------------------------------

/**
 * Apply a submission's data to the canonical tables inside an existing
 * transaction. Returns the canonical entity id and type. Throws TRPCError on
 * FK / not-found failures so the surrounding transaction rolls back.
 *
 * Used both by `review(approve)` (primary path) and `applyApproved`
 * (ops escape hatch).
 */
async function applyToCanonical(
  tx: DbTx,
  submission: typeof submissions.$inferSelect,
): Promise<{ entityId: string; entityType: 'reciter' | 'album' | 'track' }> {
  if (submission.type === 'reciter') {
    const data = reciterDataSchema.parse(submission.data);
    if (submission.action === 'create') {
      const slug = data.slug ?? (await pickReciterSlug(tx, data.name));
      const [inserted] = await tx
        .insert(reciters)
        .values({
          name: data.name,
          slug,
          arabicName: data.arabicName ?? null,
          country: data.country ?? null,
          birthYear: data.birthYear ?? null,
          description: data.description ?? null,
          avatarUrl: data.avatarUrl ?? null,
        })
        .returning({ id: reciters.id });
      if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return { entityId: inserted.id, entityType: 'reciter' };
    }
    if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
    const [updated] = await tx
      .update(reciters)
      .set({
        name: data.name,
        arabicName: data.arabicName ?? null,
        country: data.country ?? null,
        birthYear: data.birthYear ?? null,
        description: data.description ?? null,
        avatarUrl: data.avatarUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(reciters.id, submission.targetId))
      .returning({ id: reciters.id });
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reciter not found — it may have been deleted.' });
    return { entityId: submission.targetId, entityType: 'reciter' };
  }

  if (submission.type === 'album') {
    const data = albumDataSchema.parse(submission.data);
    if (submission.action === 'create') {
      const slug = data.slug ?? (await pickAlbumSlug(tx, data.reciterId, data.title));
      const [inserted] = await tx
        .insert(albums)
        .values({
          title: data.title,
          slug,
          reciterId: data.reciterId,
          year: data.year ?? null,
          description: data.description ?? null,
          artworkUrl: data.artworkUrl ?? null,
        })
        .returning({ id: albums.id });
      if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return { entityId: inserted.id, entityType: 'album' };
    }
    if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
    const [updated] = await tx
      .update(albums)
      .set({
        title: data.title,
        reciterId: data.reciterId,
        year: data.year ?? null,
        description: data.description ?? null,
        artworkUrl: data.artworkUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(albums.id, submission.targetId))
      .returning({ id: albums.id });
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Album not found — it may have been deleted.' });
    return { entityId: submission.targetId, entityType: 'album' };
  }

  // track
  const data = trackDataSchema.parse(submission.data);
  let trackId: string;
  if (submission.action === 'create') {
    const slug = data.slug ?? (await pickTrackSlug(tx, data.albumId, data.title));
    const [inserted] = await tx
      .insert(tracks)
      .values({
        title: data.title,
        slug,
        albumId: data.albumId,
        trackNumber: data.trackNumber ?? null,
        audioUrl: data.audioUrl ?? null,
        youtubeId: data.youtubeId ?? null,
        duration: data.duration ?? null,
      })
      .returning({ id: tracks.id });
    if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    trackId = inserted.id;
  } else {
    if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
    const [updated] = await tx
      .update(tracks)
      .set({
        title: data.title,
        albumId: data.albumId,
        trackNumber: data.trackNumber ?? null,
        audioUrl: data.audioUrl ?? null,
        youtubeId: data.youtubeId ?? null,
        duration: data.duration ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tracks.id, submission.targetId))
      .returning({ id: tracks.id });
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Track not found — it may have been deleted.' });
    trackId = submission.targetId;
  }

  if (data.lyrics) {
    for (const [language, text] of Object.entries(data.lyrics)) {
      if (text === undefined) continue;
      if (text === '') {
        await tx.delete(lyrics).where(and(eq(lyrics.trackId, trackId), eq(lyrics.language, language)));
      } else {
        await tx
          .insert(lyrics)
          .values({ trackId, language, text })
          .onConflictDoUpdate({
            target: [lyrics.trackId, lyrics.language],
            set: { text, updatedAt: new Date() },
          });
      }
    }
  }
  return { entityId: trackId, entityType: 'track' };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const moderationRouter = router({
  /**
   * Fetch a single submission by ID.
   */
  get: moderatorProcedure
    .input(z.object({ submissionId: z.uuid() }))
    .query(async ({ ctx, input }): Promise<SubmissionDTO> => {
      const [submission] = await ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);

      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }

      return submission as SubmissionDTO;
    }),

  /**
   * Paginated queue of submissions pending moderation review.
   * Returns pending + changes_requested, newest first.
   */
  queue: moderatorProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<SubmissionDTO>> => {
      const limit = input.limit;

      const statusFilter = inArray(submissions.status, ['pending', 'changes_requested']);

      const where = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return and(
              statusFilter,
              or(
                lt(submissions.createdAt, createdAt),
                and(eq(submissions.createdAt, createdAt), gt(submissions.id, id)),
              ),
            );
          })()
        : statusFilter;

      const rows = await ctx.db
        .select()
        .from(submissions)
        .where(where)
        .orderBy(desc(submissions.createdAt), asc(submissions.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items: items as SubmissionDTO[], nextCursor };
    }),

  /**
   * Record a moderation decision (approved / rejected / changes_requested).
   *
   * When action='approved': writes review row + canonical entity + audit
   * (action='submission.applied') + status='applied' atomically in one
   * transaction. The canonical write is delegated to applyToCanonical().
   *
   * When action='rejected' or 'changes_requested': writes review row +
   * status update + audit in a transaction; sends feedback email.
   */
  review: moderatorProcedure
    .input(
      z.object({
        submissionId: z.uuid(),
        action: z.enum(['approved', 'rejected', 'changes_requested']),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<SubmissionDTO> => {
      const [submission] = await ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);

      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }

      if (submission.status !== 'pending' && submission.status !== 'changes_requested') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending or changes_requested submissions can be reviewed.',
        });
      }

      // Status motion:
      //  approved              -> applied   (canonical write happens inside the tx)
      //  rejected              -> rejected
      //  changes_requested     -> changes_requested
      const newStatus = input.action === 'approved' ? 'applied' : input.action;

      const updated = await ctx.db.transaction(async (tx) => {
        await tx.insert(submissionReviews).values({
          submissionId: input.submissionId,
          reviewerUserId: ctx.user.id,
          action: input.action,
          comment: input.comment ?? null,
        });

        let auditTargetType: string = 'submission';
        let auditTargetId: string = input.submissionId;
        let auditAction: string;
        let auditMeta: Record<string, unknown>;

        if (input.action === 'approved') {
          const { entityId, entityType } = await applyToCanonical(tx, submission);
          auditTargetType = entityType;
          auditTargetId = entityId;
          auditAction = 'submission.applied';
          auditMeta = {
            submissionId: input.submissionId,
            submissionAction: submission.action,
            ...(input.comment ? { comment: input.comment } : {}),
          };
        } else {
          auditAction = `submission.${input.action}`;
          auditMeta = { comment: input.comment ?? null, submissionType: submission.type };
        }

        const [upd] = await tx
          .update(submissions)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(submissions.id, input.submissionId))
          .returning();

        if (!upd) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update submission.' });
        }

        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: auditAction,
          targetType: auditTargetType,
          targetId: auditTargetId,
          meta: auditMeta,
        });

        return upd;
      });

      // Email — fire-and-forget, outside transaction.
      const [submitter] = await ctx.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, submission.submittedByUserId))
        .limit(1);

      if (submitter) {
        if (input.action === 'approved') {
          sendSubmissionApproved({
            to: submitter.email,
            submissionId: input.submissionId,
            type: submission.type,
          });
        } else {
          sendSubmissionFeedback({
            to: submitter.email,
            submissionId: input.submissionId,
            action: input.action,
            comment: input.comment ?? null,
          });
        }
      }

      return updated as SubmissionDTO;
    }),

  /**
   * Apply an approved submission to the canonical tables.
   *
   * **Ops escape hatch only.** As of W2, `review(action='approved')`
   * does the canonical write inline in the same transaction; this
   * procedure remains for the rare case where a submission is in
   * `status='approved'` (legacy data, or a manual recovery scenario)
   * and needs to be applied separately. No primary UI surfaces this.
   */
  applyApproved: moderatorProcedure
    .input(z.object({ submissionId: z.uuid() }))
    .mutation(async ({ ctx, input }): Promise<{ success: true; entityId: string }> => {
      const [submission] = await ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);

      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }
      if (submission.status !== 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only approved submissions can be applied.',
        });
      }

      const entityId = await ctx.db.transaction(async (tx) => {
        const { entityId, entityType } = await applyToCanonical(tx, submission);

        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: 'submission.applied',
          targetType: entityType,
          targetId: entityId,
          meta: { submissionId: input.submissionId, submissionAction: submission.action },
        });

        await tx
          .update(submissions)
          .set({ status: 'applied', updatedAt: new Date() })
          .where(eq(submissions.id, input.submissionId));

        return entityId;
      });

      // Fire approval email — fire-and-forget, outside transaction.
      const [submitter] = await ctx.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, submission.submittedByUserId))
        .limit(1);

      if (submitter) {
        sendSubmissionApproved({
          to: submitter.email,
          submissionId: input.submissionId,
          type: submission.type,
        });
      }

      return { success: true, entityId };
    }),

  /**
   * Update internal moderator notes on a submission.
   * Writes an audit log entry per save (length only — note text is not
   * mirrored into the audit `meta` to keep audit jsonb bounded).
   */
  setModeratorNotes: moderatorProcedure
    .input(
      z.object({
        submissionId: z.uuid(),
        notes: z.string().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const [submission] = await ctx.db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);
      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(submissions)
          .set({ moderatorNotes: input.notes, updatedAt: new Date() })
          .where(eq(submissions.id, input.submissionId));
        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: 'submission.notes_updated',
          targetType: 'submission',
          targetId: input.submissionId,
          meta: { length: input.notes.length },
        });
      });

      return { success: true };
    }),

  /**
   * Promote or demote a user's role.
   * Uses the Better Auth admin plugin API for 'user' role changes;
   * sets contributor/moderator roles directly via the DB (admin plugin only
   * supports 'user' | 'admin' roles natively, while we use custom roles).
   * Valid roles: 'user' | 'contributor' | 'moderator'.
   */
  setRole: moderatorProcedure
    .input(
      z.object({
        // Better Auth generates 32-char alphanumeric IDs (not UUIDs), so we
        // accept any non-empty string up to 128 chars. Existence is validated
        // below with a NOT_FOUND guard after the DB lookup.
        userId: z.string().min(1).max(128),
        // Moderators can only grant 'user' or 'contributor' roles.
        // Promoting to 'moderator' requires out-of-band admin action (DB seed or admin-only endpoint).
        role: z.enum(['user', 'contributor']),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const [targetUser] = await ctx.db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
      }

      const oldRole = targetUser.role;

      // Wrap role update and audit log in a transaction so partial writes cannot occur.
      await ctx.db.transaction(async (tx) => {
        // Update role directly — our app uses 'user' | 'contributor' | 'moderator'
        // which extends the Better Auth admin plugin's role model.
        await tx
          .update(users)
          .set({ role: input.role, updatedAt: new Date() })
          .where(eq(users.id, input.userId));

        // Write audit log with both old and new role for full history.
        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: 'role.changed',
          targetType: 'user',
          targetId: input.userId,
          meta: { oldRole, newRole: input.role },
        });
      });

      return { success: true };
    }),

  /**
   * Paginated list of users with their roles.
   * Supports optional search by name or email.
   */
  users: moderatorProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<{ id: string; name: string; email: string; role: string; createdAt: Date }>> => {
      const limit = input.limit;

      const searchFilter = input.search
        ? or(
            ilike(users.name, `%${input.search}%`),
            ilike(users.email, `%${input.search}%`),
          )
        : undefined;

      const cursorFilter = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return and(
              searchFilter,
              or(
                lt(users.createdAt, createdAt),
                and(eq(users.createdAt, createdAt), gt(users.id, id)),
              ),
            );
          })()
        : searchFilter;

      const rows = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(cursorFilter)
        .orderBy(desc(users.createdAt), asc(users.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items, nextCursor };
    }),

  /**
   * Paginated audit log, newest first.
   */
  auditLog: moderatorProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<AuditLogDTO>> => {
      const limit = input.limit;

      const where = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return or(
              lt(auditLog.createdAt, createdAt),
              and(eq(auditLog.createdAt, createdAt), gt(auditLog.id, id)),
            );
          })()
        : undefined;

      const rows = await ctx.db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.createdAt), asc(auditLog.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items: items as AuditLogDTO[], nextCursor };
    }),
});
