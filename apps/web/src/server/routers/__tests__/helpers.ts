/**
 * Shared test utilities for tRPC router integration tests.
 *
 * Creates a Drizzle DB connection for seeding/cleanup and a tRPC caller
 * wired to it. All callers use a public (unauthenticated) context.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database } from '@nawhas/db';
import * as schema from '@nawhas/db';
import { createCallerFactory } from '../../trpc/trpc';
import { homeRouter } from '../home';
import { reciterRouter } from '../reciter';
import { albumRouter } from '../album';
import { trackRouter } from '../track';
import { libraryRouter } from '../library';
import { likesRouter } from '../likes';
import { historyRouter } from '../history';
import { submissionRouter } from '../submission';
import { moderationRouter } from '../moderation';
import { searchRouter } from '../search';
import { contributeRouter } from '../contribute';

export type TestDb = PostgresJsDatabase<typeof schema>;

export function createTestDb(): { db: TestDb; close: () => Promise<void> } {
  const url = process.env['DATABASE_URL'] ?? 'postgresql://test:test@localhost:5432/nawhas_test';
  const client = postgres(url, { max: 3 });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

/**
 * Returns true if the configured database is reachable.
 * Used in integration-test beforeAll to skip gracefully when
 * the Quality CI job runs without Postgres (--no-deps).
 */
export async function isDbAvailable(): Promise<boolean> {
  const url = process.env['DATABASE_URL'] ?? 'postgresql://test:test@localhost:5432/nawhas_test';
  const client = postgres(url, { max: 1, connect_timeout: 3 });
  try {
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Returns true if the configured Typesense instance is reachable and healthy.
 * Mirrors isDbAvailable() — used by integration tests that seed a real index
 * to skip gracefully when Typesense is not running (e.g. Quality CI with
 * --no-deps). Short timeout so the suite fails fast.
 */
export async function isTypesenseAvailable(): Promise<boolean> {
  const host = process.env['TYPESENSE_HOST'] ?? 'localhost';
  const port = process.env['TYPESENSE_PORT'] ?? '8108';
  const protocol = process.env['TYPESENSE_PROTOCOL'] ?? 'http';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`${protocol}://${host}:${port}/health`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function makeCtx(db: TestDb) {
  return { db: db as unknown as Database, session: null, user: null };
}

export function makeHomeCaller(db: TestDb) {
  return createCallerFactory(homeRouter)(makeCtx(db));
}

export function makeReciterCaller(db: TestDb) {
  return createCallerFactory(reciterRouter)(makeCtx(db));
}

export function makeAlbumCaller(db: TestDb) {
  return createCallerFactory(albumRouter)(makeCtx(db));
}

export function makeTrackCaller(db: TestDb) {
  return createCallerFactory(trackRouter)(makeCtx(db));
}

export function makeSearchCaller(db: TestDb) {
  return createCallerFactory(searchRouter)(makeCtx(db));
}

// ─── Authenticated context helpers ───────────────────────────────────────────
//
// Creates a minimal session + user object that satisfies the Context interface
// without going through Better Auth registration.  Use these for testing
// protectedProcedure routers where we only care about DB behaviour, not auth.

export function makeLibraryCaller(db: TestDb, userId: string) {
  return createCallerFactory(libraryRouter)(makeAuthCtx(db, userId));
}

export function makeLikesCaller(db: TestDb, userId: string) {
  return createCallerFactory(likesRouter)(makeAuthCtx(db, userId));
}

export function makeHistoryCaller(db: TestDb, userId: string) {
  return createCallerFactory(historyRouter)(makeAuthCtx(db, userId));
}

export function makeSubmissionCaller(db: TestDb, userId: string, role: 'user' | 'contributor' | 'moderator' = 'contributor') {
  return createCallerFactory(submissionRouter)(makeAuthCtx(db, userId, role));
}

export function makeModerationCaller(db: TestDb, userId: string) {
  return createCallerFactory(moderationRouter)(makeAuthCtx(db, userId, 'moderator'));
}

export function makeContributeCaller(
  db: TestDb,
  userId: string,
  role: 'user' | 'contributor' | 'moderator' = 'contributor',
) {
  return createCallerFactory(contributeRouter)(makeAuthCtx(db, userId, role));
}

export function makeAuthCtx(
  db: TestDb,
  userId: string,
  role: 'user' | 'contributor' | 'moderator' = 'user',
) {
  const now = new Date();
  const user = {
    id: userId,
    name: 'Test User',
    email: `test-${userId}@example.com`,
    emailVerified: true,
    image: null,
    role,
    banned: null,
    banReason: null,
    banExpires: null,
    createdAt: now,
    updatedAt: now,
  };
  const session = {
    id: `session-${userId}`,
    userId,
    expiresAt: new Date(now.getTime() + 86_400_000), // 1 day
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    updatedAt: now,
    token: `token-${userId}`,
  };
  return { db: db as unknown as Database, session, user };
}
