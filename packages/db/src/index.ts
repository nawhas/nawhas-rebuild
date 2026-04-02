import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

type Schema = typeof schema;

let _db: PostgresJsDatabase<Schema> | null = null;

/**
 * Returns the Drizzle DB instance, initialising it on first call.
 * Deferred so the module can be imported at build time without DATABASE_URL.
 */
export function getDb(): PostgresJsDatabase<Schema> {
  if (_db) return _db;
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const client = postgres(connectionString);
  _db = drizzle(client, { schema });
  return _db;
}

/** Singleton accessor — equivalent to the previous `db` export. */
export const db: PostgresJsDatabase<Schema> = new Proxy({} as PostgresJsDatabase<Schema>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export type Database = PostgresJsDatabase<Schema>;

// Re-export all schema tables, relations, and column types for use in app code.
export * from './schema/index.js';
