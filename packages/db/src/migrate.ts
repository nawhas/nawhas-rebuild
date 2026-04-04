/**
 * Standalone migration runner for production/staging.
 * Used by the Kubernetes init container to apply Drizzle migrations before
 * the app pods start.
 *
 * Run: node dist/migrate.js
 * Requires: DATABASE_URL env var
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

console.log('Running database migrations...');

await migrate(db, {
  migrationsFolder: join(__dirname, 'migrations'),
});

console.log('Migrations complete.');
await client.end();
