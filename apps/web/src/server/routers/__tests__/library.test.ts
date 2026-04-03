// @vitest-environment node
/**
 * Integration tests for the library tRPC router.
 *
 * Covers:
 *   - save / unsave a track (happy path + idempotency)
 *   - list saved tracks (pagination via cursor)
 *   - playAll ordering
 *   - UNAUTHORIZED guard on all protected procedures
 *
 * Requires a real Postgres instance at DATABASE_URL.
 * Tests are skipped gracefully when the DB is unreachable.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { reciters, albums, tracks, users } from '@nawhas/db';
import type { Database } from '@nawhas/db';
import {
  createTestDb,
  isDbAvailable,
  makeLibraryCaller,
  makeAuthCtx,
  type TestDb,
} from './helpers';
import { createCallerFactory } from '../../trpc/trpc';
import { libraryRouter } from '../library';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();
const RECITER_SLUG = `lib-test-reciter-${SUFFIX}`;
const ALBUM_SLUG = `lib-test-album-${SUFFIX}`;
const USER_ID = `lib-test-user-${SUFFIX}`;

let albumId: string;
let trackId1: string;
let trackId2: string;
let trackId3: string;

const createdReciterIds: string[] = [];

const makeAnonCaller = (db: TestDb) =>
  createCallerFactory(libraryRouter)({ db: db as unknown as Database, session: null, user: null });

describe.skipIf(!dbAvailable)('Library Router', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    // Seed a user row so FK constraints are satisfied.
    await db.insert(users).values({
      id: USER_ID,
      name: 'Library Test User',
      email: `lib-test-${SUFFIX}@example.com`,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [r] = await db
      .insert(reciters)
      .values({ name: 'Library Test Reciter', slug: RECITER_SLUG })
      .returning({ id: reciters.id });

    createdReciterIds.push(r!.id);

    const [a] = await db
      .insert(albums)
      .values({ title: 'Library Test Album', slug: ALBUM_SLUG, reciterId: r!.id })
      .returning({ id: albums.id });

    albumId = a!.id;

    const inserted = await db
      .insert(tracks)
      .values([
        { title: 'Track One', slug: `lib-track-1-${SUFFIX}`, albumId, trackNumber: 1 },
        { title: 'Track Two', slug: `lib-track-2-${SUFFIX}`, albumId, trackNumber: 2 },
        { title: 'Track Three', slug: `lib-track-3-${SUFFIX}`, albumId, trackNumber: 3 },
      ])
      .returning({ id: tracks.id });

    trackId1 = inserted[0]!.id;
    trackId2 = inserted[1]!.id;
    trackId3 = inserted[2]!.id;
  });

  afterAll(async () => {
    if (!close) return;
    // Cascade deletes handle albums, tracks, user_saved_tracks.
    if (createdReciterIds.length > 0) {
      await db.delete(reciters).where(inArray(reciters.id, createdReciterIds));
    }
    await db.delete(users).where(inArray(users.id, [USER_ID]));
    await close();
  });

  // ─── Authorization guard ───────────────────────────────────────────────────

  describe('UNAUTHORIZED guard', () => {
    it('library.save throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.save({ trackId: trackId1 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('library.list throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.list({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('library.playAll throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.playAll()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  // ─── save / unsave ─────────────────────────────────────────────────────────

  describe('library.save', () => {
    it('saves a track and it appears in library.list', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await caller.save({ trackId: trackId1 });

      const result = await caller.list({});
      const savedIds = result.items.map((i) => i.trackId);
      expect(savedIds).toContain(trackId1);
    });

    it('saving the same track twice is idempotent (no error, no duplicate)', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await caller.save({ trackId: trackId2 });
      // Second save — must not throw
      await expect(caller.save({ trackId: trackId2 })).resolves.toBeUndefined();

      const result = await caller.list({});
      const savedIds = result.items.map((i) => i.trackId);
      expect(savedIds.filter((id) => id === trackId2)).toHaveLength(1);
    });
  });

  describe('library.unsave', () => {
    it('removes a saved track from the library', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await caller.save({ trackId: trackId3 });

      // Confirm it's saved
      let result = await caller.list({});
      expect(result.items.map((i) => i.trackId)).toContain(trackId3);

      await caller.unsave({ trackId: trackId3 });

      result = await caller.list({});
      expect(result.items.map((i) => i.trackId)).not.toContain(trackId3);
    });

    it('unsaving a track that is not saved does not throw', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await expect(caller.unsave({ trackId: trackId3 })).resolves.toBeUndefined();
    });
  });

  // ─── list (pagination) ─────────────────────────────────────────────────────

  describe('library.list', () => {
    it('returns items with track relation attached', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await caller.save({ trackId: trackId1 });

      const result = await caller.list({});
      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.track).toBeDefined();
        expect(item.track.id).toBe(item.trackId);
        expect(typeof item.savedAt).toBe('string'); // ISO string per SavedTrackDTO
      }
    });

    it('respects the limit parameter', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await caller.save({ trackId: trackId1 });
      await caller.save({ trackId: trackId2 });

      const result = await caller.list({ limit: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).not.toBeNull();
    });

    it('cursor-based pagination returns the next page correctly', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await caller.save({ trackId: trackId1 });
      await caller.save({ trackId: trackId2 });

      const page1 = await caller.list({ limit: 1 });
      expect(page1.items).toHaveLength(1);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await caller.list({ limit: 1, cursor: page1.nextCursor! });
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0]!.trackId).not.toBe(page1.items[0]!.trackId);
    });

    it('returns nextCursor = null on the last page', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      const result = await caller.list({ limit: 1000 });
      expect(result.nextCursor).toBeNull();
    });
  });

  // ─── playAll ───────────────────────────────────────────────────────────────

  describe('library.playAll', () => {
    it('returns all saved tracks as a flat array of TrackDTOs', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      await caller.save({ trackId: trackId1 });
      await caller.save({ trackId: trackId2 });

      const result = await caller.playAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      for (const track of result) {
        expect(track.id).toBeDefined();
        expect(track.slug).toBeDefined();
      }
    });

    it('playAll ordering is consistent — savedAt ASC for deterministic queue', async () => {
      const caller = makeLibraryCaller(db, USER_ID);
      // Reset state to get a predictable saved-at ordering
      await caller.unsave({ trackId: trackId1 });
      await caller.unsave({ trackId: trackId2 });

      // Re-save: trackId2 first, then trackId1
      await caller.save({ trackId: trackId2 });
      // Small artificial delay ensures distinct savedAt values in the DB
      await new Promise((r) => setTimeout(r, 5));
      await caller.save({ trackId: trackId1 });

      const result = await caller.playAll();
      const ids = result.map((t) => t.id);
      const idx2 = ids.indexOf(trackId2);
      const idx1 = ids.indexOf(trackId1);
      expect(idx2).toBeGreaterThanOrEqual(0);
      expect(idx1).toBeGreaterThanOrEqual(0);
      // trackId2 saved first → should appear first in queue
      expect(idx2).toBeLessThan(idx1);
    });
  });
});
