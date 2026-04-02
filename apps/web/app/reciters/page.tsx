import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { ReciterGrid } from '@/components/reciters/reciter-grid';
import { buildMetadata } from '@/lib/metadata';

// ISR: revalidate every hour.
export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'Reciters',
  description: 'Browse all nawha reciters in our comprehensive digital library.',
});

const createCaller = createCallerFactory(appRouter);

/**
 * Reciters Listing Page
 *
 * Server Component — fetches the first page of reciters and passes initial
 * data + cursor to the ReciterGrid client component for "Load More" pagination.
 */
export default async function RecitersPage(): Promise<React.JSX.Element> {
  const caller = createCaller({ db, session: null, user: null });
  const { items, nextCursor } = await caller.reciter.list({ limit: 24 });

  return (
    <main id="main-content" className="py-10">
      <Container>
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Reciters</h1>
        <ReciterGrid initialItems={items} initialCursor={nextCursor} />
      </Container>
    </main>
  );
}
