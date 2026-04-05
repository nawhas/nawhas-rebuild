import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db, reciters, albums, tracks } from '@nawhas/db';
import { siteUrl } from '@/lib/metadata';

/**
 * Dynamic sitemap generator — accessible at GET /sitemap.xml.
 *
 * Queries all public reciters, albums, and tracks from the database
 * and generates a sitemap with lastmod from updatedAt fields.
 *
 * Base URL is taken from the NEXT_PUBLIC_APP_URL environment variable.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/reciters`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/albums`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ];

  try {
    // Fetch all reciters
    const allReciters = await db
      .select({ slug: reciters.slug, updatedAt: reciters.updatedAt })
      .from(reciters);

    const reciterRoutes: MetadataRoute.Sitemap = allReciters.map((reciter) => ({
      url: `${base}/reciters/${reciter.slug}`,
      lastModified: reciter.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Fetch all albums joined with their reciter slug
    const allAlbums = await db
      .select({
        slug: albums.slug,
        updatedAt: albums.updatedAt,
        reciterSlug: reciters.slug,
      })
      .from(albums)
      .innerJoin(reciters, eq(albums.reciterId, reciters.id));

    const albumRoutes: MetadataRoute.Sitemap = allAlbums.map((album) => ({
      url: `${base}/albums/${album.slug}`,
      lastModified: album.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Fetch all tracks joined with their album and reciter slugs
    const allTracks = await db
      .select({
        slug: tracks.slug,
        updatedAt: tracks.updatedAt,
        albumSlug: albums.slug,
        reciterSlug: reciters.slug,
      })
      .from(tracks)
      .innerJoin(albums, eq(tracks.albumId, albums.id))
      .innerJoin(reciters, eq(albums.reciterId, reciters.id));

    const trackRoutes: MetadataRoute.Sitemap = allTracks.map((track) => ({
      url: `${base}/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`,
      lastModified: track.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...reciterRoutes, ...albumRoutes, ...trackRoutes];
  } catch {
    // Build-time fallback: DB is unavailable (e.g. Docker build), return static routes only
    return staticRoutes;
  }
}
