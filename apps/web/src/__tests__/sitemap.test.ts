// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @nawhas/db before importing sitemap (which uses it at module level)
vi.mock('@nawhas/db', () => {
  const mockDb = {
    select: vi.fn(),
  };
  return {
    db: mockDb,
    reciters: {},
    albums: {},
    tracks: {},
    eq: vi.fn(),
  };
});

// Mock @/lib/metadata siteUrl
vi.mock('@/lib/metadata', () => ({
  siteUrl: vi.fn(() => 'https://nawhas.com'),
}));

// Mock drizzle-orm eq (used in joins)
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

// Build a chainable Drizzle select stub.
// Each call to select().from().innerJoin()...etc resolves to `rows`.
function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (val: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve),
    ),
    // Make thenable so `await db.select()...` works
    [Symbol.toStringTag]: 'Promise',
  };
  // Make the chain itself a thenable (for `await chain`)
  Object.defineProperty(chain, Symbol.toStringTag, { value: 'MockChain' });
  // Allow the chain to be awaited directly
  (chain as unknown as Promise<unknown>)[Symbol.iterator as unknown as keyof typeof chain];
  return chain;
}

describe('sitemap', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('includes static routes', async () => {
    const { db } = await import('@nawhas/db');
    const mockDb = db as { select: ReturnType<typeof vi.fn> };

    // Three sequential select calls: reciters, albums, tracks
    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      switch (callCount) {
        case 1:
          return makeSelectChain([]); // reciters
        case 2:
          return makeSelectChain([]); // albums
        case 3:
          return makeSelectChain([]); // tracks
        default:
          return makeSelectChain([]);
      }
    });

    const sitemapModule = await import('../../app/sitemap');
    const sitemap = sitemapModule.default;
    const result = await sitemap();

    const urls = result.map((r) => r.url);
    expect(urls).toContain('https://nawhas.com');
    expect(urls).toContain('https://nawhas.com/reciters');
    expect(urls).toContain('https://nawhas.com/albums');
  });

  it('includes reciter, album, and track URLs from the database', async () => {
    const { db } = await import('@nawhas/db');
    const mockDb = db as { select: ReturnType<typeof vi.fn> };

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      switch (callCount) {
        case 1:
          // reciters query
          return makeSelectChain([
            { slug: 'bassem-karbalai', updatedAt: FIXED_DATE },
          ]);
        case 2:
          // albums query (with reciterSlug)
          return makeSelectChain([
            { slug: 'muharram-2020', updatedAt: FIXED_DATE, reciterSlug: 'bassem-karbalai' },
          ]);
        case 3:
          // tracks query (with albumSlug, reciterSlug)
          return makeSelectChain([
            { slug: 'ya-hussain', updatedAt: FIXED_DATE, albumSlug: 'muharram-2020', reciterSlug: 'bassem-karbalai' },
          ]);
        default:
          return makeSelectChain([]);
      }
    });

    const sitemapModule = await import('../../app/sitemap');
    const sitemap = sitemapModule.default;
    const result = await sitemap();

    const urls = result.map((r) => r.url);
    expect(urls).toContain('https://nawhas.com/reciters/bassem-karbalai');
    expect(urls).toContain('https://nawhas.com/albums/muharram-2020');
    expect(urls).toContain(
      'https://nawhas.com/reciters/bassem-karbalai/albums/muharram-2020/tracks/ya-hussain',
    );
  });

  it('populates lastmod from updatedAt for each entry', async () => {
    const { db } = await import('@nawhas/db');
    const mockDb = db as { select: ReturnType<typeof vi.fn> };

    const updatedAt = new Date('2024-06-15T12:00:00.000Z');
    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      switch (callCount) {
        case 1:
          return makeSelectChain([{ slug: 'reciter-a', updatedAt }]);
        case 2:
          return makeSelectChain([]);
        case 3:
          return makeSelectChain([]);
        default:
          return makeSelectChain([]);
      }
    });

    const sitemapModule = await import('../../app/sitemap');
    const sitemap = sitemapModule.default;
    const result = await sitemap();

    const reciterEntry = result.find((r) => r.url === 'https://nawhas.com/reciters/reciter-a');
    expect(reciterEntry).toBeDefined();
    expect(reciterEntry?.lastModified).toEqual(updatedAt);
  });

  it('uses NEXT_PUBLIC_APP_URL as base (no hardcoded domain)', async () => {
    const { siteUrl } = await import('@/lib/metadata');
    vi.mocked(siteUrl).mockReturnValue('https://staging.nawhas.com');

    const { db } = await import('@nawhas/db');
    const mockDb = db as { select: ReturnType<typeof vi.fn> };

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      return makeSelectChain([]);
    });

    const sitemapModule = await import('../../app/sitemap');
    const sitemap = sitemapModule.default;
    const result = await sitemap();

    const urls = result.map((r) => r.url);
    expect(urls.every((url) => url.startsWith('https://staging.nawhas.com'))).toBe(true);
    expect(urls.every((url) => !url.includes('nawhas.com/') || url.startsWith('https://staging'))).toBe(true);
  });
});
