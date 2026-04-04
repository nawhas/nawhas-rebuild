/**
 * Next.js instrumentation hook — runs once on server startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialise Sentry for the Node.js server runtime
    await import('./sentry.server.config');

    const { ensureCollections } = await import('./src/lib/typesense/collections');
    await ensureCollections();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialise Sentry for the Edge runtime
    await import('./sentry.edge.config');
  }
}
