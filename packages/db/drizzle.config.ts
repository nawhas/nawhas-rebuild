import type { Config } from 'drizzle-kit';

const config: Config = {
  // Point at the compiled JS output so drizzle-kit resolves modules correctly.
  // Run `pnpm build` (or `pnpm db:generate`, which does it automatically) before
  // running any drizzle-kit command.
  schema: './dist/schema/index.js',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
};

export default config;
