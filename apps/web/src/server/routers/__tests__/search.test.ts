// @vitest-environment node
/**
 * Router-level integration tests for the search router.
 *
 * Unlike apps/web/src/__tests__/search.test.ts (which mocks the Typesense
 * client), this suite hits a real Typesense server via the real tRPC caller.
 * It seeds Postgres + Typesense, queries through the router, and asserts on
 * real behaviour. This is the regression net for the Typesense 2→3 / 26→28
 * upgrade: any protocol or ranking change will surface here.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reciters, albums, tracks, lyrics } from '@nawhas/db';
import { syncReciter, syncAlbum, syncTrack, deleteDocument } from '@/lib/typesense/sync';
import { typesenseClient } from '@/lib/typesense/client';
import { COLLECTIONS, ensureCollections } from '@/lib/typesense/collections';
import {
  createTestDb,
  isDbAvailable,
  isTypesenseAvailable,
  makeSearchCaller,
  type TestDb,
} from './helpers';

const dbAvailable = await isDbAvailable();
const typesenseAvailable = await isTypesenseAvailable();
const shouldRun = dbAvailable && typesenseAvailable;

let db: TestDb;
let close: () => Promise<void>;

// Unique suffix so parallel suites/re-runs do not collide.
const suffix = Date.now().toString();

// IDs / slugs for seed data owned by this suite — cleaned up in afterAll.
const seededReciterIds: string[] = [];
const seededAlbumIds: string[] = [];
const seededTrackIds: string[] = [];

// Distinctive token used in our seeded names/titles so queries are unlikely
// to collide with any other rows already present in the DB/index.
const TOKEN = `zqtok${suffix}`;

// Bounded poll against Typesense so we don't rely on a fixed sleep for
// indexing latency. Queries by `title` (always materialised, unlike the
// `lyrics_*` wildcard fields) and caps at ~5s. If the cap is hit, throw
// with an explicit message so a regression in indexing latency is obvious
// rather than masquerading as a ranking bug.
async function waitForTracksIndexed(expected: number, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await typesenseClient
      .collections(COLLECTIONS.tracks)
      .documents()
      .search({ q: TOKEN, query_by: 'title', per_page: expected });
    if ((result.found ?? 0) >= expected) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `Typesense did not index ${expected} tracks within ${timeoutMs}ms; ` +
      `suggests indexing latency has regressed or sync failed silently.`,
  );
}

describe.skipIf(!shouldRun)('Search Router (integration)', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    // Ensure Typesense collections exist. In production this runs via Next.js
    // instrumentation; in Vitest we must invoke it explicitly.
    await ensureCollections();

    // Seed 2 reciters.
    const [r1] = await db
      .insert(reciters)
      .values({ name: `${TOKEN} Reciter Alpha`, slug: `search-test-reciter-a-${suffix}` })
      .returning({ id: reciters.id });
    const [r2] = await db
      .insert(reciters)
      .values({ name: `${TOKEN} Reciter Beta`, slug: `search-test-reciter-b-${suffix}` })
      .returning({ id: reciters.id });

    seededReciterIds.push(r1!.id, r2!.id);

    // 1 album under each reciter.
    const [a1] = await db
      .insert(albums)
      .values({
        title: `${TOKEN} Album One`,
        slug: `search-test-album-a-${suffix}`,
        reciterId: r1!.id,
      })
      .returning({ id: albums.id });
    const [a2] = await db
      .insert(albums)
      .values({
        title: `${TOKEN} Album Two`,
        slug: `search-test-album-b-${suffix}`,
        reciterId: r2!.id,
      })
      .returning({ id: albums.id });

    seededAlbumIds.push(a1!.id, a2!.id);

    // 2 tracks under the first album.
    const [t1] = await db
      .insert(tracks)
      .values({
        title: `${TOKEN} Track Labbayk`,
        slug: `search-test-track-a1-${suffix}`,
        albumId: a1!.id,
      })
      .returning({ id: tracks.id });
    const [t2] = await db
      .insert(tracks)
      .values({
        title: `${TOKEN} Track Hussain`,
        slug: `search-test-track-a2-${suffix}`,
        albumId: a1!.id,
      })
      .returning({ id: tracks.id });

    seededTrackIds.push(t1!.id, t2!.id);

    // Seed lyrics in every language the search router queries against
    // (ar/ur/en/fr/transliteration). Typesense's `lyrics_.*` wildcard field
    // only materialises a specific variant (e.g. `lyrics_en`) once a document
    // carries it, so without this the router's `query_by: ...lyrics_en...`
    // returns 404 "Could not find a field named `lyrics_en`".
    await db.insert(lyrics).values([
      { trackId: t1!.id, language: 'ar', text: `${TOKEN} arabic` },
      { trackId: t1!.id, language: 'ur', text: `${TOKEN} urdu` },
      { trackId: t1!.id, language: 'en', text: `${TOKEN} english` },
      { trackId: t1!.id, language: 'fr', text: `${TOKEN} french` },
      { trackId: t1!.id, language: 'transliteration', text: `${TOKEN} translit` },
    ]);

    // Push every seeded row into Typesense. sync.ts pulls from `db` (singleton),
    // which reads DATABASE_URL from the same env our test connection uses.
    await Promise.all(seededReciterIds.map((id) => syncReciter(id)));
    await Promise.all(seededAlbumIds.map((id) => syncAlbum(id)));
    await Promise.all(seededTrackIds.map((id) => syncTrack(id)));

    // Typesense indexing is near-instant but not synchronous — bounded-poll
    // until the seeded tracks are searchable so multi-search queries below
    // see the just-upserted documents.
    await waitForTracksIndexed(seededTrackIds.length);
  });

  afterAll(async () => {
    if (!close) return;

    const { inArray } = await import('drizzle-orm');

    // Belt-and-braces: delete lyrics explicitly so a future FK weakening
    // (e.g. ON DELETE SET NULL instead of CASCADE) doesn't leak
    // TOKEN-tagged rows across test suites.
    if (seededTrackIds.length > 0) {
      await db.delete(lyrics).where(inArray(lyrics.trackId, seededTrackIds));
    }

    // Delete Typesense docs first (best-effort — the suite is the only owner).
    const tsDeletions: Array<Promise<unknown>> = [];
    for (const id of seededReciterIds) {
      tsDeletions.push(deleteDocument(COLLECTIONS.reciters, id).catch(() => undefined));
    }
    for (const id of seededAlbumIds) {
      tsDeletions.push(deleteDocument(COLLECTIONS.albums, id).catch(() => undefined));
    }
    for (const id of seededTrackIds) {
      tsDeletions.push(deleteDocument(COLLECTIONS.tracks, id).catch(() => undefined));
    }
    await Promise.all(tsDeletions);

    // Cascade deletes handle albums/tracks under each reciter.
    if (seededReciterIds.length > 0) {
      await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
    }

    await close();
  });

  describe('search.autocomplete', () => {
    it('returns reciters/albums/tracks arrays with the right shape', async () => {
      const caller = makeSearchCaller(db);
      const result = await caller.autocomplete({ q: TOKEN });

      expect(result).toHaveProperty('reciters');
      expect(result).toHaveProperty('albums');
      expect(result).toHaveProperty('tracks');
      expect(Array.isArray(result.reciters)).toBe(true);
      expect(Array.isArray(result.albums)).toBe(true);
      expect(Array.isArray(result.tracks)).toBe(true);
    });

    it('includes seeded reciter when queried by name', async () => {
      const caller = makeSearchCaller(db);
      const result = await caller.autocomplete({ q: TOKEN });

      const found = result.reciters.some((r) => seededReciterIds.includes(r.id));
      expect(found).toBe(true);
    });

    it('includes seeded album when queried by title', async () => {
      const caller = makeSearchCaller(db);
      const result = await caller.autocomplete({ q: TOKEN });

      const found = result.albums.some((a) => seededAlbumIds.includes(a.id));
      expect(found).toBe(true);
    });

    it('includes seeded track when queried by title', async () => {
      const caller = makeSearchCaller(db);
      const result = await caller.autocomplete({ q: TOKEN });

      const found = result.tracks.some((t) => seededTrackIds.includes(t.id));
      expect(found).toBe(true);
    });

    it('returns highlighted snippets on matching results', async () => {
      const caller = makeSearchCaller(db);
      const result = await caller.autocomplete({ q: TOKEN });

      const firstMatchingReciter = result.reciters.find((r) =>
        seededReciterIds.includes(r.id),
      );
      expect(firstMatchingReciter).toBeDefined();
      // Typesense returns a highlight on the matched field — the snippet should
      // contain <mark> markup around the matched token.
      expect(firstMatchingReciter!.highlights.length).toBeGreaterThan(0);
      const snippet = firstMatchingReciter!.highlights[0]!.snippet;
      expect(snippet).toContain('<mark>');
    });

    it('returns empty arrays for a non-matching query', async () => {
      const caller = makeSearchCaller(db);
      // A long random string that cannot match anything we seeded or any
      // realistic content in the collections.
      const result = await caller.autocomplete({ q: `zzqnomatch${suffix}xyz987` });

      expect(result.reciters).toHaveLength(0);
      expect(result.albums).toHaveLength(0);
      expect(result.tracks).toHaveLength(0);
    });
  });

  describe('search.query', () => {
    it("with type='tracks' returns only track hits", async () => {
      const caller = makeSearchCaller(db);
      const result = await caller.query({ q: TOKEN, type: 'tracks' });

      expect(result.hits.length).toBeGreaterThan(0);
      for (const hit of result.hits) {
        expect(hit.type).toBe('track');
      }
      // At least one of our seeded tracks comes back.
      const foundSeeded = result.hits.some(
        (hit) => hit.type === 'track' && seededTrackIds.includes(hit.item.id),
      );
      expect(foundSeeded).toBe(true);
    });

    it("with type='all' returns merged hits across types and a matching found total", async () => {
      const caller = makeSearchCaller(db);
      const result = await caller.query({ q: TOKEN, type: 'all' });

      // Merged: we seeded reciters + albums + tracks that all match TOKEN.
      const types = new Set(result.hits.map((h) => h.type));
      expect(types.has('reciter')).toBe(true);
      expect(types.has('album')).toBe(true);
      expect(types.has('track')).toBe(true);

      // `found` is the sum across all three collections for type='all'.
      // We seeded 2 reciters, 2 albums, 2 tracks — all containing TOKEN.
      // `found` should be at least that many (other pre-existing rows may
      // also match, but not fewer than our seeds).
      expect(result.found).toBeGreaterThanOrEqual(
        seededReciterIds.length + seededAlbumIds.length + seededTrackIds.length,
      );
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('respects pagination (page, perPage)', async () => {
      const caller = makeSearchCaller(db);

      // Single-collection path so perPage is honoured literally (no budget split).
      const page1 = await caller.query({
        q: TOKEN,
        type: 'tracks',
        page: 1,
        perPage: 1,
      });

      expect(page1.page).toBe(1);
      expect(page1.perPage).toBe(1);
      expect(page1.hits.length).toBeLessThanOrEqual(1);

      // Only validate totalPages math when there is something to page.
      if (page1.found > 0) {
        expect(page1.totalPages).toBe(Math.ceil(page1.found / 1));
      }

      // If we seeded 2 matching tracks, page 2 should return a different hit.
      if (page1.found >= 2 && page1.hits.length === 1) {
        const page2 = await caller.query({
          q: TOKEN,
          type: 'tracks',
          page: 2,
          perPage: 1,
        });
        expect(page2.page).toBe(2);
        if (page2.hits.length === 1) {
          expect(page2.hits[0]!.item.id).not.toBe(page1.hits[0]!.item.id);
        }
      }
    });
  });
}); // Search Router (integration)
