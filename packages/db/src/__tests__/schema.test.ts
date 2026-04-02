import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

// Smoke test: verify the Drizzle schema barrel exports all tables correctly.
// We test the schema directly rather than the index (which requires DATABASE_URL).
describe('@nawhas/db schema barrel', () => {
  it('imports without throwing', async () => {
    const schema = await import('../schema/index.js');
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('exports all nawhas domain tables', async () => {
    const schema = await import('../schema/index.js');
    expect(schema.reciters).toBeDefined();
    expect(schema.albums).toBeDefined();
    expect(schema.tracks).toBeDefined();
    expect(schema.lyrics).toBeDefined();
  });

  it('exports all Better Auth tables', async () => {
    const schema = await import('../schema/index.js');
    expect(schema.users).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.verificationTokens).toBeDefined();
  });

  it('reciters table has expected columns', async () => {
    const { reciters } = await import('../schema/index.js');
    const cols = Object.keys(reciters);
    expect(cols).toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('slug');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('updatedAt');
  });

  it('tracks table has nullable audioUrl and duration', async () => {
    const { tracks } = await import('../schema/index.js');
    const cols = Object.keys(tracks);
    expect(cols).toContain('audioUrl');
    expect(cols).toContain('duration');
  });

  it('lyrics table uses row-per-language model with language and text columns', async () => {
    const { lyrics } = await import('../schema/index.js');
    const cols = Object.keys(lyrics);
    expect(cols).toContain('trackId');
    expect(cols).toContain('language');
    expect(cols).toContain('text');
    // Old hardcoded language columns must not exist
    expect(cols).not.toContain('arabicText');
    expect(cols).not.toContain('urduText');
    expect(cols).not.toContain('englishText');
    expect(cols).not.toContain('transliteration');
  });
});

describe('@nawhas/db schema column types and NOT NULL', () => {
  it('reciters: id is uuid, name/slug are NOT NULL text', async () => {
    const { reciters } = await import('../schema/index.js');
    const cols = getTableColumns(reciters);
    expect(cols.id.columnType).toBe('PgUUID');
    expect(cols.name.notNull).toBe(true);
    expect(cols.slug.notNull).toBe(true);
    expect(cols.createdAt.notNull).toBe(true);
    expect(cols.updatedAt.notNull).toBe(true);
  });

  it('albums: reciterId is NOT NULL uuid, year/artworkUrl are nullable', async () => {
    const { albums } = await import('../schema/index.js');
    const cols = getTableColumns(albums);
    expect(cols.reciterId.columnType).toBe('PgUUID');
    expect(cols.reciterId.notNull).toBe(true);
    expect(cols.title.notNull).toBe(true);
    expect(cols.slug.notNull).toBe(true);
    expect(cols.year.notNull).toBe(false);
    expect(cols.artworkUrl.notNull).toBe(false);
  });

  it('tracks: albumId is NOT NULL uuid, audioUrl/duration/trackNumber are nullable', async () => {
    const { tracks } = await import('../schema/index.js');
    const cols = getTableColumns(tracks);
    expect(cols.albumId.columnType).toBe('PgUUID');
    expect(cols.albumId.notNull).toBe(true);
    expect(cols.title.notNull).toBe(true);
    expect(cols.slug.notNull).toBe(true);
    expect(cols.audioUrl.notNull).toBe(false);
    expect(cols.duration.notNull).toBe(false);
    expect(cols.trackNumber.notNull).toBe(false);
  });

  it('lyrics: trackId/language/text are NOT NULL', async () => {
    const { lyrics } = await import('../schema/index.js');
    const cols = getTableColumns(lyrics);
    expect(cols.trackId.notNull).toBe(true);
    expect(cols.language.notNull).toBe(true);
    expect(cols.text.notNull).toBe(true);
  });

  it('users: name/email/emailVerified are NOT NULL, image is nullable', async () => {
    const { users } = await import('../schema/index.js');
    const cols = getTableColumns(users);
    expect(cols.name.notNull).toBe(true);
    expect(cols.email.notNull).toBe(true);
    expect(cols.emailVerified.notNull).toBe(true);
    expect(cols.image.notNull).toBe(false);
  });

  it('sessions: userId/token/expiresAt are NOT NULL', async () => {
    const { sessions } = await import('../schema/index.js');
    const cols = getTableColumns(sessions);
    expect(cols.userId.notNull).toBe(true);
    expect(cols.token.notNull).toBe(true);
    expect(cols.expiresAt.notNull).toBe(true);
  });
});

describe('@nawhas/db schema table names', () => {
  it('domain tables use plural snake_case names', async () => {
    const { reciters, albums, tracks, lyrics } = await import('../schema/index.js');
    expect(getTableName(reciters)).toBe('reciters');
    expect(getTableName(albums)).toBe('albums');
    expect(getTableName(tracks)).toBe('tracks');
    expect(getTableName(lyrics)).toBe('lyrics');
  });

  it('Better Auth tables use singular names as expected by the adapter', async () => {
    const { users, sessions, accounts, verificationTokens } = await import('../schema/index.js');
    expect(getTableName(users)).toBe('user');
    expect(getTableName(sessions)).toBe('session');
    expect(getTableName(accounts)).toBe('account');
    expect(getTableName(verificationTokens)).toBe('verification');
  });
});

describe('@nawhas/db schema default values', () => {
  it('all tables have defaultRandom/defaultNow defaults on id and timestamps', async () => {
    const { reciters, albums, tracks, lyrics } = await import('../schema/index.js');
    for (const table of [reciters, albums, tracks, lyrics]) {
      const cols = getTableColumns(table);
      expect(cols.id.hasDefault).toBe(true);
      expect(cols.createdAt.hasDefault).toBe(true);
      expect(cols.updatedAt.hasDefault).toBe(true);
    }
  });
});

describe('@nawhas/db schema foreign key relationships', () => {
  it('albums references reciters via reciterId', async () => {
    const { albums, reciters } = await import('../schema/index.js');
    const { foreignKeys } = getTableConfig(albums);
    expect(foreignKeys).toHaveLength(1);
    const fk = foreignKeys[0]!;
    expect(fk.reference().columns[0]!.name).toBe('reciter_id');
    expect(fk.reference().foreignTable).toBe(reciters);
  });

  it('tracks references albums via albumId', async () => {
    const { tracks, albums } = await import('../schema/index.js');
    const { foreignKeys } = getTableConfig(tracks);
    expect(foreignKeys).toHaveLength(1);
    const fk = foreignKeys[0]!;
    expect(fk.reference().columns[0]!.name).toBe('album_id');
    expect(fk.reference().foreignTable).toBe(albums);
  });

  it('lyrics references tracks via trackId', async () => {
    const { lyrics, tracks } = await import('../schema/index.js');
    const { foreignKeys } = getTableConfig(lyrics);
    expect(foreignKeys).toHaveLength(1);
    const fk = foreignKeys[0]!;
    expect(fk.reference().columns[0]!.name).toBe('track_id');
    expect(fk.reference().foreignTable).toBe(tracks);
  });

  it('sessions references users via userId', async () => {
    const { sessions, users } = await import('../schema/index.js');
    const { foreignKeys } = getTableConfig(sessions);
    expect(foreignKeys).toHaveLength(1);
    const fk = foreignKeys[0]!;
    expect(fk.reference().columns[0]!.name).toBe('userId');
    expect(fk.reference().foreignTable).toBe(users);
  });

  it('accounts references users via userId', async () => {
    const { accounts, users } = await import('../schema/index.js');
    const { foreignKeys } = getTableConfig(accounts);
    expect(foreignKeys).toHaveLength(1);
    const fk = foreignKeys[0]!;
    expect(fk.reference().columns[0]!.name).toBe('userId');
    expect(fk.reference().foreignTable).toBe(users);
  });
});
