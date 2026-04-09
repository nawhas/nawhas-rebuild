import { initTRPC, TRPCError } from '@trpc/server';
import { redactForLog } from '@/lib/logger/redact';
import { serverLogger } from '@/lib/logger/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

const loggingMiddleware = t.middleware(async ({ path, type, ctx, input, next }) => {
  const start = Date.now();
  try {
    const result = await next();
    const durationMs = Date.now() - start;
    await serverLogger.debug('trpc.procedure_ok', {
      path,
      type,
      durationMs,
      userId: ctx.user?.id,
      requestId: ctx.requestId,
    });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    await serverLogger.error('trpc.procedure_failed', err, {
      path,
      type,
      durationMs,
      userId: ctx.user?.id,
      requestId: ctx.requestId,
      input: redactForLog(input),
    });
    throw err;
  }
});

const baseProcedure = t.procedure.use(loggingMiddleware);

export const router = t.router;
export const publicProcedure = baseProcedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Protected procedure — rejects unauthenticated requests with UNAUTHORIZED.
 * Use this for any procedure that requires a valid session.
 */
export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Contributor procedure — requires an authenticated session with role
 * 'contributor' or 'moderator'. Rejects all others with FORBIDDEN.
 */
export const contributorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const { role } = ctx.user;
  if (role !== 'contributor' && role !== 'moderator') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

/**
 * Moderator procedure — requires an authenticated session with role
 * 'moderator'. Rejects all others with FORBIDDEN.
 */
export const moderatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const { role } = ctx.user;
  if (role !== 'moderator') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
