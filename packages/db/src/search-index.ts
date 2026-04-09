/**
 * Full Typesense re-index script.
 *
 * Reads all reciters, albums, and tracks from PostgreSQL via Drizzle and
 * upserts them into Typesense in batches.  After each collection is indexed
 * it back-fills `typesenseSyncedAt` in the database.
 *
 * Run with: pnpm db:search-index
 * Also imported and called at the end of pnpm db:seed.
 */
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { createTypesenseAdminClient, type TypesenseAdminClient } from './typesense/admin-client.js';

type DB = PostgresJsDatabase<typeof schema>;
type TSClient = TypesenseAdminClient;

// ---------------------------------------------------------------------------
// Per-collection indexers
// ---------------------------------------------------------------------------

async function indexReciters(db: DB, client: TSClient): Promise<void> {
  const rows = await db.select().from(schema.reciters);
  if (rows.length === 0) {
    console.log('  No reciters to index.');
    return;
  }

  const docs = rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug }));
  await client.collections('reciters').documents().import(docs, { action: 'upsert' });

  const now = new Date();
  await db
    .update(schema.reciters)
    .set({ typesenseSyncedAt: now })
    .where(inArray(schema.reciters.id, rows.map((r) => r.id)));

  console.log(`  ✓ ${rows.length} reciters indexed`);
}

async function indexAlbums(db: DB, client: TSClient): Promise<void> {
  const rows = await db
    .select({
      id: schema.albums.id,
      title: schema.albums.title,
      slug: schema.albums.slug,
      reciterId: schema.albums.reciterId,
      year: schema.albums.year,
      artworkUrl: schema.albums.artworkUrl,
      reciterName: schema.reciters.name,
    })
    .from(schema.albums)
    .leftJoin(schema.reciters, eq(schema.albums.reciterId, schema.reciters.id));

  if (rows.length === 0) {
    console.log('  No albums to index.');
    return;
  }

  const docs = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    reciterId: r.reciterId,
    reciterName: r.reciterName ?? '',
    ...(r.year !== null ? { year: r.year } : {}),
    ...(r.artworkUrl !== null ? { artworkUrl: r.artworkUrl } : {}),
  }));

  await client.collections('albums').documents().import(docs, { action: 'upsert' });

  const now = new Date();
  await db
    .update(schema.albums)
    .set({ typesenseSyncedAt: now })
    .where(inArray(schema.albums.id, rows.map((r) => r.id)));

  console.log(`  ✓ ${rows.length} albums indexed`);
}

async function indexTracks(db: DB, client: TSClient): Promise<void> {
  // Relational query loads tracks with their album→reciter chain and all lyrics variants.
  const rows = await db.query.tracks.findMany({
    with: {
      album: {
        with: { reciter: true },
      },
      lyrics: true,
    },
  });

  if (rows.length === 0) {
    console.log('  No tracks to index.');
    return;
  }

  const docs = rows.map((track) => {
    // Build dynamic lyrics_<lang> map from whatever language rows exist in DB.
    // New languages appear automatically — no code changes needed.
    const lyricsMap: Record<string, string> = {};
    for (const lyric of track.lyrics) {
      lyricsMap[`lyrics_${lyric.language}`] = lyric.text;
    }

    return {
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
    };
  });

  await client.collections('tracks').documents().import(docs, { action: 'upsert' });

  const now = new Date();
  await db
    .update(schema.tracks)
    .set({ typesenseSyncedAt: now })
    .where(inArray(schema.tracks.id, rows.map((t) => t.id)));

  console.log(`  ✓ ${rows.length} tracks indexed`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs a full re-index of all reciters, albums, and tracks into Typesense.
 *
 * Accepts an optional pre-built Drizzle DB instance so callers (e.g. seed.ts)
 * can share their existing connection instead of opening a second one.
 * When omitted, a short-lived connection is created and closed after indexing.
 */
export async function runSearchIndex(existingDb?: DB): Promise<void> {
  let pgClient: ReturnType<typeof postgres> | null = null;
  let db: DB;

  if (existingDb) {
    db = existingDb;
  } else {
    const databaseUrl = process.env['DATABASE_URL'];
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    pgClient = postgres(databaseUrl);
    db = drizzle(pgClient, { schema });
  }

  const typesenseClient = createTypesenseAdminClient();

  try {
    console.log('Indexing reciters…');
    await indexReciters(db, typesenseClient);

    console.log('Indexing albums…');
    await indexAlbums(db, typesenseClient);

    console.log('Indexing tracks…');
    await indexTracks(db, typesenseClient);
  } finally {
    if (pgClient) await pgClient.end();
  }
}

