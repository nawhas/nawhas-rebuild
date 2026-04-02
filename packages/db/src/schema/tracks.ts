import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { albums } from './albums.js';

export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    albumId: uuid('album_id')
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    trackNumber: integer('track_number'),
    audioUrl: text('audio_url'),
    // Duration in seconds
    duration: integer('duration'),
    typesenseSyncedAt: timestamp('typesense_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('tracks_album_slug_unique').on(t.albumId, t.slug),
    index('tracks_album_id_idx').on(t.albumId),
  ],
);
