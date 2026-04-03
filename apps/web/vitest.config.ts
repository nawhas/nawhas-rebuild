import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Playwright specs under src/tests/ use @playwright/test; Vitest must not load them.
    exclude: ['**/node_modules/**', '**/dist/**', '**/src/tests/**'],
    // DATABASE_URL for tests.
    // - Unit tests (schema, cursor, etc.) import @nawhas/db without hitting a real DB.
    // - Integration tests (routers/__tests__) require the `nawhas_test` database to exist
    //   and be migrated. In CI this is created by the test job setup step.
    //   Locally: docker compose up -d postgres && pnpm --filter @nawhas/db db:migrate
    //   (with DATABASE_URL=postgresql://postgres:password@localhost:5432/nawhas_test)
    //   then create the test user: CREATE USER test WITH PASSWORD 'test' and grant access.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/nawhas_test',
      // Typesense env vars required by lib/typesense/client.ts at module load time.
      // Any test that transitively imports the search router needs these set.
      // Integration tests against a real Typesense instance may override them.
      TYPESENSE_HOST: 'localhost',
      TYPESENSE_PORT: '8108',
      TYPESENSE_PROTOCOL: 'http',
      TYPESENSE_API_KEY: 'nawhas-typesense-key',
    },
    // Use jsdom for component tests that need a DOM environment.
    // Individual test files may override with @vitest-environment node.
    environment: 'jsdom',
  },
});
