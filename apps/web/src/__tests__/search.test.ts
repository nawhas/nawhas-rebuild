// @vitest-environment node
/**
 * Unit tests for the search tRPC router (search.autocomplete and search.query).
 *
 * The Typesense client is mocked so these tests do not require a live instance.
 * See apps/web/src/__tests__/lib/typesense.test.ts for integration tests that
 * verify the client and collections against a real Typesense server.
 */

// Set env vars before any module that reads them at init time.
process.env.TYPESENSE_HOST = 'localhost';
process.env.TYPESENSE_PORT = '8108';
process.env.TYPESENSE_PROTOCOL = 'http';
process.env.TYPESENSE_API_KEY = 'test-key';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Database } from '@nawhas/db';

// ---------------------------------------------------------------------------
// Mock the Typesense client module before importing the router.
// vi.mock is hoisted, so mock functions must be defined with vi.hoisted().
// ---------------------------------------------------------------------------

const { mockMultiSearchPerform, mockDocumentsSearch } = vi.hoisted(() => ({
  mockMultiSearchPerform: vi.fn(),
  mockDocumentsSearch: vi.fn(),
}));

vi.mock('@/lib/typesense/client', () => ({
  typesenseClient: {
    multiSearch: {
      perform: mockMultiSearchPerform,
    },
    collections: vi.fn().mockReturnValue({
      documents: () => ({ search: mockDocumentsSearch }),
    }),
  },
  TYPESENSE_SEARCH_API_KEY: 'test-search-key',
}));

import { searchRouter } from '../server/routers/search';
import { createCallerFactory } from '../server/trpc/trpc';

const createCaller = createCallerFactory(searchRouter);

// The search router doesn't use ctx.db, but the Context type requires it.
const caller = createCaller({ db: {} as Database, session: null, user: null });

// ---------------------------------------------------------------------------
// Helper factories for Typesense mock responses
// ---------------------------------------------------------------------------

function reciterHit(id: string, name: string, slug: string, snippet?: string) {
  return {
    document: { id, name, slug },
    highlights: snippet ? [{ field: 'name', snippet }] : [],
    highlight: {},
    text_match: 100,
  };
}

function albumHit(
  id: string,
  title: string,
  slug: string,
  reciterId: string,
  reciterName: string,
) {
  return {
    document: { id, title, slug, reciterId, reciterName, year: 2020, artworkUrl: null },
    highlights: [{ field: 'title', snippet: `<mark>${title}</mark>` }],
    highlight: {},
    text_match: 90,
  };
}

function trackHit(id: string, title: string, slug: string) {
  return {
    document: {
      id,
      title,
      slug,
      trackNumber: 1,
      albumId: 'album-1',
      albumTitle: 'Test Album',
      albumSlug: 'test-album',
      reciterId: 'reciter-1',
      reciterName: 'Test Reciter',
      reciterSlug: 'test-reciter',
    },
    highlights: [{ field: 'title', snippet: `<mark>${title}</mark>` }],
    highlight: {},
    text_match: 80,
  };
}

function emptyResult(found = 0) {
  return { hits: [], found, page: 1, search_time_ms: 1, out_of: found, request_params: {} };
}

// ---------------------------------------------------------------------------
// search.autocomplete
// ---------------------------------------------------------------------------

describe('search.autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns grouped results with highlights', async () => {
    mockMultiSearchPerform.mockResolvedValue({
      results: [
        {
          hits: [reciterHit('r1', 'Ali Farid', 'ali-farid', '<mark>Ali</mark> Farid')],
          found: 1,
          page: 1,
        },
        {
          hits: [albumHit('a1', 'Muharram Collection', 'muharram-collection', 'r1', 'Ali Farid')],
          found: 1,
          page: 1,
        },
        {
          hits: [trackHit('t1', 'Ya Hussain', 'ya-hussain')],
          found: 1,
          page: 1,
        },
      ],
    });

    const result = await caller.autocomplete({ q: 'ali' });

    expect(result.reciters).toHaveLength(1);
    const reciter = result.reciters[0]!;
    expect(reciter.name).toBe('Ali Farid');
    expect(reciter.highlights).toEqual([{ field: 'name', snippet: '<mark>Ali</mark> Farid' }]);

    expect(result.albums).toHaveLength(1);
    const album = result.albums[0]!;
    expect(album.title).toBe('Muharram Collection');
    expect(album.year).toBe(2020);
    expect(album.artworkUrl).toBeNull();

    expect(result.tracks).toHaveLength(1);
    const track = result.tracks[0]!;
    expect(track.title).toBe('Ya Hussain');
    expect(track.albumTitle).toBe('Test Album');
    expect(track.reciterSlug).toBe('test-reciter');
  });

  it('returns empty groups when no matches', async () => {
    mockMultiSearchPerform.mockResolvedValue({
      results: [emptyResult(), emptyResult(), emptyResult()],
    });

    const result = await caller.autocomplete({ q: 'zzznomatch' });

    expect(result.reciters).toHaveLength(0);
    expect(result.albums).toHaveLength(0);
    expect(result.tracks).toHaveLength(0);
  });

  it('calls multi-search with correct per_page limits', async () => {
    mockMultiSearchPerform.mockResolvedValue({
      results: [emptyResult(), emptyResult(), emptyResult()],
    });

    await caller.autocomplete({ q: 'test' });

    expect(mockMultiSearchPerform).toHaveBeenCalledWith(
      expect.objectContaining({
        searches: expect.arrayContaining([
          expect.objectContaining({ collection: 'reciters', per_page: 3 }),
          expect.objectContaining({ collection: 'albums', per_page: 3 }),
          expect.objectContaining({ collection: 'tracks', per_page: 5 }),
        ]),
      }),
      {},
    );
  });

  it('handles highlights with no snippet gracefully', async () => {
    mockMultiSearchPerform.mockResolvedValue({
      results: [
        {
          hits: [
            {
              document: { id: 'r1', name: 'Basim', slug: 'basim' },
              // highlight present but no snippet field
              highlights: [{ field: 'name', matched_tokens: ['Basim'] }],
              highlight: {},
              text_match: 100,
            },
          ],
          found: 1,
          page: 1,
        },
        emptyResult(),
        emptyResult(),
      ],
    });

    const result = await caller.autocomplete({ q: 'basim' });

    // No snippet → highlights array should be empty
    expect(result.reciters[0]!.highlights).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// search.query — single collection
// ---------------------------------------------------------------------------

describe('search.query — single collection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries reciters collection and returns typed hits', async () => {
    mockDocumentsSearch.mockResolvedValue({
      hits: [reciterHit('r1', 'Basim Al-Karbalaei', 'basim-al-karbalaei')],
      found: 1,
      page: 1,
      search_time_ms: 2,
      out_of: 1,
      request_params: {},
    });

    const result = await caller.query({ q: 'basim', type: 'reciters' });

    expect(result.hits).toHaveLength(1);
    const hit = result.hits[0]!;
    expect(hit.type).toBe('reciter');
    // Narrow the discriminated union for item access
    if (hit.type === 'reciter') {
      expect(hit.item.name).toBe('Basim Al-Karbalaei');
    }
    expect(result.found).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.perPage).toBe(20);
  });

  it('queries albums collection and returns typed hits', async () => {
    mockDocumentsSearch.mockResolvedValue({
      hits: [albumHit('a1', 'Safar Collection', 'safar-collection', 'r1', 'Ali Farid')],
      found: 1,
      page: 1,
      search_time_ms: 2,
      out_of: 1,
      request_params: {},
    });

    const result = await caller.query({ q: 'safar', type: 'albums' });

    const hit = result.hits[0]!;
    expect(hit.type).toBe('album');
    if (hit.type === 'album') {
      expect(hit.item.title).toBe('Safar Collection');
      expect(hit.item.reciterName).toBe('Ali Farid');
    }
  });

  it('queries tracks collection and returns typed hits', async () => {
    mockDocumentsSearch.mockResolvedValue({
      hits: [trackHit('t1', 'Labbayk Ya Hussain', 'labbayk-ya-hussain')],
      found: 1,
      page: 1,
      search_time_ms: 2,
      out_of: 1,
      request_params: {},
    });

    const result = await caller.query({ q: 'hussain', type: 'tracks' });

    const hit = result.hits[0]!;
    expect(hit.type).toBe('track');
    if (hit.type === 'track') {
      expect(hit.item.albumSlug).toBe('test-album');
      expect(hit.item.reciterSlug).toBe('test-reciter');
    }
  });

  it('computes totalPages correctly', async () => {
    mockDocumentsSearch.mockResolvedValue({
      hits: [],
      found: 55,
      page: 3,
      search_time_ms: 1,
      out_of: 55,
      request_params: {},
    });

    const result = await caller.query({
      q: 'hussain',
      type: 'tracks',
      page: 3,
      perPage: 10,
    });

    expect(result.found).toBe(55);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(6); // Math.ceil(55/10)
    expect(result.perPage).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// search.query — type=all
// ---------------------------------------------------------------------------

describe('search.query — type=all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses multi-search and merges results from all collections', async () => {
    mockMultiSearchPerform.mockResolvedValue({
      results: [
        { hits: [reciterHit('r1', 'Reciter One', 'reciter-one')], found: 5, page: 1 },
        {
          hits: [albumHit('a1', 'Album One', 'album-one', 'r1', 'Reciter One')],
          found: 10,
          page: 1,
        },
        { hits: [trackHit('t1', 'Track One', 'track-one')], found: 3, page: 1 },
      ],
    });

    const result = await caller.query({ q: 'one', type: 'all' });

    // 1 reciter + 1 album + 1 track
    expect(result.hits).toHaveLength(3);
    expect(result.hits[0]!.type).toBe('reciter');
    expect(result.hits[1]!.type).toBe('album');
    expect(result.hits[2]!.type).toBe('track');

    // found = sum of all collections
    expect(result.found).toBe(18); // 5 + 10 + 3
  });

  it('returns empty hits and found=0 when nothing matches', async () => {
    mockMultiSearchPerform.mockResolvedValue({
      results: [emptyResult(), emptyResult(), emptyResult()],
    });

    const result = await caller.query({ q: 'zzznomatch', type: 'all' });

    expect(result.hits).toHaveLength(0);
    expect(result.found).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('uses default perPage=20 and splits budget across collections', async () => {
    mockMultiSearchPerform.mockResolvedValue({
      results: [emptyResult(), emptyResult(), emptyResult()],
    });

    await caller.query({ q: 'test' }); // type defaults to 'all', perPage defaults to 20

    // perPage=20 → perCollection=6 (floor(20/3)), tracks=8 (20 - 6*2)
    expect(mockMultiSearchPerform).toHaveBeenCalledWith(
      expect.objectContaining({
        searches: expect.arrayContaining([
          expect.objectContaining({ collection: 'reciters', per_page: 6 }),
          expect.objectContaining({ collection: 'albums', per_page: 6 }),
          expect.objectContaining({ collection: 'tracks', per_page: 8 }),
        ]),
      }),
      {},
    );
  });
});
