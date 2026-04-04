import { relations } from 'drizzle-orm';
import { reciters } from './reciters.js';
import { albums } from './albums.js';
import { tracks } from './tracks.js';
import { lyrics } from './lyrics.js';
import { users } from './users.js';
import { userSavedTracks } from './userSavedTracks.js';
import { userLikedTracks } from './userLikedTracks.js';
import { listeningHistory } from './listeningHistory.js';

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

export const usersRelations = relations(users, ({ many }) => ({
  savedTracks: many(userSavedTracks),
  likedTracks: many(userLikedTracks),
  listeningHistory: many(listeningHistory),
}));

export const userSavedTracksRelations = relations(userSavedTracks, ({ one }) => ({
  user: one(users, { fields: [userSavedTracks.userId], references: [users.id] }),
  track: one(tracks, { fields: [userSavedTracks.trackId], references: [tracks.id] }),
}));

export const userLikedTracksRelations = relations(userLikedTracks, ({ one }) => ({
  user: one(users, { fields: [userLikedTracks.userId], references: [users.id] }),
  track: one(tracks, { fields: [userLikedTracks.trackId], references: [tracks.id] }),
}));

export const listeningHistoryRelations = relations(listeningHistory, ({ one }) => ({
  user: one(users, { fields: [listeningHistory.userId], references: [users.id] }),
  track: one(tracks, { fields: [listeningHistory.trackId], references: [tracks.id] }),
}));
