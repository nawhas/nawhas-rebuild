// @vitest-environment node
/**
 * Unit tests for incremental Typesense sync helpers.
 *
 * All external dependencies (Drizzle db, Typesense client) are mocked so
 * these tests run without any live services.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLECTIONS } from '../collections.js';

// ---------------------------------------------------------------------------
// Hoisted mock references — must be declared with vi.hoisted() so they are
// available inside vi.mock() factories (which are hoisted to the top of the
// compiled output before any variable declarations).
// ---------------------------------------------------------------------------

const {
  mockUpsert,
  mockDelete,
  mockDocuments,
  mockCollections,
  mockLimit,
  mockWhere,
  mockLeftJoin,
  mockFrom,
  mockSelect,
  mockUpdateWhere,
  mockSet,
  mockUpdate,
  mockFindFirst,
} = vi.hoisted(() => {
  const mockUpsert = vi.fn().mockResolvedValue({});
  const mockDelete = vi.fn().mockResolvedValue({});
  const mockDocuments = vi.fn((id?: string) =>
    id !== undefined ? { delete: mockDelete } : { upsert: mockUpsert },
  );
  const mockCollections = vi.fn(() => ({ documents: mockDocuments }));

  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockLeftJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, leftJoin: mockLeftJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockUpdateWhere = vi.fn().mockResolvedValue([]);
  const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));

  const mockFindFirst = vi.fn();

  return {
    mockUpsert,
    mockDelete,
    mockDocuments,
    mockCollections,
    mockLimit,
    mockWhere,
    mockLeftJoin,
    mockFrom,
    mockSelect,
    mockUpdateWhere,
    mockSet,
    mockUpdate,
    mockFindFirst,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../client.js', () => ({
  typesenseClient: { collections: mockCollections },
}));

vi.mock('@nawhas/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    query: { tracks: { findFirst: mockFindFirst } },
  },
  reciters: { id: 'reciters.id', typesenseSyncedAt: 'reciters.typesenseSyncedAt' },
  albums: {
    id: 'albums.id',
    reciterId: 'albums.reciterId',
    typesenseSyncedAt: 'albums.typesenseSyncedAt',
    title: 'albums.title',
    slug: 'albums.slug',
    year: 'albums.year',
    artworkUrl: 'albums.artworkUrl',
  },
  tracks: { id: 'tracks.id', typesenseSyncedAt: 'tracks.typesenseSyncedAt' },
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------

import { syncReciter, syncAlbum, syncTrack, deleteDocument } from '../sync.js';

// ---------------------------------------------------------------------------
// Helper — reset all mocks between tests while restoring default behaviour
// ---------------------------------------------------------------------------

function resetMocks() {
  vi.clearAllMocks();

  mockUpsert.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
  mockDocuments.mockImplementation((id?: string) =>
    id !== undefined ? { delete: mockDelete } : { upsert: mockUpsert },
  );
  mockCollections.mockReturnValue({ documents: mockDocuments });

  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLeftJoin.mockReturnValue({ where: mockWhere });
  mockFrom.mockReturnValue({ where: mockWhere, leftJoin: mockLeftJoin });
  mockSelect.mockReturnValue({ from: mockFrom });

  mockUpdateWhere.mockResolvedValue([]);
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockSet });
}

// ---------------------------------------------------------------------------
// syncReciter
// ---------------------------------------------------------------------------

describe('syncReciter()', () => {
  beforeEach(resetMocks);

  it('upserts the reciter into the reciters collection and stamps syncedAt', async () => {
    const reciter = { id: 'r1', name: 'Bassim Al-Karbalai', slug: 'bassim-al-karbalai' };
    mockLimit.mockResolvedValue([reciter]);

    await syncReciter('r1');

    expect(mockCollections).toHaveBeenCalledWith(COLLECTIONS.reciters);
    expect(mockUpsert).toHaveBeenCalledWith({
      id: reciter.id,
      name: reciter.name,
      slug: reciter.slug,
    });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ typesenseSyncedAt: expect.any(Date) }),
    );
  });

  it('returns early without upserting when reciter is not found', async () => {
    mockLimit.mockResolvedValue([]);

    await syncReciter('nonexistent');

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by the Typesense client', async () => {
    const reciter = { id: 'r2', name: 'Test', slug: 'test' };
    mockLimit.mockResolvedValue([reciter]);
    mockUpsert.mockRejectedValue(new Error('Typesense unavailable'));

    await expect(syncReciter('r2')).rejects.toThrow('Typesense unavailable');
    // syncedAt must NOT be stamped when upsert fails
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// syncAlbum
// ---------------------------------------------------------------------------

describe('syncAlbum()', () => {
  beforeEach(resetMocks);

  it('upserts the album with denormalised reciter name and stamps syncedAt', async () => {
    const row = {
      id: 'a1',
      title: 'Muharram 2024',
      slug: 'muharram-2024',
      reciterId: 'r1',
      year: 2024,
      artworkUrl: 'https://cdn.example.com/artwork.jpg',
      reciterName: 'Bassim Al-Karbalai',
    };
    mockLimit.mockResolvedValue([row]);

    await syncAlbum('a1');

    expect(mockCollections).toHaveBeenCalledWith(COLLECTIONS.albums);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: row.id,
        title: row.title,
        slug: row.slug,
        reciterId: row.reciterId,
        reciterName: row.reciterName,
        year: row.year,
        artworkUrl: row.artworkUrl,
      }),
    );
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('omits optional fields when year and artworkUrl are null', async () => {
    const row = {
      id: 'a2',
      title: 'No Year Album',
      slug: 'no-year',
      reciterId: 'r1',
      year: null,
      artworkUrl: null,
      reciterName: 'Bassim',
    };
    mockLimit.mockResolvedValue([row]);

    await syncAlbum('a2');

    const payload = mockUpsert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('year');
    expect(payload).not.toHaveProperty('artworkUrl');
  });

  it('falls back to empty string when reciterName is null', async () => {
    const row = {
      id: 'a3',
      title: 'Orphan Album',
      slug: 'orphan',
      reciterId: 'r1',
      year: null,
      artworkUrl: null,
      reciterName: null,
    };
    mockLimit.mockResolvedValue([row]);

    await syncAlbum('a3');

    const payload = mockUpsert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload['reciterName']).toBe('');
  });

  it('returns early without upserting when album is not found', async () => {
    mockLimit.mockResolvedValue([]);

    await syncAlbum('nonexistent');

    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// syncTrack
// ---------------------------------------------------------------------------

describe('syncTrack()', () => {
  beforeEach(resetMocks);

  it('upserts the track with dynamic lyrics map and stamps syncedAt', async () => {
    const track = {
      id: 't1',
      title: 'Ya Hussain',
      slug: 'ya-hussain',
      albumId: 'a1',
      trackNumber: 3,
      album: {
        title: 'Muharram 2024',
        slug: 'muharram-2024',
        reciterId: 'r1',
        reciter: { name: 'Bassim Al-Karbalai', slug: 'bassim-al-karbalai' },
      },
      lyrics: [
        { language: 'ar', text: 'يا حسين' },
        { language: 'ur', text: 'یا حسین' },
      ],
    };
    mockFindFirst.mockResolvedValue(track);

    await syncTrack('t1');

    expect(mockCollections).toHaveBeenCalledWith(COLLECTIONS.tracks);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: track.id,
        title: track.title,
        slug: track.slug,
        albumId: track.albumId,
        albumTitle: track.album.title,
        albumSlug: track.album.slug,
        reciterId: track.album.reciterId,
        reciterName: track.album.reciter.name,
        reciterSlug: track.album.reciter.slug,
        trackNumber: track.trackNumber,
        lyrics_ar: 'يا حسين',
        lyrics_ur: 'یا حسین',
      }),
    );
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('upserts without trackNumber field when it is null', async () => {
    const track = {
      id: 't2',
      title: 'No Number Track',
      slug: 'no-number',
      albumId: 'a1',
      trackNumber: null,
      album: {
        title: 'Album',
        slug: 'album',
        reciterId: 'r1',
        reciter: { name: 'Reciter', slug: 'reciter' },
      },
      lyrics: [],
    };
    mockFindFirst.mockResolvedValue(track);

    await syncTrack('t2');

    const payload = mockUpsert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('trackNumber');
  });

  it('returns early without upserting when track is not found', async () => {
    mockFindFirst.mockResolvedValue(undefined);

    await syncTrack('nonexistent');

    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------

describe('deleteDocument()', () => {
  beforeEach(resetMocks);

  it('deletes the document from the specified collection', async () => {
    await deleteDocument(COLLECTIONS.reciters, 'r1');

    expect(mockCollections).toHaveBeenCalledWith(COLLECTIONS.reciters);
    expect(mockDocuments).toHaveBeenCalledWith('r1');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('accepts all valid COLLECTIONS values', async () => {
    for (const col of Object.values(COLLECTIONS)) {
      await deleteDocument(col, 'doc-id');
      expect(mockCollections).toHaveBeenCalledWith(col);
      resetMocks();
    }
  });

  it('propagates errors from the Typesense client', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'));

    await expect(deleteDocument(COLLECTIONS.tracks, 't1')).rejects.toThrow('Not found');
  });
});
