import { router, publicProcedure, protectedProcedure } from '../trpc/trpc';
import type { SessionDTO, UserDTO } from '@nawhas/types';

export const authRouter = router({
  /**
   * Returns the current session's user, or null if unauthenticated.
   * Safe to call from any page or component without crashing.
   */
  session: publicProcedure.query(({ ctx }): SessionDTO | null => {
    if (!ctx.user || !ctx.session) return null;
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        image: ctx.user.image ?? null,
        role: ctx.user.role ?? 'user',
      },
      expiresAt: ctx.session.expiresAt,
    };
  }),

  /**
   * Returns the authenticated user. Throws UNAUTHORIZED if not logged in.
   */
  me: protectedProcedure.query(({ ctx }): UserDTO => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      image: ctx.user.image ?? null,
      role: ctx.user.role ?? 'user',
    };
  }),
});
