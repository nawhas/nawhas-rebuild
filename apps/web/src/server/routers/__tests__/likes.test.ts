// @vitest-environment node
/**
 * Integration tests for the likes tRPC router.
 *
 * Covers:
 *   - like / unlike a track (happy path + idempotency)
 *   - batchStatus query returns correct liked state for multiple tracks
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
  makeLikesCaller,
  type TestDb,
} from './helpers';
import { createCallerFactory } from '../../trpc/trpc';
import { likesRouter } from '../likes';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();
const RECITER_SLUG = `likes-test-reciter-${SUFFIX}`;
const ALBUM_SLUG = `likes-test-album-${SUFFIX}`;
const USER_ID = `likes-test-user-${SUFFIX}`;
const USER_ID_2 = `likes-test-user2-${SUFFIX}`;

let trackId1: string;
let trackId2: string;
let trackId3: string;

const createdReciterIds: string[] = [];

const makeAnonCaller = (db: TestDb) =>
  createCallerFactory(likesRouter)({ db: db as unknown as Database, session: null, user: null });

describe.skipIf(!dbAvailable)('Likes Router', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    // Seed two users
    await db.insert(users).values([
      {
        id: USER_ID,
        name: 'Likes Test User',
        email: `likes-test-${SUFFIX}@example.com`,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: USER_ID_2,
        name: 'Likes Test User 2',
        email: `likes-test2-${SUFFIX}@example.com`,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const [r] = await db
      .insert(reciters)
      .values({ name: 'Likes Test Reciter', slug: RECITER_SLUG })
      .returning({ id: reciters.id });

    createdReciterIds.push(r!.id);

    const [a] = await db
      .insert(albums)
      .values({ title: 'Likes Test Album', slug: ALBUM_SLUG, reciterId: r!.id })
      .returning({ id: albums.id });

    const inserted = await db
      .insert(tracks)
      .values([
        { title: 'Likes Track One', slug: `likes-track-1-${SUFFIX}`, albumId: a!.id, trackNumber: 1 },
        { title: 'Likes Track Two', slug: `likes-track-2-${SUFFIX}`, albumId: a!.id, trackNumber: 2 },
        { title: 'Likes Track Three', slug: `likes-track-3-${SUFFIX}`, albumId: a!.id, trackNumber: 3 },
      ])
      .returning({ id: tracks.id });

    trackId1 = inserted[0]!.id;
    trackId2 = inserted[1]!.id;
    trackId3 = inserted[2]!.id;
  });

  afterAll(async () => {
    if (!close) return;
    if (createdReciterIds.length > 0) {
      await db.delete(reciters).where(inArray(reciters.id, createdReciterIds));
    }
    await db.delete(users).where(inArray(users.id, [USER_ID, USER_ID_2]));
    await close();
  });

  // ─── Authorization guard ───────────────────────────────────────────────────

  describe('UNAUTHORIZED guard', () => {
    it('likes.like throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.like({ trackId: trackId1 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('likes.unlike throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.unlike({ trackId: trackId1 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('likes.batchStatus throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.batchStatus({ trackIds: [trackId1] })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  // ─── like ──────────────────────────────────────────────────────────────────

  describe('likes.like', () => {
    it('liking a track returns it as liked in batchStatus', async () => {
      const caller = makeLikesCaller(db, USER_ID);
      await caller.like({ trackId: trackId1 });

      const status = await caller.batchStatus({ trackIds: [trackId1] });
      expect(status[trackId1]).toBe(true);
    });

    it('liking the same track twice is idempotent (no error, no duplicate)', async () => {
      const caller = makeLikesCaller(db, USER_ID);
      await caller.like({ trackId: trackId2 });
      await expect(caller.like({ trackId: trackId2 })).resolves.toBeUndefined();

      // batchStatus should still show exactly one liked entry
      const status = await caller.batchStatus({ trackIds: [trackId2] });
      expect(status[trackId2]).toBe(true);
    });

    it('likes are scoped per user — user2 liking does not affect user1', async () => {
      const caller1 = makeLikesCaller(db, USER_ID);
      const caller2 = makeLikesCaller(db, USER_ID_2);

      // User 1 has NOT liked trackId3 yet
      let status1 = await caller1.batchStatus({ trackIds: [trackId3] });
      expect(status1[trackId3]).toBe(false);

      // User 2 likes trackId3
      await caller2.like({ trackId: trackId3 });

      // User 1 should still see it as unliked
      status1 = await caller1.batchStatus({ trackIds: [trackId3] });
      expect(status1[trackId3]).toBe(false);

      // User 2 should see it as liked
      const status2 = await caller2.batchStatus({ trackIds: [trackId3] });
      expect(status2[trackId3]).toBe(true);
    });
  });

  // ─── unlike ───────────────────────────────────────────────────────────────

  describe('likes.unlike', () => {
    it('unliking a liked track removes the like', async () => {
      const caller = makeLikesCaller(db, USER_ID);
      await caller.like({ trackId: trackId1 });

      let status = await caller.batchStatus({ trackIds: [trackId1] });
      expect(status[trackId1]).toBe(true);

      await caller.unlike({ trackId: trackId1 });

      status = await caller.batchStatus({ trackIds: [trackId1] });
      expect(status[trackId1]).toBe(false);
    });

    it('unliking a track that is not liked does not throw', async () => {
      const caller = makeLikesCaller(db, USER_ID);
      await expect(caller.unlike({ trackId: trackId3 })).resolves.toBeUndefined();
    });
  });

  // ─── batchStatus ──────────────────────────────────────────────────────────

  describe('likes.batchStatus', () => {
    it('returns false for all unlisted tracks', async () => {
      const caller = makeLikesCaller(db, USER_ID);
      // Ensure clean state
      await caller.unlike({ trackId: trackId1 });
      await caller.unlike({ trackId: trackId2 });
      await caller.unlike({ trackId: trackId3 });

      const status = await caller.batchStatus({ trackIds: [trackId1, trackId2, trackId3] });
      expect(status[trackId1]).toBe(false);
      expect(status[trackId2]).toBe(false);
      expect(status[trackId3]).toBe(false);
    });

    it('returns mixed true/false for a mix of liked and unliked tracks', async () => {
      const caller = makeLikesCaller(db, USER_ID);
      await caller.unlike({ trackId: trackId1 });
      await caller.unlike({ trackId: trackId2 });

      await caller.like({ trackId: trackId1 });

      const status = await caller.batchStatus({ trackIds: [trackId1, trackId2] });
      expect(status[trackId1]).toBe(true);
      expect(status[trackId2]).toBe(false);
    });

    it('handles an empty trackIds array without error', async () => {
      const caller = makeLikesCaller(db, USER_ID);
      const status = await caller.batchStatus({ trackIds: [] });
      expect(status).toEqual({});
    });
  });
});
