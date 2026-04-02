import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { tracks } from './tracks.js';

/**
 * Row-per-language lyrics table.
 *
 * Each row holds the lyrics text for one language variant of a track.
 * The `language` column uses ISO 639-1 codes ('ar', 'ur', 'en', 'fr', etc.)
 * plus the convention 'transliteration' for romanised/Latin-script versions.
 * Adding new languages never requires a schema migration.
 *
 * UNIQUE(trackId, language) ensures one row per language per track.
 */
export const lyrics = pgTable(
  'lyrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    // ISO 639-1 code ('ar', 'ur', 'en', 'fr', …) or 'transliteration'
    language: text('language').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('lyrics_track_language_unique').on(t.trackId, t.language),
    index('lyrics_track_id_idx').on(t.trackId),
  ],
);
