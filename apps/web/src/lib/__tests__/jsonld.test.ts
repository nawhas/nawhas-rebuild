import { describe, it, expect, vi } from 'vitest';
import type { ReciterWithAlbumsDTO, AlbumDetailDTO, TrackWithRelationsDTO } from '@nawhas/types';

// Mock siteUrl so tests are not environment-dependent.
vi.mock('@/lib/metadata', () => ({
  siteUrl: () => 'https://nawhas.com',
}));

// Import after mock is set up.
const { formatIsoDuration, serializeJsonLd, buildReciterJsonLd, buildAlbumJsonLd, buildTrackJsonLd } =
  await import('@/lib/jsonld');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReciter(overrides: Partial<ReciterWithAlbumsDTO> = {}): ReciterWithAlbumsDTO {
  return {
    id: 'r1',
    name: 'Bassim Al-Karbalaei',
    slug: 'bassim-al-karbalaei',
    albums: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeAlbum(overrides: Partial<AlbumDetailDTO> = {}): AlbumDetailDTO {
  return {
    id: 'a1',
    title: 'Ya Hussain',
    slug: 'ya-hussain',
    reciterId: 'r1',
    reciterName: 'Bassim Al-Karbalaei',
    reciterSlug: 'bassim-al-karbalaei',
    year: 2020,
    artworkUrl: 'https://cdn.nawhas.com/artwork.jpg',
    vibrantColor: null,
    tracks: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeTrack(overrides: Partial<TrackWithRelationsDTO> = {}): TrackWithRelationsDTO {
  return {
    id: 't1',
    title: 'Labbaik Ya Hussain',
    slug: 'labbaik-ya-hussain',
    albumId: 'a1',
    trackNumber: 1,
    audioUrl: 'https://cdn.nawhas.com/track.mp3',
    youtubeId: null,
    duration: 225,
    reciter: {
      id: 'r1',
      name: 'Bassim Al-Karbalaei',
      slug: 'bassim-al-karbalaei',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    album: {
      id: 'a1',
      title: 'Ya Hussain',
      slug: 'ya-hussain',
      reciterId: 'r1',
      year: 2020,
      artworkUrl: 'https://cdn.nawhas.com/artwork.jpg',
      vibrantColor: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    lyrics: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatIsoDuration
// ---------------------------------------------------------------------------

describe('formatIsoDuration', () => {
  it('converts seconds-only duration', () => {
    expect(formatIsoDuration(45)).toBe('PT45S');
  });

  it('converts minutes and seconds', () => {
    expect(formatIsoDuration(225)).toBe('PT3M45S');
  });

  it('converts hours, minutes, and seconds', () => {
    expect(formatIsoDuration(3661)).toBe('PT1H1M1S');
  });

  it('handles exactly 0 seconds', () => {
    expect(formatIsoDuration(0)).toBe('PT0S');
  });

  it('omits zero minutes when there are only seconds', () => {
    expect(formatIsoDuration(30)).toBe('PT30S');
  });

  it('omits trailing zero seconds when there are minutes', () => {
    expect(formatIsoDuration(120)).toBe('PT2M');
  });
});

// ---------------------------------------------------------------------------
// serializeJsonLd
// ---------------------------------------------------------------------------

describe('serializeJsonLd', () => {
  it('serializes a simple object to JSON', () => {
    const result = serializeJsonLd({ '@type': 'Person', name: 'Test' });
    expect(result).toContain('"@type":"Person"');
    expect(result).toContain('"name":"Test"');
  });

  it('escapes < and > to prevent script injection', () => {
    const result = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003c/script\\u003e');
  });

  it('escapes & characters', () => {
    const result = serializeJsonLd({ name: 'A & B' });
    expect(result).not.toContain('&');
    expect(result).toContain('\\u0026');
  });
});

// ---------------------------------------------------------------------------
// buildReciterJsonLd
// ---------------------------------------------------------------------------

describe('buildReciterJsonLd', () => {
  it('includes the correct schema context and type', () => {
    const ld = buildReciterJsonLd(makeReciter());
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Person');
  });

  it('includes the reciter name', () => {
    const ld = buildReciterJsonLd(makeReciter({ name: 'Test Reciter' }));
    expect(ld.name).toBe('Test Reciter');
  });

  it('builds the correct canonical URL', () => {
    const ld = buildReciterJsonLd(makeReciter({ slug: 'test-reciter' }));
    expect(ld.url).toBe('https://nawhas.com/reciters/test-reciter');
  });
});

// ---------------------------------------------------------------------------
// buildAlbumJsonLd
// ---------------------------------------------------------------------------

describe('buildAlbumJsonLd', () => {
  it('includes the correct schema context and type', () => {
    const ld = buildAlbumJsonLd(makeAlbum());
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('MusicAlbum');
  });

  it('includes album name and URL', () => {
    const ld = buildAlbumJsonLd(makeAlbum({ title: 'Ya Hussain', slug: 'ya-hussain' }));
    expect(ld.name).toBe('Ya Hussain');
    expect(ld.url).toBe('https://nawhas.com/albums/ya-hussain');
  });

  it('includes byArtist with reciter info', () => {
    const ld = buildAlbumJsonLd(makeAlbum());
    const artist = ld.byArtist as Record<string, string>;
    expect(artist['@type']).toBe('Person');
    expect(artist.name).toBe('Bassim Al-Karbalaei');
    expect(artist.url).toBe('https://nawhas.com/reciters/bassim-al-karbalaei');
  });

  it('includes datePublished when year is present', () => {
    const ld = buildAlbumJsonLd(makeAlbum({ year: 2022 }));
    expect(ld.datePublished).toBe('2022');
  });

  it('omits datePublished when year is null', () => {
    const ld = buildAlbumJsonLd(makeAlbum({ year: null }));
    expect(ld.datePublished).toBeUndefined();
  });

  it('includes image when artworkUrl is present', () => {
    const ld = buildAlbumJsonLd(makeAlbum({ artworkUrl: 'https://cdn.nawhas.com/art.jpg' }));
    expect(ld.image).toBe('https://cdn.nawhas.com/art.jpg');
  });

  it('omits image when artworkUrl is null', () => {
    const ld = buildAlbumJsonLd(makeAlbum({ artworkUrl: null }));
    expect(ld.image).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildTrackJsonLd
// ---------------------------------------------------------------------------

describe('buildTrackJsonLd', () => {
  it('includes the correct schema context and type', () => {
    const ld = buildTrackJsonLd(makeTrack(), 'bassim-al-karbalaei', 'ya-hussain', 'labbaik-ya-hussain');
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('MusicRecording');
  });

  it('includes track name and canonical URL', () => {
    const ld = buildTrackJsonLd(
      makeTrack({ title: 'Labbaik Ya Hussain' }),
      'bassim-al-karbalaei',
      'ya-hussain',
      'labbaik-ya-hussain',
    );
    expect(ld.name).toBe('Labbaik Ya Hussain');
    expect(ld.url).toBe(
      'https://nawhas.com/reciters/bassim-al-karbalaei/albums/ya-hussain/tracks/labbaik-ya-hussain',
    );
  });

  it('includes byArtist with reciter info', () => {
    const ld = buildTrackJsonLd(makeTrack(), 'bassim-al-karbalaei', 'ya-hussain', 'labbaik-ya-hussain');
    const artist = ld.byArtist as Record<string, string>;
    expect(artist['@type']).toBe('Person');
    expect(artist.name).toBe('Bassim Al-Karbalaei');
    expect(artist.url).toBe('https://nawhas.com/reciters/bassim-al-karbalaei');
  });

  it('includes inAlbum with album info', () => {
    const ld = buildTrackJsonLd(makeTrack(), 'bassim-al-karbalaei', 'ya-hussain', 'labbaik-ya-hussain');
    const album = ld.inAlbum as Record<string, string>;
    expect(album['@type']).toBe('MusicAlbum');
    expect(album.name).toBe('Ya Hussain');
    expect(album.url).toBe('https://nawhas.com/albums/ya-hussain');
  });

  it('converts duration to ISO 8601 format', () => {
    const ld = buildTrackJsonLd(makeTrack({ duration: 225 }), 'r', 'a', 't');
    expect(ld.duration).toBe('PT3M45S');
  });

  it('omits duration when null', () => {
    const ld = buildTrackJsonLd(makeTrack({ duration: null }), 'r', 'a', 't');
    expect(ld.duration).toBeUndefined();
  });
});
