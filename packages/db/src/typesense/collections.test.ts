import { describe, expect, it } from 'vitest';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';
import { collectionSchemaOutdated } from './collections.js';

function mockLive(fields: { name: string }[]): CollectionSchema {
  return {
    name: 'tracks',
    fields,
    default_sorting_field: '',
    created_at: 0,
    num_documents: 0,
    num_memory_shards: 0,
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

describe('collectionSchemaOutdated', () => {
  it('returns false when all desired field names exist', () => {
    const live = mockLive([{ name: 'title' }, { name: 'lyrics_.*' }]);
    expect(collectionSchemaOutdated(live, minimalTracksDesired)).toBe(false);
  });

  it('returns true when a desired field is missing', () => {
    const live = mockLive([{ name: 'title' }]);
    expect(collectionSchemaOutdated(live, minimalTracksDesired)).toBe(true);
  });

  it('ignores extra legacy fields on the server', () => {
    const live = mockLive([
      { name: 'title' },
      { name: 'lyrics_.*' },
      { name: 'legacy_field' },
    ]);
    expect(collectionSchemaOutdated(live, minimalTracksDesired)).toBe(false);
  });
});
