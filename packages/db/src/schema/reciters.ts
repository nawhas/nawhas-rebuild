import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const reciters = pgTable('reciters', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  /** Arabic-script rendering of the reciter's name. */
  arabicName: text('arabic_name'),
  /** ISO-3166-1 alpha-2 code. Free text accepted server-side. */
  country: text('country'),
  /** 4-digit birth year. App-validated 1800 <= year <= current. */
  birthYear: integer('birth_year'),
  /** Short bio. App-enforced 500 char cap. */
  description: text('description'),
  /** Avatar image URL — typically an S3 presigned-upload result. */
  avatarUrl: text('avatar_url'),
  typesenseSyncedAt: timestamp('typesense_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
