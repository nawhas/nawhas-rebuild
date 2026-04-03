// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { reciters, albums, tracks, lyrics } from '@nawhas/db';
import { createTestDb, makeTrackCaller, type TestDb } from './helpers';

let db: TestDb;
let close: () => Promise<void>;

const seededReciterIds: string[] = [];

const SUFFIX = Date.now();

const RECITER_SLUG = `track-test-reciter-${SUFFIX}`;
const ALBUM_SLUG = `track-test-album-${SUFFIX}`;
const TRACK_SLUG = `track-test-track-${SUFFIX}`;
// Second track without lyrics to test the no-lyrics path.
const TRACK_NO_LYRICS_SLUG = `track-test-no-lyrics-${SUFFIX}`;

beforeAll(async () => {
  ({ db, close } = createTestDb());

  const [r] = await db
    .insert(reciters)
    .values({ name: 'Track Test Reciter', slug: RECITER_SLUG })
    .returning({ id: reciters.id });

  seededReciterIds.push(r!.id);

  const [a] = await db
    .insert(albums)
    .values({ title: 'Track Test Album', slug: ALBUM_SLUG, reciterId: r!.id })
    .returning({ id: albums.id });

  const [t1] = await db
    .insert(tracks)
    .values([
      { title: 'Track With Lyrics', slug: TRACK_SLUG, albumId: a!.id, trackNumber: 1 },
      { title: 'Track Without Lyrics', slug: TRACK_NO_LYRICS_SLUG, albumId: a!.id, trackNumber: 2 },
    ])
    .returning({ id: tracks.id });

  // Seed lyrics in three languages for the first track.
  await db.insert(lyrics).values([
    { trackId: t1!.id, language: 'ar', text: 'نص عربي' },
    { trackId: t1!.id, language: 'ur', text: 'اردو متن' },
    { trackId: t1!.id, language: 'en', text: 'English text' },
  ]);
});

afterAll(async () => {
  if (seededReciterIds.length > 0) {
    await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
  }
  await close();
});

describe('track.getBySlug', () => {
  it('returns the track with album and reciter context', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
      trackSlug: TRACK_SLUG,
    });

    expect(result).not.toBeNull();
    expect(result!.slug).toBe(TRACK_SLUG);
    expect(result!.title).toBe('Track With Lyrics');
    expect(result!.album).toBeDefined();
    expect(result!.album.slug).toBe(ALBUM_SLUG);
    expect(result!.reciter).toBeDefined();
    expect(result!.reciter.slug).toBe(RECITER_SLUG);
  });

  it('returns all seeded lyrics variants for the track', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
      trackSlug: TRACK_SLUG,
    });

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.lyrics)).toBe(true);
    expect(result!.lyrics.length).toBe(3);

    const languages = result!.lyrics.map((l) => l.language).sort();
    expect(languages).toEqual(['ar', 'en', 'ur']);
  });

  it('returns lyrics ordered by language (ASC)', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
      trackSlug: TRACK_SLUG,
    });

    expect(result).not.toBeNull();
    const languages = result!.lyrics.map((l) => l.language);
    const sorted = [...languages].sort();
    expect(languages).toEqual(sorted);
  });

  it('returns an empty lyrics array when a track has no lyrics', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
      trackSlug: TRACK_NO_LYRICS_SLUG,
    });

    expect(result).not.toBeNull();
    expect(result!.lyrics).toHaveLength(0);
  });

  it('returns null for a non-existent track slug', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
      trackSlug: 'track-slug-that-does-not-exist-xyz-99999',
    });

    expect(result).toBeNull();
  });

  it('returns null when the album slug does not exist', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: 'album-slug-that-does-not-exist-xyz-99999',
      trackSlug: TRACK_SLUG,
    });

    expect(result).toBeNull();
  });

  it('returns null when the reciter slug does not exist', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: 'reciter-slug-that-does-not-exist-xyz-99999',
      albumSlug: ALBUM_SLUG,
      trackSlug: TRACK_SLUG,
    });

    expect(result).toBeNull();
  });
});

describe('track.listByAlbum', () => {
  it('returns all tracks for the given album', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.listByAlbum({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    const slugs = result.map((t) => t.slug).sort();
    expect(slugs).toContain(TRACK_SLUG);
    expect(slugs).toContain(TRACK_NO_LYRICS_SLUG);
  });

  it('returns tracks ordered by trackNumber ASC', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.listByAlbum({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
    });

    const numbers = result
      .map((t) => t.trackNumber)
      .filter((n): n is number => n !== null);

    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]!).toBeGreaterThanOrEqual(numbers[i - 1]!);
    }
  });

  it('returns empty array for a non-existent reciter slug', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.listByAlbum({
      reciterSlug: 'reciter-slug-that-does-not-exist-xyz-99999',
      albumSlug: ALBUM_SLUG,
    });

    expect(result).toHaveLength(0);
  });

  it('returns empty array for a non-existent album slug', async () => {
    const caller = makeTrackCaller(db);
    const result = await caller.listByAlbum({
      reciterSlug: RECITER_SLUG,
      albumSlug: 'album-slug-that-does-not-exist-xyz-99999',
    });

    expect(result).toHaveLength(0);
  });
});
