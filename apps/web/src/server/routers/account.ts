import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { accounts, users } from '@nawhas/db';
import { TRPCError } from '@trpc/server';
import { verifyPassword } from 'better-auth/crypto';
import { auth } from '@/lib/auth';
import { router, protectedProcedure } from '../trpc/trpc';
import type { NotificationPrefsDTO } from '@nawhas/types';

/**
 * Build a Headers object carrying the current session cookie so Better Auth
 * server-side endpoints can authenticate the caller without an HTTP round-trip.
 */
function sessionHeaders(token: string): Headers {
  return new Headers({ cookie: `better-auth.session_token=${token}` });
}

export const accountRouter = router({
  /**
   * Initiates an email change. Better Auth sends a verification email to the
   * new address; the change only takes effect after the user clicks the link.
   */
  changeEmail: protectedProcedure
    .input(z.object({ newEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Reject if the address is already in use by another account.
      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.newEmail))
        .limit(1);

      if (existing.length > 0 && existing[0]!.id !== ctx.user.id) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'That email address is already associated with another account.',
        });
      }

      await auth.api.changeEmail({
        body: { newEmail: input.newEmail },
        headers: sessionHeaders(ctx.session.token),
      });

      return { success: true as const };
    }),

  /**
   * Changes the authenticated user's password.
   * Better Auth validates `currentPassword` before applying the update.
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await auth.api.changePassword({
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          revokeOtherSessions: false,
        },
        headers: sessionHeaders(ctx.session.token),
      });

      return { success: true as const };
    }),

  /**
   * Permanently deletes the authenticated user's account after verifying their
   * password. FK cascades in the DB handle sessions, accounts, saved tracks,
   * and listening history.
   */
  deleteAccount: protectedProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Look up the credential account row so we can verify the password.
      const [credentialAccount] = await ctx.db
        .select({ password: accounts.password })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, ctx.user.id),
            eq(accounts.providerId, 'credential'),
          ),
        )
        .limit(1);

      if (!credentialAccount?.password) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No password-based account found. Use a social provider to sign in.',
        });
      }

      const passwordValid = await verifyPassword({
        hash: credentialAccount.password,
        password: input.password,
      });

      if (!passwordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect password.',
        });
      }

      // Delete the user — FK cascades clean up sessions, accounts, saved
      // tracks, listening history, and anything else referencing this user.
      await ctx.db.delete(users).where(eq(users.id, ctx.user.id));

      return { success: true as const };
    }),

  /**
   * Returns the user's notification preferences.
   * M4: returns hardcoded defaults — no persistence yet (that's M5).
   */
  getNotificationPrefs: protectedProcedure.query((): NotificationPrefsDTO => ({
    email: {
      newAlbums: false,
      weeklyDigest: false,
    },
  })),

  /**
   * Accepts updated notification preferences and echoes them back.
   * M4: no-op — preferences are stored in M5.
   */
  updateNotificationPrefs: protectedProcedure
    .input(
      z.object({
        email: z.object({
          newAlbums: z.boolean(),
          weeklyDigest: z.boolean(),
        }),
      }),
    )
    .mutation(({ input }): NotificationPrefsDTO => ({
      email: input.email,
    })),
});
