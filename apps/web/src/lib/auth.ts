import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins/admin';
import { role } from 'better-auth/plugins/access';
import type { SocialProviders } from 'better-auth/social-providers';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, users, sessions, accounts, verificationTokens } from '@nawhas/db';
import { sendVerificationEmail, sendPasswordResetEmail } from './email';

// usernameSchema lives in its own module (./username) so client components
// (e.g. <RegisterForm>) can import it without dragging server-only deps
// (nodemailer, postgres) into the browser bundle. Re-export the symbol here
// so existing imports of `@/lib/auth` keep working.
export { usernameSchema } from './username';

/**
 * Build the socialProviders config from env vars.
 * Each provider is only included when its feature flag is set to 'true'.
 * Apple uses APPLE_PRIVATE_KEY (.p8 content) as the client secret —
 * Better Auth handles JWT client-secret generation internally.
 */
function buildSocialProviders(): SocialProviders {
  const providers: SocialProviders = {};

  if (process.env['GOOGLE_OAUTH_ENABLED'] === 'true') {
    providers.google = {
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    };
  }

  if (process.env['APPLE_OAUTH_ENABLED'] === 'true') {
    providers.apple = {
      clientId: process.env['APPLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['APPLE_PRIVATE_KEY'] ?? '',
    };
  }

  if (process.env['FACEBOOK_OAUTH_ENABLED'] === 'true') {
    providers.facebook = {
      clientId: process.env['FACEBOOK_CLIENT_ID'] ?? '',
      clientSecret: process.env['FACEBOOK_CLIENT_SECRET'] ?? '',
    };
  }

  if (process.env['MICROSOFT_OAUTH_ENABLED'] === 'true') {
    providers.microsoft = {
      clientId: process.env['MICROSOFT_CLIENT_ID'] ?? '',
      clientSecret: process.env['MICROSOFT_CLIENT_SECRET'] ?? '',
    };
  }

  return providers;
}

export const auth = betterAuth({
  secret: process.env['BETTER_AUTH_SECRET'],
  baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
  trustedOrigins: process.env['BETTER_AUTH_TRUSTED_ORIGINS']
    ? process.env['BETTER_AUTH_TRUSTED_ORIGINS'].split(',')
    : [],
  // Playwright E2E registers hundreds of users; production rate limits cause 429 cascades.
  ...(process.env['E2E_DISABLE_AUTH_RATE_LIMIT'] === 'true' ? { rateLimit: { enabled: false } } : {}),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verificationTokens,
    },
  }),
  user: {
    additionalFields: {
      // Public handle the contributor displays under, e.g. /contributor/<username>.
      // Required at signup; the schema-level unique index catches collisions.
      username: {
        type: 'string',
        required: true,
        input: true,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: 'user',
      // Treat 'moderator' as the admin-privileged role.
      adminRoles: ['moderator'],
      // Declare all custom roles so the admin plugin validates them correctly.
      roles: {
        contributor: role({}),
        moderator: role({}),
      },
    }),
  ],
  socialProviders: buildSocialProviders(),
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
