/**
 * CLI entry point for the full Typesense re-index.
 * Thin wrapper — all logic lives in search-index.ts.
 * Run with: pnpm db:search-index
 */
import { runSearchIndex } from './search-index.js';

runSearchIndex()
  .then(() => {
    console.log('\nSearch index complete.');
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
