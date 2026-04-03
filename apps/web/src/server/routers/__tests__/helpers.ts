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

export function makeAuthCtx(db: TestDb, userId: string) {
  const now = new Date();
  const user = {
    id: userId,
    name: 'Test User',
    email: `test-${userId}@example.com`,
    emailVerified: true,
    image: null,
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
