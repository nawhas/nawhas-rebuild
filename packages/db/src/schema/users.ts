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
  /** Application-level role. Values: 'user' | 'contributor' | 'moderator'. */
  role: text('role').notNull().default('user'),
  /** Better Auth admin plugin: whether the user is banned. */
  banned: boolean('banned').default(false),
  /** Better Auth admin plugin: reason for the ban. */
  banReason: text('banReason'),
  /** Better Auth admin plugin: when the ban expires (null = permanent). */
  banExpires: timestamp('banExpires'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});
