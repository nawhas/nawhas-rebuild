import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Provide a dummy DATABASE_URL so @nawhas/db can be imported in unit tests
    // without a live Postgres connection. Tests that need a real DB should use
    // integration test setup instead.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/nawhas_test',
    },
  },
});
