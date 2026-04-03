import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import { typesenseClient } from './client';

export enum COLLECTIONS {
  reciters = 'reciters',
  albums = 'albums',
  tracks = 'tracks',
}

// ---------------------------------------------------------------------------
// Collection schemas — derived from @nawhas/types DTOs; no new schema invented
// ---------------------------------------------------------------------------

const recitersSchema: CollectionCreateSchema = {
  name: COLLECTIONS.reciters,
  fields: [
    { name: 'name', type: 'string', index: true },
    { name: 'slug', type: 'string' },
  ],
  default_sorting_field: '',
};

const albumsSchema: CollectionCreateSchema = {
  name: COLLECTIONS.albums,
  fields: [
    { name: 'title', type: 'string', index: true },
    { name: 'slug', type: 'string' },
    { name: 'reciterId', type: 'string', facet: true },
    { name: 'reciterName', type: 'string', index: true },
    { name: 'year', type: 'int32', facet: true, optional: true },
    { name: 'artworkUrl', type: 'string', optional: true, index: false },
  ],
  default_sorting_field: '',
};

const tracksSchema: CollectionCreateSchema = {
  name: COLLECTIONS.tracks,
  fields: [
    { name: 'title', type: 'string', index: true },
    { name: 'slug', type: 'string' },
    { name: 'trackNumber', type: 'int32', optional: true },
    { name: 'albumId', type: 'string', facet: true },
    { name: 'albumTitle', type: 'string', index: true },
    { name: 'albumSlug', type: 'string' },
    { name: 'reciterId', type: 'string', facet: true },
    { name: 'reciterName', type: 'string', index: true },
    { name: 'reciterSlug', type: 'string' },
    // Arabic lyrics — explicit locale for ICU tokenisation + diacritics removal
    { name: 'lyrics_ar', type: 'string', optional: true, locale: 'ar' },
    // Urdu lyrics — explicit locale for ICU tokenisation + diacritics removal
    { name: 'lyrics_ur', type: 'string', optional: true, locale: 'ur' },
    // All other languages (en, fr, transliteration, etc.) auto-indexed via wildcard
    { name: 'lyrics_.*', type: 'string', optional: true },
  ],
  default_sorting_field: '',
};

const ALL_SCHEMAS: CollectionCreateSchema[] = [
  recitersSchema,
  albumsSchema,
  tracksSchema,
];

/**
 * Idempotently creates or verifies all Typesense collection schemas.
 * Safe to call on every app startup — existing collections are left untouched.
 */
export async function ensureCollections(): Promise<void> {
  const existing = await typesenseClient.collections().retrieve();
  const existingNames = new Set(existing.map((c) => c.name));

  await Promise.all(
    ALL_SCHEMAS.map(async (schema) => {
      if (!existingNames.has(schema.name)) {
        await typesenseClient.collections().create(schema);
      }
    }),
  );
}
