import { z } from 'zod';
import { and, asc, desc, eq, gt, ilike, inArray, lt, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { auditLog, reciters, albums, tracks, submissions, submissionReviews, users } from '@nawhas/db';
import { router, moderatorProcedure } from '../trpc/trpc';
import { sendSubmissionApproved, sendSubmissionFeedback } from '@/lib/email';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import { reciterDataSchema, albumDataSchema, trackDataSchema } from './submission';
import type { AuditLogDTO, PaginatedResult, SubmissionDTO } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// Slugify helper — used when applyApproved must generate a slug from a name/title
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const moderationRouter = router({
  /**
   * Fetch a single submission by ID.
   */
  get: moderatorProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
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
   * Writes a submission_reviews row and updates the submission status.
   * Sends feedback email for rejected / changes_requested outcomes.
   */
  review: moderatorProcedure
    .input(
      z.object({
        submissionId: z.string().uuid(),
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

      // Wrap review record, status update, and audit log in a transaction
      // so no partial writes occur if any step fails.
      const updated = await ctx.db.transaction(async (tx) => {
        await tx.insert(submissionReviews).values({
          submissionId: input.submissionId,
          reviewerUserId: ctx.user.id,
          action: input.action,
          comment: input.comment ?? null,
        });

        const [upd] = await tx
          .update(submissions)
          .set({ status: input.action, updatedAt: new Date() })
          .where(eq(submissions.id, input.submissionId))
          .returning();

        if (!upd) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update submission.' });
        }

        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: `submission.${input.action}`,
          targetType: 'submission',
          targetId: input.submissionId,
          meta: { comment: input.comment ?? null, submissionType: submission.type },
        });

        return upd;
      });

      // Send feedback email for non-approved outcomes — fire-and-forget, outside transaction.
      if (input.action === 'rejected' || input.action === 'changes_requested') {
        const [submitter] = await ctx.db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, submission.submittedByUserId))
          .limit(1);

        if (submitter) {
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
   * For action=create: inserts a new entity.
   * For action=edit: updates the existing entity.
   * Writes an audit log entry and fires an approval email.
   */
  applyApproved: moderatorProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
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

      // Wrap all entity writes and audit log in a transaction so no partial
      // state is committed if any step fails.
      const entityId = await ctx.db.transaction(async (tx) => {
        let eid: string;

        if (submission.type === 'reciter') {
          const data = reciterDataSchema.parse(submission.data);
          const slug = data.slug ?? slugify(data.name);

          if (submission.action === 'create') {
            const [inserted] = await tx
              .insert(reciters)
              .values({ name: data.name, slug })
              .returning({ id: reciters.id });
            if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
            eid = inserted.id;
          } else {
            // edit
            if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
            const [updated] = await tx
              .update(reciters)
              .set({ name: data.name, slug, updatedAt: new Date() })
              .where(eq(reciters.id, submission.targetId))
              .returning({ id: reciters.id });
            if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reciter not found — it may have been deleted.' });
            eid = submission.targetId;
          }
        } else if (submission.type === 'album') {
          const data = albumDataSchema.parse(submission.data);
          const slug = data.slug ?? slugify(data.title);

          if (submission.action === 'create') {
            const [inserted] = await tx
              .insert(albums)
              .values({
                title: data.title,
                slug,
                reciterId: data.reciterId,
                year: data.year ?? null,
                artworkUrl: data.artworkUrl ?? null,
              })
              .returning({ id: albums.id });
            if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
            eid = inserted.id;
          } else {
            if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
            const [updated] = await tx
              .update(albums)
              .set({
                title: data.title,
                slug,
                reciterId: data.reciterId,
                year: data.year ?? null,
                artworkUrl: data.artworkUrl ?? null,
                updatedAt: new Date(),
              })
              .where(eq(albums.id, submission.targetId))
              .returning({ id: albums.id });
            if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Album not found — it may have been deleted.' });
            eid = submission.targetId;
          }
        } else {
          // track
          const data = trackDataSchema.parse(submission.data);
          const slug = data.slug ?? slugify(data.title);

          if (submission.action === 'create') {
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
            eid = inserted.id;
          } else {
            if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
            const [updated] = await tx
              .update(tracks)
              .set({
                title: data.title,
                slug,
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
            eid = submission.targetId;
          }
        }

        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: 'submission.applied',
          targetType: submission.type,
          targetId: eid,
          meta: {
            submissionId: input.submissionId,
            submissionAction: submission.action,
          },
        });

        return eid;
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
