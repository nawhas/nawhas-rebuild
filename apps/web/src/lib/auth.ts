import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, users, sessions, accounts, verificationTokens } from '@nawhas/db';
import { sendVerificationEmail, sendPasswordResetEmail } from './email';

export const auth = betterAuth({
  secret: process.env['BETTER_AUTH_SECRET'],
  baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verificationTokens,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async (data) => {
      await sendPasswordResetEmail({
        to: data.user.email,
        name: data.user.name,
        resetUrl: data.url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async (data) => {
      // Override callbackURL to land on our verify-email page
      const url = new URL(data.url);
      url.searchParams.set('callbackURL', '/verify-email');
      await sendVerificationEmail({
        to: data.user.email,
        name: data.user.name,
        verificationUrl: url.toString(),
      });
    },
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
