import type { TypesenseAdminClient } from '@nawhas/db/typesense/admin-client';
import {
  COLLECTIONS,
  SEARCHABLE_LYRICS_LANGUAGES,
  ensureCollections as ensureCollectionsWithClient,
  reconcileTypesenseCollections,
} from '@nawhas/db/typesense/collections';
import { typesenseClient } from './client';

export { COLLECTIONS, SEARCHABLE_LYRICS_LANGUAGES, reconcileTypesenseCollections };

/**
 * Idempotently creates missing Typesense collections (existing schemas untouched).
 * Safe on every app replica — delegates to @nawhas/db with the web admin client.
 */
export async function ensureCollections(): Promise<void> {
  await ensureCollectionsWithClient(typesenseClient as TypesenseAdminClient);
}
