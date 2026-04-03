import { relations } from 'drizzle-orm';
import { reciters } from './reciters.js';
import { albums } from './albums.js';
import { tracks } from './tracks.js';
import { lyrics } from './lyrics.js';

export const recitersRelations = relations(reciters, ({ many }) => ({
  albums: many(albums),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  reciter: one(reciters, {
    fields: [albums.reciterId],
    references: [reciters.id],
  }),
  tracks: many(tracks),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  lyrics: many(lyrics),
}));

export const lyricsRelations = relations(lyrics, ({ one }) => ({
  track: one(tracks, {
    fields: [lyrics.trackId],
    references: [tracks.id],
  }),
}));
