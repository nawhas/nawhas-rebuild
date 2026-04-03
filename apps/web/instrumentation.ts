/**
 * Next.js instrumentation hook — runs once on server startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run on the Node.js server runtime, not in the Edge runtime.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureCollections } = await import('./src/lib/typesense/collections');
    await ensureCollections();
  }
}
