/**
 * Deploy hook: reconcile Typesense collection schemas with code (create missing, recreate if outdated).
 * Run: node packages/db/dist/typesense-ensure-cli.js
 * Requires: TYPESENSE_HOST, TYPESENSE_API_KEY (and optional PORT/PROTOCOL).
 */
import { createTypesenseAdminClient } from './typesense/admin-client.js';
import { reconcileTypesenseCollections } from './typesense/collections.js';

console.log('Reconciling Typesense collections…');

void (async () => {
  const client = createTypesenseAdminClient();
  await reconcileTypesenseCollections(client);
  console.log('Typesense collections reconciled.');
})().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
