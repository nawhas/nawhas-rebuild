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
    // Provide a dummy DATABASE_URL so @nawhas/db can be imported in unit tests
    // without a live Postgres connection. Tests that need a real DB should use
    // integration test setup instead.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/nawhas_test',
    },
    // Use jsdom for component tests that need a DOM environment.
    // Individual test files may override with @vitest-environment node.
    environment: 'jsdom',
  },
});
