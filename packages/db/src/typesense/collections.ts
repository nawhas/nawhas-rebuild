import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import type { CollectionSchema } from 'typesense/lib/Typesense/Collection';
import type { TypesenseAdminClient } from './admin-client.js';

export enum COLLECTIONS {
  reciters = 'reciters',
  albums = 'albums',
  tracks = 'tracks',
}

// ---------------------------------------------------------------------------
// Collection schemas — derived from @nawhas/types DTOs; keep in sync with search router query_by.
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
    { name: 'lyrics_ar', type: 'string', optional: true, locale: 'ar' },
    { name: 'lyrics_ur', type: 'string', optional: true, locale: 'ur' },
    { name: 'lyrics_.*', type: 'string', optional: true },
  ],
  default_sorting_field: '',
};

const ALL_SCHEMAS: CollectionCreateSchema[] = [
  recitersSchema,
  albumsSchema,
  tracksSchema,
];

/** Field names required by the canonical schema (wildcard counts as one name). */
function desiredFieldNames(schema: CollectionCreateSchema): Set<string> {
  return new Set((schema.fields ?? []).map((f) => f.name));
}

function existingFieldNames(collection: CollectionSchema): Set<string> {
  return new Set((collection.fields ?? []).map((f) => f.name));
}

/**
 * True if the live collection is missing any field the code expects.
 * Extra fields in Typesense are ignored (legacy fields).
 */
export function collectionSchemaOutdated(
  existing: CollectionSchema,
  desired: CollectionCreateSchema,
): boolean {
  const want = desiredFieldNames(desired);
  const have = existingFieldNames(existing);
  for (const name of want) {
    if (!have.has(name)) return true;
  }
  return false;
}

/**
 * Create any missing collections. Does not modify existing collections (safe for every app replica).
 */
export async function ensureCollections(client: TypesenseAdminClient): Promise<void> {
  const existing = await client.collections().retrieve();
  const existingNames = new Set(existing.map((c) => c.name));

  await Promise.all(
    ALL_SCHEMAS.map(async (schema) => {
      if (!existingNames.has(schema.name)) {
        await client.collections().create(schema);
      }
    }),
  );
}

/**
 * Ensure collections exist and match the expected field list. If a collection exists but is
 * missing required fields (e.g. after a code deploy that adds `lyrics_.*`), deletes and recreates
 * it — documents must be re-indexed (seed, search-index job, or app sync).
 *
 * Intended for a single-run deploy hook, not per-pod init (avoid parallel deletes).
 */
export async function reconcileTypesenseCollections(client: TypesenseAdminClient): Promise<void> {
  const existingList = await client.collections().retrieve();
  const existingNames = new Set(existingList.map((c) => c.name));

  for (const schema of ALL_SCHEMAS) {
    if (!existingNames.has(schema.name)) {
      await client.collections().create(schema);
      continue;
    }

    const live = await client.collections(schema.name).retrieve();
    if (collectionSchemaOutdated(live, schema)) {
      await client.collections(schema.name).delete();
      await client.collections().create(schema);
    }
  }
}
