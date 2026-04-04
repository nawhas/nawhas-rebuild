// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/metadata', () => ({
  siteUrl: vi.fn(() => 'https://nawhas.com'),
}));

const { default: robots } = await import('../../app/robots');

describe('robots()', () => {
  it('returns rules for all user agents', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.userAgent).toBe('*');
  });

  it('allows all public content', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe('/');
  });

  it('disallows /api/ routes', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
    expect(disallowed).toContain('/api/');
  });

  it('disallows /auth/ routes', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
    expect(disallowed).toContain('/auth/');
  });

  it('includes the sitemap URL using siteUrl()', () => {
    const result = robots();
    expect(result.sitemap).toBe('https://nawhas.com/sitemap.xml');
  });
});
