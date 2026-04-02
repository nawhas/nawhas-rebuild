import type { Config } from 'drizzle-kit';

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required but not set');
}

const config: Config = {
  // Point at the compiled JS output so drizzle-kit resolves modules correctly.
  // Run `pnpm build` (or `pnpm db:generate`, which does it automatically) before
  // running any drizzle-kit command.
  schema: './dist/schema/index.js',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
};

export default config;
