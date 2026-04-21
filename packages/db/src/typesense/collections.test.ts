import { describe, expect, it } from 'vitest';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import type { CollectionFieldSchema, CollectionSchema } from 'typesense/lib/Typesense/Collection';
import {
  SEARCHABLE_LYRICS_LANGUAGES,
  collectionSchemaOutdated,
  tracksSchema,
} from './collections.js';

function mockLive(fieldNames: string[]): CollectionSchema {
  const fields: CollectionFieldSchema[] = fieldNames.map((name) => ({
    name,
    type: 'string',
  }));
  return {
    name: 'tracks',
    fields,
    default_sorting_field: '',
    created_at: 0,
    num_documents: 0,
    num_memory_shards: 0,
    // Typesense v3 widened CollectionSchema — these fields are always present
    // on a real server response. Empty defaults are fine for the outdated-check tests.
    symbols_to_index: [],
    token_separators: [],
    enable_nested_fields: false,
    metadata: {},
    voice_query_model: {},
    synonym_sets: [],
    curation_sets: [],
  };
}

const minimalTracksDesired: CollectionCreateSchema = {
  name: 'tracks',
  fields: [
    { name: 'title', type: 'string', index: true },
    { name: 'lyrics_.*', type: 'string', optional: true },
  ],
  default_sorting_field: '',
};

describe('tracksSchema — searchable lyrics invariant', () => {
  it('declares an explicit field for every SEARCHABLE_LYRICS_LANGUAGES entry', () => {
    // Guards against the cold-start 404: the search router queries
    // `lyrics_<lang>` for every entry in SEARCHABLE_LYRICS_LANGUAGES, so each
    // must exist on the collection schema as an explicit field (the `lyrics_.*`
    // wildcard only materialises a field once a document upserts it, which
    // leaves a fresh index returning 404 on the first search).
    const fieldNames = new Set((tracksSchema.fields ?? []).map((f) => f.name));
    for (const lang of SEARCHABLE_LYRICS_LANGUAGES) {
      expect(fieldNames.has(`lyrics_${lang}`)).toBe(true);
    }
  });

  it('still includes the lyrics_.* wildcard so non-searchable languages are storable', () => {
    const fieldNames = new Set((tracksSchema.fields ?? []).map((f) => f.name));
    expect(fieldNames.has('lyrics_.*')).toBe(true);
  });
});

describe('collectionSchemaOutdated', () => {
  it('returns false when all desired field names exist', () => {
    const live = mockLive(['title', 'lyrics_.*']);
    expect(collectionSchemaOutdated(live, minimalTracksDesired)).toBe(false);
  });

  it('returns true when a desired field is missing', () => {
    const live = mockLive(['title']);
    expect(collectionSchemaOutdated(live, minimalTracksDesired)).toBe(true);
  });

  it('ignores extra legacy fields on the server', () => {
    const live = mockLive(['title', 'lyrics_.*', 'legacy_field']);
    expect(collectionSchemaOutdated(live, minimalTracksDesired)).toBe(false);
  });
});
