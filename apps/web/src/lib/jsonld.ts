import type { ReciterWithAlbumsDTO, AlbumDetailDTO, TrackWithRelationsDTO } from '@nawhas/types';
import { siteUrl } from '@/lib/metadata';

/**
 * Serialize JSON-LD data safely for inline <script> injection.
 * Escapes </script> sequences and HTML entities to prevent XSS.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Convert a duration in seconds to ISO 8601 duration format (e.g. PT3M45S).
 */
export function formatIsoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  let iso = 'PT';
  if (h > 0) iso += `${h}H`;
  if (m > 0) iso += `${m}M`;
  if (s > 0 || (h === 0 && m === 0)) iso += `${s}S`;
  return iso;
}

/**
 * Build a schema.org Person JSON-LD object for a reciter page.
 * https://schema.org/Person
 */
export function buildReciterJsonLd(reciter: ReciterWithAlbumsDTO): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: reciter.name,
    url: `${siteUrl()}/reciters/${reciter.slug}`,
  };
}

/**
 * Build a schema.org MusicAlbum JSON-LD object for an album page.
 * https://schema.org/MusicAlbum
 */
export function buildAlbumJsonLd(album: AlbumDetailDTO): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: album.title,
    url: `${siteUrl()}/albums/${album.slug}`,
    byArtist: {
      '@type': 'Person',
      name: album.reciterName,
      url: `${siteUrl()}/reciters/${album.reciterSlug}`,
    },
  };

  if (album.year != null) {
    base.datePublished = String(album.year);
  }

  if (album.artworkUrl != null) {
    base.image = album.artworkUrl;
  }

  return base;
}

/**
 * Build a schema.org MusicRecording JSON-LD object for a track page.
 * https://schema.org/MusicRecording
 */
export function buildTrackJsonLd(
  track: TrackWithRelationsDTO,
  reciterSlug: string,
  albumSlug: string,
  trackSlug: string,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    url: `${siteUrl()}/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${trackSlug}`,
    byArtist: {
      '@type': 'Person',
      name: track.reciter.name,
      url: `${siteUrl()}/reciters/${track.reciter.slug}`,
    },
    inAlbum: {
      '@type': 'MusicAlbum',
      name: track.album.title,
      url: `${siteUrl()}/albums/${track.album.slug}`,
    },
  };

  if (track.duration != null) {
    base.duration = formatIsoDuration(track.duration);
  }

  return base;
}
