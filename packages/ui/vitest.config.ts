import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest config for the @nawhas/ui package.
// Component render tests use jsdom; @testing-library/react is available as a devDep.
// No DB/search env needed — these are pure presentational primitives.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
