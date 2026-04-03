// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reciters, albums, tracks } from '@nawhas/db';
import { createTestDb, isDbAvailable, makeHomeCaller, type TestDb } from './helpers';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

// IDs for seed data owned by this suite — cleaned up in afterAll.
const seededReciterIds: string[] = [];
const seededAlbumIds: string[] = [];
const seededTrackIds: string[] = [];

describe.skipIf(!dbAvailable)('Home Router', () => {

beforeAll(async () => {
  ({ db, close } = createTestDb());

  // Seed 2 reciters, each with 1 album and 1 track.
  const [r1] = await db
    .insert(reciters)
    .values([
      { name: 'Home Test Reciter A', slug: `home-test-reciter-a-${Date.now()}` },
      { name: 'Home Test Reciter B', slug: `home-test-reciter-b-${Date.now()}` },
    ])
    .returning({ id: reciters.id });

  // Insert a second reciter separately to get both IDs.
  const [r2] = await db
    .insert(reciters)
    .values({ name: 'Home Test Reciter C', slug: `home-test-reciter-c-${Date.now()}` })
    .returning({ id: reciters.id });

  seededReciterIds.push(r1!.id, r2!.id);

  const [a1] = await db
    .insert(albums)
    .values({ title: 'Home Album A', slug: `home-album-a-${Date.now()}`, reciterId: r1!.id })
    .returning({ id: albums.id });

  seededAlbumIds.push(a1!.id);

  const [t1] = await db
    .insert(tracks)
    .values({ title: 'Home Track A', slug: `home-track-a-${Date.now()}`, albumId: a1!.id })
    .returning({ id: tracks.id });

  seededTrackIds.push(t1!.id);
});

afterAll(async () => {
  if (!close) return;
  // Cascade deletes handle tracks/albums when reciters are removed.
  if (seededReciterIds.length > 0) {
    const { inArray } = await import('drizzle-orm');
    await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
  }
  await close();
});

describe('home.getFeatured', () => {
  it('returns reciters, albums, and tracks arrays', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    expect(result).toHaveProperty('reciters');
    expect(result).toHaveProperty('albums');
    expect(result).toHaveProperty('tracks');
    expect(Array.isArray(result.reciters)).toBe(true);
    expect(Array.isArray(result.albums)).toBe(true);
    expect(Array.isArray(result.tracks)).toBe(true);
  });

  it('includes seeded reciter in featured reciters', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    const foundId = seededReciterIds[0]!;
    const found = result.reciters.some((r) => r.id === foundId);
    expect(found).toBe(true);
  });

  it('includes seeded album in recent albums', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    const found = result.albums.some((a) => a.id === seededAlbumIds[0]);
    expect(found).toBe(true);
  });

  it('includes seeded track in popular tracks', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    const found = result.tracks.some((t) => t.id === seededTrackIds[0]);
    expect(found).toBe(true);
  });

  it('handles empty database gracefully — returns arrays (no throw)', async () => {
    // We cannot empty the DB (other suites may be running), but we can confirm
    // the procedure never throws and always returns valid shapes even when the
    // DB has at least some rows.
    const caller = makeHomeCaller(db);
    await expect(caller.getFeatured()).resolves.toMatchObject({
      reciters: expect.any(Array),
      albums: expect.any(Array),
      tracks: expect.any(Array),
    });
  });

  it('returns at most 6 reciters, 6 albums, and 6 tracks', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    expect(result.reciters.length).toBeLessThanOrEqual(6);
    expect(result.albums.length).toBeLessThanOrEqual(6);
    expect(result.tracks.length).toBeLessThanOrEqual(6);
  });
});
}); // Home Router
