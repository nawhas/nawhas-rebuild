export type {} from '@nawhas/types';
import { router, publicProcedure } from './trpc';
import { reciterRouter } from '../routers/reciter';
import { albumRouter } from '../routers/album';
import { trackRouter } from '../routers/track';
import { homeRouter } from '../routers/home';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  reciter: reciterRouter,
  album: albumRouter,
  track: trackRouter,
  home: homeRouter,
});

export type AppRouter = typeof appRouter;
