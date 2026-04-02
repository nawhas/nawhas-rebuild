/**
 * Better Auth account table (OAuth providers, credentials).
 * Column names match what the Better Auth Drizzle adapter expects.
 * See: https://www.better-auth.com/docs/adapters/drizzle
 */
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const accounts = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);
