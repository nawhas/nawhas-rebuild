/**
 * Better Auth session table.
 * Column names match what the Better Auth Drizzle adapter expects.
 * See: https://www.better-auth.com/docs/adapters/drizzle
 */
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const sessions = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expiresAt').notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    /** Better Auth admin plugin: the agent user ID if this session is an impersonation. */
    impersonatedBy: text('impersonatedBy'),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull(),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);
