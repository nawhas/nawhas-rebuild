import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '@nawhas/db';
import { router, protectedProcedure } from '../trpc/trpc';
import type { UserDTO } from '@nawhas/types';

export const profileRouter = router({
  /**
   * Returns the current authenticated user's profile.
   */
  get: protectedProcedure.query(({ ctx }): UserDTO => {
    const user = ctx.user as typeof ctx.user & { role?: string };
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      image: ctx.user.image ?? null,
      role: user.role ?? 'user',
    };
  }),

  /**
   * Updates the authenticated user's display name.
   */
  updateDisplayName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }): Promise<UserDTO> => {
      const rows = await ctx.db
        .update(users)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id))
        .returning();
      const updated = rows[0];
      if (!updated) {
        throw new Error('User not found');
      }

      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        image: updated.image ?? null,
        role: updated.role,
      };
    }),
});
