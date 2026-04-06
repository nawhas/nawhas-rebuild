/**
 * Better Auth user table.
 * Column names match what the Better Auth Drizzle adapter expects.
 * See: https://www.better-auth.com/docs/adapters/drizzle
 */
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  /** Application-level role. Values: 'user' | 'moderator' | 'admin'. */
  role: text('role').notNull().default('user'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});
