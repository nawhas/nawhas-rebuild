export type {} from '@nawhas/types';
import { router, publicProcedure } from './trpc';
import { reciterRouter } from '../routers/reciter';
import { albumRouter } from '../routers/album';
import { trackRouter } from '../routers/track';
import { homeRouter } from '../routers/home';
import { authRouter } from '../routers/auth';
import { searchRouter } from '../routers/search';
import { libraryRouter } from '../routers/library';
import { likesRouter } from '../routers/likes';
import { historyRouter } from '../routers/history';
import { profileRouter } from '../routers/profile';
import { accountRouter } from '../routers/account';
import { submissionRouter } from '../routers/submission';
import { moderationRouter } from '../routers/moderation';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  auth: authRouter,
  reciter: reciterRouter,
  album: albumRouter,
  track: trackRouter,
  home: homeRouter,
  search: searchRouter,
  library: libraryRouter,
  likes: likesRouter,
  history: historyRouter,
  profile: profileRouter,
  account: accountRouter,
  submission: submissionRouter,
  moderation: moderationRouter,
});

export type AppRouter = typeof appRouter;
