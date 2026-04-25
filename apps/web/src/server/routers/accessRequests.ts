import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { accessRequests } from '@nawhas/db';
import { router, protectedProcedure } from '../trpc/trpc';

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
});
