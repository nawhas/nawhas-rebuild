import { describe, expect, it } from 'vitest';

// Smoke test: verify the types barrel export resolves without errors.
describe('@nawhas/types barrel', () => {
  it('imports without throwing', async () => {
    const types = await import('../index.js');
    expect(types).toBeDefined();
    expect(typeof types).toBe('object');
  });
});
