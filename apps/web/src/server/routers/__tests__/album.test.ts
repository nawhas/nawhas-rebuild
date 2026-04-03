// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { reciters, albums, tracks } from '@nawhas/db';
import { createTestDb, isDbAvailable, makeAlbumCaller, type TestDb } from './helpers';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const seededReciterIds: string[] = [];

const SUFFIX = Date.now();

// Slugs used for lookup assertions.
const RECITER_SLUG = `album-test-reciter-${SUFFIX}`;
const ALBUM_SLUG = `album-test-album-${SUFFIX}`;

describe.skipIf(!dbAvailable)('Album Router', () => {

beforeAll(async () => {
  ({ db, close } = createTestDb());

  const [r] = await db
    .insert(reciters)
    .values({ name: 'Album Test Reciter', slug: RECITER_SLUG })
    .returning({ id: reciters.id });

  seededReciterIds.push(r!.id);

  const [a] = await db
    .insert(albums)
    .values({
      title: 'Album Test Album',
      slug: ALBUM_SLUG,
      reciterId: r!.id,
      year: 2021,
    })
    .returning({ id: albums.id });

  // Seed 3 tracks for the album to verify track inclusion.
  await db.insert(tracks).values([
    { title: 'Track One', slug: `track-one-${SUFFIX}`, albumId: a!.id, trackNumber: 1 },
    { title: 'Track Two', slug: `track-two-${SUFFIX}`, albumId: a!.id, trackNumber: 2 },
    { title: 'Track Three', slug: `track-three-${SUFFIX}`, albumId: a!.id, trackNumber: 3 },
  ]);
});

afterAll(async () => {
  if (!close) return;
  if (seededReciterIds.length > 0) {
    await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
  }
  await close();
});

describe('album.getBySlug', () => {
  it('returns the album with tracks when reciter and album slugs match', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
    });

    expect(result).not.toBeNull();
    expect(result!.slug).toBe(ALBUM_SLUG);
    expect(result!.title).toBe('Album Test Album');
    expect(result!.reciterId).toBeDefined();
    expect(Array.isArray(result!.tracks)).toBe(true);
    expect(result!.tracks.length).toBe(3);
  });

  it('returns tracks ordered by track number ASC', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: ALBUM_SLUG,
    });

    expect(result).not.toBeNull();
    const numbers = result!.tracks
      .map((t) => t.trackNumber)
      .filter((n): n is number => n !== null);

    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]!).toBeGreaterThanOrEqual(numbers[i - 1]!);
    }
  });

  it('returns null for a non-existent album slug', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: RECITER_SLUG,
      albumSlug: 'slug-that-does-not-exist-xyz-99999',
    });

    expect(result).toBeNull();
  });

  it('returns null when the reciter slug does not exist', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.getBySlug({
      reciterSlug: 'reciter-slug-that-does-not-exist-xyz-99999',
      albumSlug: ALBUM_SLUG,
    });

    expect(result).toBeNull();
  });
});

describe('album.list', () => {
  it('returns paginated result including the seeded album', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.list({ limit: 100 });

    expect(Array.isArray(result.items)).toBe(true);
    const found = result.items.some((a) => a.slug === ALBUM_SLUG);
    expect(found).toBe(true);
  });

  it('includes reciterName and reciterSlug fields in list items', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.list({ limit: 100 });

    const item = result.items.find((a) => a.slug === ALBUM_SLUG);
    expect(item).toBeDefined();
    expect(item!.reciterName).toBe('Album Test Reciter');
    expect(item!.reciterSlug).toBe(RECITER_SLUG);
  });

  it('includes trackCount in list items', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.list({ limit: 100 });

    const item = result.items.find((a) => a.slug === ALBUM_SLUG);
    expect(item).toBeDefined();
    expect(item!.trackCount).toBe(3);
  });
});

describe('album.listByReciter', () => {
  it('returns albums for the given reciter slug', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.listByReciter({ reciterSlug: RECITER_SLUG, limit: 20 });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0]!.slug).toBe(ALBUM_SLUG);
  });

  it('returns empty items for a non-existent reciter slug', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.listByReciter({
      reciterSlug: 'reciter-slug-that-does-not-exist-xyz-99999',
    });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});
}); // Album Router
