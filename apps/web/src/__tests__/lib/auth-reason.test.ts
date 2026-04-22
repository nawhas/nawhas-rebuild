import { describe, expect, it } from 'vitest';
import { AUTH_REASONS, buildLoginHref, isAuthReason } from '@/lib/auth-reason';

describe('isAuthReason', () => {
  it('accepts every reason in AUTH_REASONS', () => {
    for (const reason of AUTH_REASONS) {
      expect(isAuthReason(reason)).toBe(true);
    }
  });

  it('rejects unknown strings, null, and undefined', () => {
    expect(isAuthReason('unknown')).toBe(false);
    expect(isAuthReason('')).toBe(false);
    expect(isAuthReason(null)).toBe(false);
    expect(isAuthReason(undefined)).toBe(false);
  });
});

describe('buildLoginHref', () => {
  it('encodes callbackUrl without a reason', () => {
    expect(buildLoginHref({ callbackUrl: '/albums/foo' })).toBe('/login?callbackUrl=%2Falbums%2Ffoo');
  });

  it('appends reason when provided', () => {
    expect(buildLoginHref({ callbackUrl: '/albums/foo', reason: 'save' })).toBe(
      '/login?callbackUrl=%2Falbums%2Ffoo&reason=save',
    );
  });

  it('preserves query strings inside the callbackUrl', () => {
    expect(buildLoginHref({ callbackUrl: '/search?q=test', reason: 'like' })).toBe(
      '/login?callbackUrl=%2Fsearch%3Fq%3Dtest&reason=like',
    );
  });
});
