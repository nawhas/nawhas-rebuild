import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tracks } from './tracks.js';

// Primary script language for search indexing
export const languageEnum = pgEnum('language', ['arabic', 'urdu', 'english']);

export const lyrics = pgTable('lyrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: uuid('track_id')
    .notNull()
    .references(() => tracks.id, { onDelete: 'cascade' }),
  // At least one of these should be non-null for a row to be considered populated
  arabicText: text('arabic_text'),
  urduText: text('urdu_text'),
  englishText: text('english_text'),
  transliteration: text('transliteration'),
  // Primary script for search indexing
  language: languageEnum('language').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
