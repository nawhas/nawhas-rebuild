/**
 * Shared test utilities for tRPC router integration tests.
 *
 * Creates a Drizzle DB connection for seeding/cleanup and a tRPC caller
 * wired to it. All callers use a public (unauthenticated) context.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@nawhas/db';
import { createCallerFactory } from '../../trpc/trpc';
import { homeRouter } from '../home';
import { reciterRouter } from '../reciter';
import { albumRouter } from '../album';
import { trackRouter } from '../track';

export type TestDb = PostgresJsDatabase<typeof schema>;

export function createTestDb(): { db: TestDb; close: () => Promise<void> } {
  const url = process.env['DATABASE_URL'] ?? 'postgresql://test:test@localhost:5432/nawhas_test';
  const client = postgres(url, { max: 3 });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

function makeCtx(db: TestDb) {
  return { db: db as unknown as import('@nawhas/db').Database, session: null, user: null };
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
