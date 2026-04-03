// @vitest-environment node
/**
 * Tests for the Typesense client and ensureCollections().
 *
 * The "Typesense client" suite is a unit test — it only checks that the
 * client object is initialised; no network connection is made.
 *
 * The "ensureCollections()" suite is an integration test that requires a
 * running Typesense instance. It is gated behind TYPESENSE_INTEGRATION=true
 * so that it is skipped in CI (which uses `--no-deps` and has no Typesense).
 *
 * NOTE: vitest.config.ts already injects TYPESENSE_HOST/TYPESENSE_API_KEY via
 * test.env for every test that transitively imports the search router, so we
 * cannot use those vars as a guard — they are always set. Use the explicit
 * opt-in flag instead.
 *
 * Run integration suite locally:
 *   TYPESENSE_INTEGRATION=true pnpm --filter web test src/__tests__/lib/typesense.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Gate the integration suite behind an explicit opt-in flag.
// vitest.config.ts already provides TYPESENSE_HOST/API_KEY for all tests, so
// those vars cannot be used as a presence check — TYPESENSE_INTEGRATION=true
// must be set deliberately to run tests that require a live Typesense instance.
const hasTypesense = process.env['TYPESENSE_INTEGRATION'] === 'true';

const describeIntegration = hasTypesense ? describe : describe.skip;

// vitest.config.ts injects TYPESENSE_HOST/PORT/PROTOCOL/API_KEY via test.env —
// no manual defaults are needed here.

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

describeIntegration('ensureCollections()', () => {
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

    // Note: 'id' is a Typesense built-in document identifier and is NOT returned
    // in collection.fields — it is always implicitly present on every document.
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
