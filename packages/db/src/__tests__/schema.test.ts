import { describe, expect, it } from 'vitest';

// Smoke test: verify the Drizzle schema barrel exports correctly.
// We test the schema directly rather than the index (which requires DATABASE_URL).
describe('@nawhas/db schema barrel', () => {
  it('imports without throwing', async () => {
    const schema = await import('../schema/index.js');
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });
});
