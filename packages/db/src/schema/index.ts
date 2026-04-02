// Drizzle ORM schema barrel — all tables and enums exported from here.
//
// Timestamp convention:
// - Domain tables (reciters, albums, tracks, lyrics) use snake_case column names
//   with `{ withTimezone: true }` — e.g. `created_at`, `updated_at`.
// - Better Auth tables (users, sessions, accounts, verificationTokens) use camelCase
//   column names without timezone — e.g. `createdAt`, `updatedAt`. This matches
//   the exact column names the Better Auth Drizzle adapter expects and must not
//   be changed.
export * from './reciters.js';
export * from './albums.js';
export * from './tracks.js';
export * from './lyrics.js';
export * from './users.js';
export * from './sessions.js';
export * from './accounts.js';
export * from './verificationTokens.js';
