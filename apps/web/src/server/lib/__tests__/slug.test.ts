import { describe, expect, it } from 'vitest';
import { slugify, findFreeSlug } from '../slug';

describe('slugify', () => {
  it('lowercases', () => expect(slugify('Hello')).toBe('hello'));
  it('replaces spaces and underscores with dashes', () => {
    expect(slugify('hello world_test')).toBe('hello-world-test');
  });
  it('strips punctuation', () => {
    expect(slugify("Ali's Ode!?")).toBe('alis-ode');
  });
  it('trims leading and trailing dashes', () => {
    expect(slugify('  -hello-  ')).toBe('hello');
  });
});

describe('findFreeSlug', () => {
  it('returns candidate when free', () => {
    expect(findFreeSlug('ali', [])).toBe('ali');
    expect(findFreeSlug('ali', ['other', 'names'])).toBe('ali');
  });
  it('picks lowest free suffix when candidate is taken', () => {
    expect(findFreeSlug('ali', ['ali'])).toBe('ali-2');
    expect(findFreeSlug('ali', ['ali', 'ali-2'])).toBe('ali-3');
    expect(findFreeSlug('ali', ['ali', 'ali-2', 'ali-3'])).toBe('ali-4');
  });
  it('handles non-contiguous existing suffixes', () => {
    expect(findFreeSlug('ali', ['ali', 'ali-5'])).toBe('ali-2');
  });
  it('ignores unrelated slugs sharing a prefix', () => {
    expect(findFreeSlug('ali', ['ali-akbar', 'ali-raza'])).toBe('ali');
  });
});
