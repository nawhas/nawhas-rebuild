import Typesense from 'typesense';

export type TypesenseAdminClient = InstanceType<typeof Typesense.Client>;

/**
 * Admin Typesense client from env — used by search-index, schema CLI, and (via @nawhas/web) server routes.
 */
export function createTypesenseAdminClient(): TypesenseAdminClient {
  const host = process.env['TYPESENSE_HOST'];
  const apiKey = process.env['TYPESENSE_API_KEY'];
  if (!host) throw new Error('TYPESENSE_HOST is required');
  if (!apiKey) throw new Error('TYPESENSE_API_KEY is required');
  return new Typesense.Client({
    nodes: [
      {
        host,
        port: parseInt(process.env['TYPESENSE_PORT'] ?? '8108', 10),
        protocol: (process.env['TYPESENSE_PROTOCOL'] ?? 'http') as 'http' | 'https',
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 5,
  });
}
