import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { reciters } from './reciters.js';

export const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    reciterId: uuid('reciter_id')
      .notNull()
      .references(() => reciters.id, { onDelete: 'cascade' }),
    year: integer('year'),
    artworkUrl: text('artwork_url'),
    typesenseSyncedAt: timestamp('typesense_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('albums_reciter_slug_unique').on(t.reciterId, t.slug),
    index('albums_reciter_id_idx').on(t.reciterId),
  ],
);
