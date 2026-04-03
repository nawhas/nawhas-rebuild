// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  encodeAlbumCursor,
  decodeAlbumCursor,
} from '../cursor';

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a standard cursor', () => {
    const createdAt = new Date('2024-06-15T12:00:00.000Z');
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const encoded = encodeCursor(createdAt, id);
    const decoded = decodeCursor(encoded);

    expect(decoded.createdAt).toEqual(createdAt);
    expect(decoded.id).toBe(id);
  });

  it('produces an opaque base64 string', () => {
    const encoded = encodeCursor(new Date('2024-01-01T00:00:00.000Z'), 'some-id');
    expect(() => atob(encoded)).not.toThrow();
    // Should not contain raw pipe characters when viewed as a string
    expect(encoded).not.toContain('|');
  });

  it('throws on an invalid cursor', () => {
    const bad = Buffer.from('no-pipe-here').toString('base64');
    expect(() => decodeCursor(bad)).toThrow('Invalid cursor');
  });
});

describe('encodeAlbumCursor / decodeAlbumCursor', () => {
  it('round-trips a cursor with a numeric year', () => {
    const year = 2023;
    const createdAt = new Date('2023-09-01T08:30:00.000Z');
    const id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    const encoded = encodeAlbumCursor(year, createdAt, id);
    const decoded = decodeAlbumCursor(encoded);

    expect(decoded.year).toBe(year);
    expect(decoded.createdAt).toEqual(createdAt);
    expect(decoded.id).toBe(id);
  });

  it('round-trips a cursor with null year', () => {
    const createdAt = new Date('2022-03-15T00:00:00.000Z');
    const id = '00000000-0000-0000-0000-000000000001';

    const encoded = encodeAlbumCursor(null, createdAt, id);
    const decoded = decodeAlbumCursor(encoded);

    expect(decoded.year).toBeNull();
    expect(decoded.createdAt).toEqual(createdAt);
    expect(decoded.id).toBe(id);
  });

  it('throws on a malformed album cursor (missing separators)', () => {
    const bad = Buffer.from('onlyone').toString('base64');
    expect(() => decodeAlbumCursor(bad)).toThrow('Invalid album cursor');
  });

  it('throws on an album cursor with only one separator', () => {
    const bad = Buffer.from('null|2024-01-01T00:00:00.000Z').toString('base64');
    expect(() => decodeAlbumCursor(bad)).toThrow('Invalid album cursor');
  });

  it('encodes year=0 correctly (not confused with null)', () => {
    const createdAt = new Date('2000-01-01T00:00:00.000Z');
    const id = 'deadbeef-dead-beef-dead-beefdeadbeef';

    const encoded = encodeAlbumCursor(0, createdAt, id);
    const decoded = decodeAlbumCursor(encoded);

    expect(decoded.year).toBe(0);
    expect(decoded.year).not.toBeNull();
  });
});
