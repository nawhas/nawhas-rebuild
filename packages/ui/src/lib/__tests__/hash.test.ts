import { describe, it, expect } from 'vitest';
import { hashToIndex } from '../hash';

describe('hashToIndex', () => {
  it('returns the same value for the same seed', () => {
    expect(hashToIndex('foo', 10)).toBe(hashToIndex('foo', 10));
  });

  it('respects the modulo bound', () => {
    for (let i = 0; i < 100; i++) {
      const result = hashToIndex(`seed-${i}`, 7);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(7);
    }
  });

  it('returns 0 for empty string (zero modulo by accumulation = 0)', () => {
    expect(hashToIndex('', 10)).toBe(0);
  });

  it('produces different values for sufficiently different seeds', () => {
    const a = hashToIndex('abcdefgh', 100);
    const b = hashToIndex('zyxwvuts', 100);
    expect(a).not.toBe(b);
  });
});
