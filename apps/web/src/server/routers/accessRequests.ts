import { z } from 'zod';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { accessRequests, auditLog, users } from '@nawhas/db';
import { router, protectedProcedure, moderatorProcedure } from '../trpc/trpc';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import { sendAccessRequestApproved, sendAccessRequestRejected } from '@/lib/email';
import type { AccessRequestDTO, AccessRequestQueueItemDTO, PaginatedResult } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const accessRequestsRouter = router({
  /**
   * Submit an application to become a contributor.
   * Caller must be role='user' (the procedure body rejects contributors+).
   * The partial unique index (status='pending') enforces one-pending-per-user;
   * Postgres surfaces collisions as `23505` which we map to TRPC CONFLICT.
   *
   * Note: named `create` rather than `apply` — tRPC v11 reserves `apply`,
   * `call`, and `then` as router-level reserved words.
   */
  create: protectedProcedure
    .input(z.object({ reason: z.string().max(1000).nullable() }))
    .mutation(async ({ ctx, input }): Promise<{ id: string }> => {
      if (ctx.user.role !== 'user') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only non-contributor users may apply.' });
      }

      try {
        const [row] = await ctx.db
          .insert(accessRequests)
          .values({ userId: ctx.user.id, reason: input.reason })
          .returning({ id: accessRequests.id });
        if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        return { id: row.id };
      } catch (err: unknown) {
        // Drizzle wraps postgres errors in DrizzleQueryError; the original
        // postgres error (with `code`) is on `cause`.
        const code =
          err && typeof err === 'object' && 'code' in err
            ? (err as { code?: string }).code
            : err && typeof err === 'object' && 'cause' in err && (err as { cause?: unknown }).cause
              ? ((err as { cause?: { code?: string } }).cause?.code ?? undefined)
              : undefined;
        if (code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You already have a pending application.',
          });
        }
        throw err;
      }
    }),

  /**
   * Cancel one's own pending application. No-ops on already-withdrawn rows
   * (BAD_REQUEST). Writes audit_log so moderators see the trail.
   */
  withdrawMine: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      const [row] = await ctx.db
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.id, input.id))
        .limit(1);
      if (!row || row.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      if (row.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Only pending applications can be withdrawn (current status: ${row.status}).`,
        });
      }
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(accessRequests)
          .set({ status: 'withdrawn', withdrawnAt: new Date(), updatedAt: new Date() })
          .where(eq(accessRequests.id, input.id));
        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: 'access_request.withdrawn',
          targetType: 'user',
          targetId: input.id,
          meta: {},
        });
      });
      return { ok: true };
    }),

  /**
   * Owner-scoped read of the caller's most recent application (any status).
   * Returns null when the caller has never applied. Powers /contribute and
   * /contribute/apply state.
   */
  getMine: protectedProcedure.query(async ({ ctx }): Promise<AccessRequestDTO | null> => {
    const [row] = await ctx.db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.userId, ctx.user.id))
      .orderBy(desc(accessRequests.createdAt))
      .limit(1);
    return (row ?? null) as AccessRequestDTO | null;
  }),

  /**
   * Paginated /mod/access-requests queue.
   * Default filter pending; status='all' returns everything.
   */
  queue: moderatorProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
        status: z
          .enum(['pending', 'approved', 'rejected', 'withdrawn', 'all'])
          .optional()
          .default('pending'),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<AccessRequestQueueItemDTO>> => {
      const limit = input.limit;
      const conditions = [];
      if (input.status !== 'all') conditions.push(eq(accessRequests.status, input.status));
      if (input.cursor) {
        const { createdAt, id } = decodeCursor(input.cursor);
        conditions.push(
          or(
            lt(accessRequests.createdAt, createdAt),
            and(eq(accessRequests.createdAt, createdAt), gt(accessRequests.id, id)),
          )!,
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await ctx.db
        .select({
          id: accessRequests.id,
          userId: accessRequests.userId,
          reason: accessRequests.reason,
          status: accessRequests.status,
          reviewedBy: accessRequests.reviewedBy,
          reviewComment: accessRequests.reviewComment,
          reviewedAt: accessRequests.reviewedAt,
          withdrawnAt: accessRequests.withdrawnAt,
          createdAt: accessRequests.createdAt,
          updatedAt: accessRequests.updatedAt,
          applicantName: users.name,
          applicantEmail: users.email,
          applicantCreatedAt: users.createdAt,
        })
        .from(accessRequests)
        .innerJoin(users, eq(users.id, accessRequests.userId))
        .where(where)
        .orderBy(desc(accessRequests.createdAt), asc(accessRequests.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = (hasMore ? rows.slice(0, limit) : rows) as AccessRequestQueueItemDTO[];
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;
      return { items, nextCursor };
    }),

  /**
   * Approve or reject an application.
   * Approve: flips access_requests.status='approved', updates users.role='contributor',
   * writes audit_log, sends approval email. All in one transaction.
   * Reject: flips status='rejected', writes audit_log, sends rejection email.
   * Comment is required for rejection (UX is poor without it).
   */
  review: moderatorProcedure
    .input(
      z.object({
        id: z.uuid(),
        action: z.enum(['approved', 'rejected']),
        comment: z.string().max(2000).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      if (input.action === 'rejected' && !input.comment?.trim()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A comment is required when rejecting an application.',
        });
      }

      const result = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(accessRequests)
          .where(eq(accessRequests.id, input.id))
          .limit(1);
        if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
        if (row.status !== 'pending') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Only pending applications can be reviewed (current status: ${row.status}).`,
          });
        }

        await tx
          .update(accessRequests)
          .set({
            status: input.action,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            reviewComment: input.comment,
            updatedAt: new Date(),
          })
          .where(eq(accessRequests.id, input.id));

        if (input.action === 'approved') {
          await tx
            .update(users)
            .set({ role: 'contributor', updatedAt: new Date() })
            .where(eq(users.id, row.userId));
        }

        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action:
            input.action === 'approved'
              ? 'access_request.approved'
              : 'access_request.rejected',
          targetType: 'user',
          targetId: input.id,
          meta: { applicantUserId: row.userId, comment: input.comment },
        });

        // Read the applicant's email + name for the post-tx email send.
        const [applicant] = await tx
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, row.userId));
        return { applicant };
      });

      // Fire-and-forget post-commit email.
      if (result.applicant) {
        if (input.action === 'approved') {
          sendAccessRequestApproved({
            to: result.applicant.email,
            name: result.applicant.name,
          });
        } else {
          sendAccessRequestRejected({
            to: result.applicant.email,
            name: result.applicant.name,
            comment: input.comment,
          });
        }
      }
      return { ok: true };
    }),
});
