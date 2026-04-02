/**
 * Better Auth verification table (email verification tokens, password reset, etc.).
 * Column names match what the Better Auth Drizzle adapter expects.
 * See: https://www.better-auth.com/docs/adapters/drizzle
 */
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const verificationTokens = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
});
