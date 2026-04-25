/**
 * Better Auth user table.
 * Column names match what the Better Auth Drizzle adapter expects.
 * See: https://www.better-auth.com/docs/adapters/drizzle
 */
import { boolean, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('emailVerified').notNull(),
    image: text('image'),
    /** Application-level role. Values: 'user' | 'contributor' | 'moderator'. */
    role: text('role').notNull().default('user'),
    /** Public URL identity. Nullable at column level (existing rows pre-W3 may not
     *  have it); enforced at signup time by the auth hook + Zod validator. */
    username: text('username'),
    /** Contributor trust tier. W3 ships the column with default 'new';
     *  auto-population criteria are tracked as a roadmap follow-up. */
    trustLevel: text('trust_level')
      .notNull()
      .default('new')
      .$type<'new' | 'regular' | 'trusted' | 'maintainer'>(),
    /** Optional free-text bio shown on the public /contributor/[username] profile. */
    bio: text('bio'),
    /** Better Auth admin plugin: whether the user is banned. */
    banned: boolean('banned').default(false),
    /** Better Auth admin plugin: reason for the ban. */
    banReason: text('banReason'),
    /** Better Auth admin plugin: when the ban expires (null = permanent). */
    banExpires: timestamp('banExpires'),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull(),
  },
  (t) => [
    // Case-insensitive unique. Any future fetch by username must lower() the input.
    uniqueIndex('users_username_idx').on(sql`lower(${t.username})`),
  ],
);
