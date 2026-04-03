import Typesense from 'typesense';

if (!process.env.TYPESENSE_HOST) throw new Error('TYPESENSE_HOST is required');
if (!process.env.TYPESENSE_API_KEY) throw new Error('TYPESENSE_API_KEY is required');

const host = process.env.TYPESENSE_HOST;
const port = parseInt(process.env.TYPESENSE_PORT ?? '8108', 10);
const protocol = (process.env.TYPESENSE_PROTOCOL ?? 'http') as 'http' | 'https';
const apiKey = process.env.TYPESENSE_API_KEY;

/**
 * Admin Typesense client — server-side only.
 * Never expose the admin API key to the browser.
 */
export const typesenseClient = new Typesense.Client({
  nodes: [{ host, port, protocol }],
  apiKey,
  connectionTimeoutSeconds: 5,
});

/**
 * Read-only search API key for use in client-side search requests.
 * Falls back to the admin key in dev if not set — configure separately in prod.
 */
export const TYPESENSE_SEARCH_API_KEY =
  process.env.TYPESENSE_SEARCH_API_KEY ?? apiKey;
