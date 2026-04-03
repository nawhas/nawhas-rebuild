/**
 * Incremental Typesense sync helpers.
 *
 * Each function fetches one document from PostgreSQL and upserts it into
 * the corresponding Typesense collection, then stamps `typesenseSyncedAt`.
 *
 * These functions are intentionally NOT wired to any mutations yet — they
 * will be hooked into admin CRUD procedures when the CMS lands in M4+.
 */
import { eq } from 'drizzle-orm';
import { db, reciters, albums, tracks } from '@nawhas/db';
import { typesenseClient } from './client.js';
import { COLLECTIONS } from './collections.js';

// ---------------------------------------------------------------------------
// Sync individual documents
// ---------------------------------------------------------------------------

export async function syncReciter(id: string): Promise<void> {
  const [reciter] = await db.select().from(reciters).where(eq(reciters.id, id)).limit(1);
  if (!reciter) return;

  await typesenseClient.collections(COLLECTIONS.reciters).documents().upsert({
    id: reciter.id,
    name: reciter.name,
    slug: reciter.slug,
  });

  await db.update(reciters).set({ typesenseSyncedAt: new Date() }).where(eq(reciters.id, id));
}

export async function syncAlbum(id: string): Promise<void> {
  const [row] = await db
    .select({
      id: albums.id,
      title: albums.title,
      slug: albums.slug,
      reciterId: albums.reciterId,
      year: albums.year,
      artworkUrl: albums.artworkUrl,
      reciterName: reciters.name,
    })
    .from(albums)
    .leftJoin(reciters, eq(albums.reciterId, reciters.id))
    .where(eq(albums.id, id))
    .limit(1);

  if (!row) return;

  await typesenseClient.collections(COLLECTIONS.albums).documents().upsert({
    id: row.id,
    title: row.title,
    slug: row.slug,
    reciterId: row.reciterId,
    reciterName: row.reciterName ?? '',
    ...(row.year !== null ? { year: row.year } : {}),
    ...(row.artworkUrl !== null ? { artworkUrl: row.artworkUrl } : {}),
  });

  await db.update(albums).set({ typesenseSyncedAt: new Date() }).where(eq(albums.id, id));
}

export async function syncTrack(id: string): Promise<void> {
  const track = await db.query.tracks.findFirst({
    where: eq(tracks.id, id),
    with: {
      album: {
        with: { reciter: true },
      },
      lyrics: true,
    },
  });

  if (!track) return;

  // Build dynamic lyrics_<lang> map from all language rows present in DB.
  const lyricsMap: Record<string, string> = {};
  for (const lyric of track.lyrics) {
    lyricsMap[`lyrics_${lyric.language}`] = lyric.text;
  }

  await typesenseClient.collections(COLLECTIONS.tracks).documents().upsert({
    id: track.id,
    title: track.title,
    slug: track.slug,
    albumId: track.albumId,
    albumTitle: track.album.title,
    albumSlug: track.album.slug,
    reciterId: track.album.reciterId,
    reciterName: track.album.reciter.name,
    reciterSlug: track.album.reciter.slug,
    ...(track.trackNumber !== null ? { trackNumber: track.trackNumber } : {}),
    ...lyricsMap,
  });

  await db.update(tracks).set({ typesenseSyncedAt: new Date() }).where(eq(tracks.id, id));
}

// ---------------------------------------------------------------------------
// Delete a document from any collection
// ---------------------------------------------------------------------------

export async function deleteDocument(collection: COLLECTIONS, id: string): Promise<void> {
  await typesenseClient.collections(collection).documents(id).delete();
}
