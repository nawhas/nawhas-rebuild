// Re-export types from @nawhas/types to verify cross-package refs
export type {} from '@nawhas/types';
import { router, publicProcedure } from './trpc.js';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
});

export type AppRouter = typeof appRouter;
