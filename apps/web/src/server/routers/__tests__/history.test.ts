// @vitest-environment node
/**
 * Integration tests for the history tRPC router.
 *
 * Covers:
 *   - record a play event (happy path)
 *   - 30-second deduplication window: recording the same track within 30s
 *     inserts only one row
 *   - recording the same track after 30s creates a new entry
 *   - list returns entries in descending playedAt order with cursor pagination
 *   - clear removes all history entries for the calling user only
 *   - UNAUTHORIZED guard on all protected procedures
 *
 * Requires a real Postgres instance at DATABASE_URL.
 * Tests are skipped gracefully when the DB is unreachable.
 *
 * NOTE: The 30s dedup window is tested by manipulating playedAt directly in the
 * database rather than sleeping, keeping the test suite fast.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { reciters, albums, tracks, users, listeningHistory } from '@nawhas/db';
import type { Database } from '@nawhas/db';
import {
  createTestDb,
  isDbAvailable,
  makeAuthCtx,
  type TestDb,
} from './helpers';
import { createCallerFactory } from '../../trpc/trpc';

// Dynamic import so this test file doesn't crash when the history router
// hasn't been implemented yet (NAW-147). Tests are skipped in that case.
const historyMod = await import('../history').catch(() => null);
const historyRouter = historyMod?.historyRouter;

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();
const RECITER_SLUG = `hist-test-reciter-${SUFFIX}`;
const ALBUM_SLUG = `hist-test-album-${SUFFIX}`;
const USER_ID = `hist-test-user-${SUFFIX}`;
const USER_ID_2 = `hist-test-user2-${SUFFIX}`;

let trackId1: string;
let trackId2: string;

const createdReciterIds: string[] = [];

const makeHistoryCaller = (db: TestDb, userId: string) =>
  createCallerFactory(historyRouter!)(makeAuthCtx(db, userId));

const makeAnonCaller = (db: TestDb) =>
  createCallerFactory(historyRouter!)({ db: db as unknown as Database, session: null, user: null });

describe.skipIf(!dbAvailable || !historyRouter)('History Router', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    await db.insert(users).values([
      {
        id: USER_ID,
        name: 'History Test User',
        email: `hist-test-${SUFFIX}@example.com`,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: USER_ID_2,
        name: 'History Test User 2',
        email: `hist-test2-${SUFFIX}@example.com`,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const [r] = await db
      .insert(reciters)
      .values({ name: 'History Test Reciter', slug: RECITER_SLUG })
      .returning({ id: reciters.id });

    createdReciterIds.push(r!.id);

    const [a] = await db
      .insert(albums)
      .values({ title: 'History Test Album', slug: ALBUM_SLUG, reciterId: r!.id })
      .returning({ id: albums.id });

    const inserted = await db
      .insert(tracks)
      .values([
        { title: 'History Track One', slug: `hist-track-1-${SUFFIX}`, albumId: a!.id, trackNumber: 1 },
        { title: 'History Track Two', slug: `hist-track-2-${SUFFIX}`, albumId: a!.id, trackNumber: 2 },
      ])
      .returning({ id: tracks.id });

    trackId1 = inserted[0]!.id;
    trackId2 = inserted[1]!.id;
  });

  afterAll(async () => {
    if (!close) return;
    if (createdReciterIds.length > 0) {
      await db.delete(reciters).where(inArray(reciters.id, createdReciterIds));
    }
    await db.delete(users).where(inArray(users.id, [USER_ID, USER_ID_2]));
    await close();
  });

  // Clean up listening_history between tests for isolation.
  const clearHistory = (userId: string) =>
    db.delete(listeningHistory).where(eq(listeningHistory.userId, userId));

  // ─── Authorization guard ──────────────────────────────────────────────────

  describe('UNAUTHORIZED guard', () => {
    it('history.record throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.record({ trackId: trackId1 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('history.list throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.list({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('history.clear throws UNAUTHORIZED for unauthenticated callers', async () => {
      const caller = makeAnonCaller(db);
      await expect(caller.clear()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  // ─── record ───────────────────────────────────────────────────────────────

  describe('history.record', () => {
    beforeAll(async () => clearHistory(USER_ID));

    it('records a play event that appears in history.list', async () => {
      const caller = makeHistoryCaller(db, USER_ID);
      await caller.record({ trackId: trackId1 });

      const result = await caller.list({});
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]!.trackId).toBe(trackId1);
    });

    it('30s dedup window: recording the same track twice within 30s inserts only one row', async () => {
      await clearHistory(USER_ID);
      const caller = makeHistoryCaller(db, USER_ID);

      // First play
      await caller.record({ trackId: trackId1 });
      // Second play immediately — within 30s window
      await caller.record({ trackId: trackId1 });

      const rows = await db
        .select()
        .from(listeningHistory)
        .where(and(eq(listeningHistory.userId, USER_ID), eq(listeningHistory.trackId, trackId1)));

      expect(rows).toHaveLength(1);
    });

    it('30s dedup window: recording the same track after the window has passed inserts a new row', async () => {
      await clearHistory(USER_ID);

      // Manually insert a row with playedAt = 31 seconds ago to simulate
      // a play that occurred just outside the dedup window.
      const pastTime = new Date(Date.now() - 31_000);
      await db.insert(listeningHistory).values({
        userId: USER_ID,
        trackId: trackId1,
        playedAt: pastTime,
      });

      // Now record again — should insert a second row since > 30s elapsed
      const caller = makeHistoryCaller(db, USER_ID);
      await caller.record({ trackId: trackId1 });

      const rows = await db
        .select()
        .from(listeningHistory)
        .where(and(eq(listeningHistory.userId, USER_ID), eq(listeningHistory.trackId, trackId1)));

      expect(rows).toHaveLength(2);
    });

    it('different tracks are always recorded independently regardless of timing', async () => {
      await clearHistory(USER_ID);
      const caller = makeHistoryCaller(db, USER_ID);

      await caller.record({ trackId: trackId1 });
      await caller.record({ trackId: trackId2 });

      const result = await caller.list({});
      const tracksInHistory = result.items.map((e) => e.trackId);
      expect(tracksInHistory).toContain(trackId1);
      expect(tracksInHistory).toContain(trackId2);
    });

    it('history is scoped per user — user2 recording does not appear in user1 history', async () => {
      await clearHistory(USER_ID);
      await clearHistory(USER_ID_2);

      const caller2 = makeHistoryCaller(db, USER_ID_2);
      await caller2.record({ trackId: trackId1 });

      const caller1 = makeHistoryCaller(db, USER_ID);
      const result1 = await caller1.list({});

      const user1TrackIds = result1.items.map((e) => e.trackId);
      expect(user1TrackIds).not.toContain(trackId1);
    });
  });

  // ─── list (pagination) ────────────────────────────────────────────────────

  describe('history.list', () => {
    beforeAll(async () => clearHistory(USER_ID));

    it('returns entries with track relation attached', async () => {
      const caller = makeHistoryCaller(db, USER_ID);
      await caller.record({ trackId: trackId1 });

      const result = await caller.list({});
      expect(result.items.length).toBeGreaterThan(0);
      for (const entry of result.items) {
        expect(entry.track).toBeDefined();
        expect(entry.track.id).toBe(entry.trackId);
        expect(typeof entry.playedAt).toBe('string'); // ISO string per ListenHistoryEntryDTO
        expect(typeof entry.id).toBe('string');
      }
    });

    it('returns entries newest-first (DESC playedAt)', async () => {
      await clearHistory(USER_ID);

      // Insert two entries with distinct timestamps
      const older = new Date(Date.now() - 60_000);
      const newer = new Date();
      await db.insert(listeningHistory).values([
        { userId: USER_ID, trackId: trackId1, playedAt: older },
        { userId: USER_ID, trackId: trackId2, playedAt: newer },
      ]);

      const caller = makeHistoryCaller(db, USER_ID);
      const result = await caller.list({});

      expect(result.items).toHaveLength(2);
      // Newest first
      expect(result.items[0]!.trackId).toBe(trackId2);
      expect(result.items[1]!.trackId).toBe(trackId1);
    });

    it('respects the limit parameter', async () => {
      await clearHistory(USER_ID);
      await db.insert(listeningHistory).values([
        { userId: USER_ID, trackId: trackId1 },
        { userId: USER_ID, trackId: trackId2 },
      ]);

      const caller = makeHistoryCaller(db, USER_ID);
      const result = await caller.list({ limit: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).not.toBeNull();
    });

    it('cursor-based pagination returns the next page correctly', async () => {
      await clearHistory(USER_ID);
      // Insert two entries with a tiny gap so they have distinct playedAt
      await db.insert(listeningHistory).values({ userId: USER_ID, trackId: trackId1 });
      await new Promise((r) => setTimeout(r, 5));
      await db.insert(listeningHistory).values({ userId: USER_ID, trackId: trackId2 });

      const caller = makeHistoryCaller(db, USER_ID);
      const page1 = await caller.list({ limit: 1 });
      expect(page1.items).toHaveLength(1);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await caller.list({ limit: 1, cursor: page1.nextCursor! });
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0]!.trackId).not.toBe(page1.items[0]!.trackId);
    });

    it('returns nextCursor = null on the last page', async () => {
      const caller = makeHistoryCaller(db, USER_ID);
      const result = await caller.list({ limit: 1000 });
      expect(result.nextCursor).toBeNull();
    });
  });

  // ─── clear ────────────────────────────────────────────────────────────────

  describe('history.clear', () => {
    it('removes all history entries for the calling user', async () => {
      await clearHistory(USER_ID);

      await db.insert(listeningHistory).values([
        { userId: USER_ID, trackId: trackId1 },
        { userId: USER_ID, trackId: trackId2 },
      ]);

      const caller = makeHistoryCaller(db, USER_ID);
      let result = await caller.list({});
      expect(result.items.length).toBeGreaterThan(0);

      await caller.clear();

      result = await caller.list({});
      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('clear only removes history for the calling user, not other users', async () => {
      await clearHistory(USER_ID);
      await clearHistory(USER_ID_2);

      // Both users have history
      await db.insert(listeningHistory).values([
        { userId: USER_ID, trackId: trackId1 },
        { userId: USER_ID_2, trackId: trackId1 },
      ]);

      // User 1 clears their history
      const caller1 = makeHistoryCaller(db, USER_ID);
      await caller1.clear();

      // User 2's history must remain intact
      const caller2 = makeHistoryCaller(db, USER_ID_2);
      const result2 = await caller2.list({});
      expect(result2.items.length).toBeGreaterThan(0);
    });

    it('calling clear when history is already empty does not throw', async () => {
      await clearHistory(USER_ID);
      const caller = makeHistoryCaller(db, USER_ID);
      await expect(caller.clear()).resolves.toBeDefined();
    });
  });
});
