import { z } from 'zod';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { submissions, reciters, albums, tracks } from '@nawhas/db';
import { router, contributorProcedure, protectedProcedure } from '../trpc/trpc';
import { sendSubmissionReceived } from '@/lib/email';
import { encodeCursor, decodeCursor } from '../lib/cursor';
import type { PaginatedResult, SubmissionDTO } from '@nawhas/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// Per-type submission data schemas (exported for reuse in moderation router)
// ---------------------------------------------------------------------------

export const reciterDataSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
});

export const albumDataSchema = z.object({
  title: z.string().min(1),
  reciterId: z.string().uuid(),
  slug: z.string().min(1).optional(),
  year: z.number().int().optional(),
  artworkUrl: z.string().url().optional(),
});

export const trackDataSchema = z.object({
  title: z.string().min(1),
  albumId: z.string().uuid(),
  slug: z.string().min(1).optional(),
  trackNumber: z.number().int().optional(),
  audioUrl: z.string().url().optional(),
  youtubeId: z.string().optional(),
  duration: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Discriminated union schemas
// ---------------------------------------------------------------------------

const createInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('reciter'),
    action: z.enum(['create', 'edit']),
    targetId: z.string().uuid().optional(),
    data: reciterDataSchema,
  }),
  z.object({
    type: z.literal('album'),
    action: z.enum(['create', 'edit']),
    targetId: z.string().uuid().optional(),
    data: albumDataSchema,
  }),
  z.object({
    type: z.literal('track'),
    action: z.enum(['create', 'edit']),
    targetId: z.string().uuid().optional(),
    data: trackDataSchema,
  }),
]);

const updateInputSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().uuid(), type: z.literal('reciter'), data: reciterDataSchema }),
  z.object({ id: z.string().uuid(), type: z.literal('album'), data: albumDataSchema }),
  z.object({ id: z.string().uuid(), type: z.literal('track'), data: trackDataSchema }),
]);

// ---------------------------------------------------------------------------
// Helper — verify target entity exists for edit submissions
// ---------------------------------------------------------------------------

type DbCtx = Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]['ctx']['db'];

async function verifyTargetExists(
  db: DbCtx,
  type: 'reciter' | 'album' | 'track',
  targetId: string,
): Promise<boolean> {
  if (type === 'reciter') {
    const rows = await db.select({ id: reciters.id }).from(reciters).where(eq(reciters.id, targetId)).limit(1);
    return rows.length > 0;
  }
  if (type === 'album') {
    const rows = await db.select({ id: albums.id }).from(albums).where(eq(albums.id, targetId)).limit(1);
    return rows.length > 0;
  }
  const rows = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, targetId)).limit(1);
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const submissionRouter = router({
  /**
   * Submit a new reciter/album/track or an edit suggestion.
   * Requires contributor or moderator role.
   */
  create: contributorProcedure
    .input(createInputSchema)
    .mutation(async ({ ctx, input }): Promise<SubmissionDTO> => {
      if (input.action === 'edit') {
        if (!input.targetId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'targetId is required for edit submissions.',
          });
        }
        const exists = await verifyTargetExists(ctx.db, input.type, input.targetId);
        if (!exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `No ${input.type} found with id "${input.targetId}".`,
          });
        }
      }

      const [row] = await ctx.db
        .insert(submissions)
        .values({
          type: input.type,
          action: input.action,
          targetId: input.targetId ?? null,
          data: input.data,
          status: 'pending',
          submittedByUserId: ctx.user.id,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create submission.' });
      }

      // Notify the submitter — fire-and-forget.
      sendSubmissionReceived({ to: ctx.user.email, submissionId: row.id, type: input.type });

      return row as SubmissionDTO;
    }),

  /**
   * Edit a draft or changes_requested submission.
   * Only the original submitter can update their own submission.
   * Re-queues the submission as pending after update.
   */
  update: contributorProcedure
    .input(updateInputSchema)
    .mutation(async ({ ctx, input }): Promise<SubmissionDTO> => {
      const [existing] = await ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }
      if (existing.submittedByUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own submissions.' });
      }
      if (existing.status !== 'draft' && existing.status !== 'changes_requested') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft or changes_requested submissions can be edited.',
        });
      }
      if (existing.type !== input.type) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Submission type cannot be changed.' });
      }

      const [updated] = await ctx.db
        .update(submissions)
        .set({ data: input.data, status: 'pending', updatedAt: new Date() })
        .where(eq(submissions.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update submission.' });
      }

      return updated as SubmissionDTO;
    }),

  /**
   * Paginated list of the authenticated user's own submissions, newest first.
   */
  myHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<SubmissionDTO>> => {
      const limit = input.limit;

      const where = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return and(
              eq(submissions.submittedByUserId, ctx.user.id),
              or(
                lt(submissions.createdAt, createdAt),
                and(eq(submissions.createdAt, createdAt), gt(submissions.id, id)),
              ),
            );
          })()
        : eq(submissions.submittedByUserId, ctx.user.id);

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
   * Fetch a single submission by id.
   * The owner can view their own; moderators can view any.
   */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }): Promise<SubmissionDTO> => {
      const [row] = await ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.id))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }

      const role = (ctx.user as { role?: string }).role;
      const isOwner = row.submittedByUserId === ctx.user.id;

      if (role !== 'moderator' && !isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied.' });
      }

      return row as SubmissionDTO;
    }),
});
