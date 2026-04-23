// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { albums, reciters, users } from '@nawhas/db';
import { createTestDb, isDbAvailable, makeContributeCaller, type TestDb } from './helpers';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();
const userId = `contrib-search-${SUFFIX}`;
const reciterIds: string[] = [];
const albumIds: string[] = [];

describe.skipIf(!dbAvailable)('Contribute Router', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    await db.insert(users).values({
      id: userId,
      name: 'Search User',
      email: `search-${SUFFIX}@example.com`,
      emailVerified: true,
      role: 'contributor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const recRows = await db.insert(reciters).values([
      { name: 'Ali Search Alpha', slug: `ali-search-alpha-${SUFFIX}` },
      { name: 'Ali Search Beta', slug: `ali-search-beta-${SUFFIX}` },
      { name: 'Unrelated Reciter', slug: `unrelated-${SUFFIX}` },
    ]).returning({ id: reciters.id });
    reciterIds.push(...recRows.map((r) => r.id));

    const albumRows = await db.insert(albums).values([
      { title: 'Album One', slug: `album-one-${SUFFIX}`, reciterId: reciterIds[0]! },
      { title: 'Album Two', slug: `album-two-${SUFFIX}`, reciterId: reciterIds[0]! },
      { title: 'Other Reciter Album', slug: `other-album-${SUFFIX}`, reciterId: reciterIds[2]! },
    ]).returning({ id: albums.id });
    albumIds.push(...albumRows.map((a) => a.id));
  });

  afterAll(async () => {
    if (!close) return;
    if (albumIds.length) await db.delete(albums).where(inArray(albums.id, albumIds));
    if (reciterIds.length) await db.delete(reciters).where(inArray(reciters.id, reciterIds));
    await db.delete(users).where(inArray(users.id, [userId]));
    await close();
  });

  describe('searchReciters', () => {
    it('returns matches by substring', async () => {
      const caller = makeContributeCaller(db, userId);
      const results = await caller.searchReciters({ query: 'Ali Search' });
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((r) => r.name.includes('Ali Search'))).toBe(true);
    });

    it('returns empty on non-match', async () => {
      const caller = makeContributeCaller(db, userId);
      const results = await caller.searchReciters({ query: 'zzzz-nomatch' });
      expect(results).toEqual([]);
    });

    it('rejects empty query', async () => {
      const caller = makeContributeCaller(db, userId);
      await expect(caller.searchReciters({ query: '' })).rejects.toThrow();
    });
  });

  describe('searchAlbums', () => {
    it('returns albums joined with reciter name', async () => {
      const caller = makeContributeCaller(db, userId);
      const results = await caller.searchAlbums({ query: 'Album' });
      expect(results.length).toBeGreaterThanOrEqual(3);
      const firstAlbum = results.find((a) => a.title === 'Album One');
      expect(firstAlbum?.reciterName).toBe('Ali Search Alpha');
    });
  });

  it('rejects calls from non-contributor role', async () => {
    const caller = makeContributeCaller(db, userId, 'user');
    await expect(caller.searchReciters({ query: 'Ali' })).rejects.toThrow(/FORBIDDEN/);
  });
});
