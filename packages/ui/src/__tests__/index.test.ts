import { describe, expect, it } from 'vitest';

// Smoke test: verify the UI barrel export resolves without errors.
describe('@nawhas/ui barrel', () => {
  it('imports without throwing', async () => {
    const ui = await import('../index.js');
    expect(ui).toBeDefined();
    expect(typeof ui).toBe('object');
  });
});
