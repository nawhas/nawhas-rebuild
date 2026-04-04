import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { tracks } from './tracks.js';

export const userLikedTracks = pgTable(
  'user_liked_tracks',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    likedAt: timestamp('liked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.trackId] }),
    index('user_liked_tracks_user_liked_at_idx').on(t.userId, t.likedAt),
  ],
);
