import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// When running Vitest inside Docker Compose, inherit DB/Typesense from the service env.
// Local fallback matches a typical host Postgres test DB (see docs).
const testEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/nawhas_test',
  TYPESENSE_HOST: process.env.TYPESENSE_HOST ?? 'localhost',
  TYPESENSE_PORT: process.env.TYPESENSE_PORT ?? '8108',
  TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL ?? 'http',
  TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY ?? 'nawhas-typesense-key',
  LOGGING_ENABLED: process.env.LOGGING_ENABLED ?? 'false',
} as const;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // Playwright specs under src/tests/ use @playwright/test; Vitest must not load them.
    exclude: ['**/node_modules/**', '**/dist/**', '**/src/tests/**'],
    // DATABASE_URL for tests.
    // - Unit tests (schema, cursor, etc.) import @nawhas/db without hitting a real DB.
    // - Integration tests (routers/__tests__) require the `nawhas_test` database to exist
    //   and be migrated. In CI / `./dev test`, Docker provides DATABASE_URL (test overlay).
    //   Locally on the host: docker compose up -d postgres && migrate nawhas_test, or
    //   DATABASE_URL=postgresql://postgres:password@localhost:5432/nawhas_test
    env: testEnv,
    // Use jsdom for component tests that need a DOM environment.
    // Individual test files may override with @vitest-environment node.
    environment: 'jsdom',
  },
});
