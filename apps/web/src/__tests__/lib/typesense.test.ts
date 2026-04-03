// @vitest-environment node
/**
 * Integration tests for the Typesense client and ensureCollections().
 * Requires a real Typesense instance — Docker Compose runs one on port 8108.
 *
 * Run with:
 *   TYPESENSE_HOST=localhost TYPESENSE_PORT=8108 TYPESENSE_PROTOCOL=http \
 *   TYPESENSE_API_KEY=nawhas-typesense-key pnpm --filter web test src/__tests__/lib/typesense.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Set env vars before importing modules that read them at init time.
process.env.TYPESENSE_HOST = process.env.TYPESENSE_HOST ?? 'localhost';
process.env.TYPESENSE_PORT = process.env.TYPESENSE_PORT ?? '8108';
process.env.TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL ?? 'http';
process.env.TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY ?? 'nawhas-typesense-key';

import { typesenseClient, TYPESENSE_SEARCH_API_KEY } from '@/lib/typesense/client';
import { COLLECTIONS, ensureCollections } from '@/lib/typesense/collections';

const COLLECTION_NAMES = Object.values(COLLECTIONS);

async function deleteCollectionIfExists(name: string) {
  try {
    await typesenseClient.collections(name).delete();
  } catch {
    // Collection did not exist — that is fine
  }
}

describe('Typesense client', () => {
  it('initialises with env vars and does not throw', () => {
    expect(typesenseClient).toBeDefined();
  });

  it('exports TYPESENSE_SEARCH_API_KEY', () => {
    expect(typeof TYPESENSE_SEARCH_API_KEY).toBe('string');
    expect(TYPESENSE_SEARCH_API_KEY.length).toBeGreaterThan(0);
  });
});

describe('ensureCollections()', () => {
  beforeAll(async () => {
    // Start from a clean slate so we test creation, not an already-existing state.
    await Promise.all(COLLECTION_NAMES.map(deleteCollectionIfExists));
  });

  afterAll(async () => {
    // Clean up after tests.
    await Promise.all(COLLECTION_NAMES.map(deleteCollectionIfExists));
  });

  it('creates all three collections when they do not exist', async () => {
    await ensureCollections();

    const collections = await typesenseClient.collections().retrieve();
    const names = collections.map((c) => c.name);

    expect(names).toContain(COLLECTIONS.reciters);
    expect(names).toContain(COLLECTIONS.albums);
    expect(names).toContain(COLLECTIONS.tracks);
  });

  it('is idempotent — safe to call a second time without error', async () => {
    await expect(ensureCollections()).resolves.toBeUndefined();
  });

  it('reciters collection has expected fields', async () => {
    const collection = await typesenseClient.collections(COLLECTIONS.reciters).retrieve();
    const fieldNames = collection.fields?.map((f) => f.name) ?? [];

    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('slug');
  });

  it('albums collection has reciterId and year as facets', async () => {
    const collection = await typesenseClient.collections(COLLECTIONS.albums).retrieve();
    const fields = collection.fields ?? [];

    const reciterIdField = fields.find((f) => f.name === 'reciterId');
    const yearField = fields.find((f) => f.name === 'year');

    expect(reciterIdField?.facet).toBe(true);
    expect(yearField?.facet).toBe(true);
    expect(yearField?.optional).toBe(true);
  });

  it('tracks collection has explicit locale fields for ar and ur', async () => {
    const collection = await typesenseClient.collections(COLLECTIONS.tracks).retrieve();
    const fields = collection.fields ?? [];

    const arField = fields.find((f) => f.name === 'lyrics_ar');
    const urField = fields.find((f) => f.name === 'lyrics_ur');
    const wildcardField = fields.find((f) => f.name === 'lyrics_.*');

    expect(arField).toBeDefined();
    expect(urField).toBeDefined();
    expect(wildcardField).toBeDefined();

    expect(arField?.optional).toBe(true);
    expect(urField?.optional).toBe(true);
    expect(wildcardField?.optional).toBe(true);
  });
});
