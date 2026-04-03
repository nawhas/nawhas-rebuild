/**
 * Integration tests for runSearchIndex().
 *
 * Requires live DATABASE_URL and TYPESENSE_* environment variables AND the
 * three Typesense collections (reciters, albums, tracks) must already exist —
 * they are created on `apps/web` startup via `ensureCollections()`.
 *
 * Automatically skipped when the required env vars are absent so CI
 * environments with only a database can still run `pnpm test`.
 *
 * To run locally with all services up:
 *   DATABASE_URL=... TYPESENSE_HOST=localhost TYPESENSE_API_KEY=xyz pnpm test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Client as TypesenseClient } from 'typesense';
import { runSearchIndex } from '../search-index.js';
import * as schema from '../schema/index.js';

// ---------------------------------------------------------------------------
// Skip the suite when required env vars are absent
// ---------------------------------------------------------------------------

const hasDb = Boolean(process.env['DATABASE_URL']);
const hasTypesense =
  Boolean(process.env['TYPESENSE_HOST']) && Boolean(process.env['TYPESENSE_API_KEY']);

const describeIntegration = hasDb && hasTypesense ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describeIntegration('runSearchIndex() integration', () => {
  let pgClient: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let tsClient: InstanceType<typeof TypesenseClient>;

  let reciterId: string;
  let albumId: string;
  let trackId: string;

  beforeAll(async () => {
    pgClient = postgres(process.env['DATABASE_URL']!);
    db = drizzle(pgClient, { schema });

    tsClient = new TypesenseClient({
      nodes: [
        {
          host: process.env['TYPESENSE_HOST'] ?? 'localhost',
          port: parseInt(process.env['TYPESENSE_PORT'] ?? '8108', 10),
          protocol: (process.env['TYPESENSE_PROTOCOL'] ?? 'http') as 'http' | 'https',
        },
      ],
      apiKey: process.env['TYPESENSE_API_KEY'] ?? '',
      connectionTimeoutSeconds: 5,
    });

    // Insert isolated test rows — unique slugs avoid collisions with seed data.
    const [reciter] = await db
      .insert(schema.reciters)
      .values({ name: 'Test Reciter SI', slug: 'test-reciter-search-index' })
      .returning();
    if (!reciter) throw new Error('Failed to insert test reciter');
    reciterId = reciter.id;

    const [album] = await db
      .insert(schema.albums)
      .values({
        title: 'Test Album SI',
        slug: 'test-album-search-index',
        reciterId,
        year: 2024,
      })
      .returning();
    if (!album) throw new Error('Failed to insert test album');
    albumId = album.id;

    const [track] = await db
      .insert(schema.tracks)
      .values({
        title: 'Test Track SI',
        slug: 'test-track-search-index',
        albumId,
        trackNumber: 1,
      })
      .returning();
    if (!track) throw new Error('Failed to insert test track');
    trackId = track.id;

    await db.insert(schema.lyrics).values([
      { trackId, language: 'ar', text: 'نص عربي للاختبار' },
      { trackId, language: 'transliteration', text: 'Nass arabi lil-ikhtebar' },
    ]);
  });

  afterAll(async () => {
    // Best-effort cleanup from Typesense
    for (const [col, id] of [
      ['tracks', trackId],
      ['albums', albumId],
      ['reciters', reciterId],
    ] as const) {
      if (!id) continue;
      try {
        await tsClient.collections(col).documents(id).delete();
      } catch {
        // Ignore — document may not exist if the test failed before indexing
      }
    }

    // Postgres cascade delete removes albums, tracks, and lyrics
    if (reciterId) {
      await db.delete(schema.reciters).where(eq(schema.reciters.id, reciterId));
    }

    await pgClient.end();
  });

  it('indexes all collections without throwing', async () => {
    await expect(runSearchIndex(db)).resolves.not.toThrow();
  });

  it('upserts the test reciter into Typesense', async () => {
    const doc = (await tsClient
      .collections('reciters')
      .documents(reciterId)
      .retrieve()) as Record<string, unknown>;
    expect(doc['id']).toBe(reciterId);
    expect(doc['name']).toBe('Test Reciter SI');
    expect(doc['slug']).toBe('test-reciter-search-index');
  });

  it('upserts the test album with denormalised reciter name', async () => {
    const doc = (await tsClient
      .collections('albums')
      .documents(albumId)
      .retrieve()) as Record<string, unknown>;
    expect(doc['id']).toBe(albumId);
    expect(doc['title']).toBe('Test Album SI');
    expect(doc['reciterName']).toBe('Test Reciter SI');
    expect(doc['year']).toBe(2024);
  });

  it('upserts the test track with dynamic lyrics map', async () => {
    const doc = (await tsClient
      .collections('tracks')
      .documents(trackId)
      .retrieve()) as Record<string, unknown>;
    expect(doc['id']).toBe(trackId);
    expect(doc['title']).toBe('Test Track SI');
    expect(doc['albumTitle']).toBe('Test Album SI');
    expect(doc['reciterName']).toBe('Test Reciter SI');
    expect(doc['lyrics_ar']).toBe('نص عربي للاختبار');
    expect(doc['lyrics_transliteration']).toBe('Nass arabi lil-ikhtebar');
  });

  it('stamps typesenseSyncedAt on reciters after indexing', async () => {
    const [row] = await db
      .select({ typesenseSyncedAt: schema.reciters.typesenseSyncedAt })
      .from(schema.reciters)
      .where(eq(schema.reciters.id, reciterId));
    expect(row?.typesenseSyncedAt).not.toBeNull();
  });

  it('stamps typesenseSyncedAt on albums after indexing', async () => {
    const [row] = await db
      .select({ typesenseSyncedAt: schema.albums.typesenseSyncedAt })
      .from(schema.albums)
      .where(eq(schema.albums.id, albumId));
    expect(row?.typesenseSyncedAt).not.toBeNull();
  });

  it('stamps typesenseSyncedAt on tracks after indexing', async () => {
    const [row] = await db
      .select({ typesenseSyncedAt: schema.tracks.typesenseSyncedAt })
      .from(schema.tracks)
      .where(eq(schema.tracks.id, trackId));
    expect(row?.typesenseSyncedAt).not.toBeNull();
  });
});
