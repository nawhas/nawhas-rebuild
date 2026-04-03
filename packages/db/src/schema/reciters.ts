import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const reciters = pgTable('reciters', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  typesenseSyncedAt: timestamp('typesense_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
