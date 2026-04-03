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
    },
    // Use jsdom for component tests that need a DOM environment.
    // Individual test files may override with @vitest-environment node.
    environment: 'jsdom',
  },
});
