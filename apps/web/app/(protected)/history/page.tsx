import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { HistoryList } from '@/components/history/history-list';
import { buildMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Listening History',
  description: 'Your recently played nawha tracks.',
});

const createCaller = createCallerFactory(appRouter);

/**
 * History Page — /history
 *
 * Protected Server Component. Renders inside the (protected) layout which
 * handles the auth redirect guard.
 *
 * - First page of history entries is SSR'd for instant load.
 * - HistoryList client component handles "Load More" and "Clear history".
 * - dynamic = 'force-dynamic' because the page is user-specific (no ISR).
 */
export const dynamic = 'force-dynamic';

export default async function HistoryPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  // Session guaranteed by (protected) layout, but handle gracefully.
  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const { items, nextCursor } = await caller.history.list({ limit: 20 });

  return (
    <main id="main-content" className="py-10">
      <Container>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Listening History</h1>
          <p className="mt-1 text-sm text-gray-500">Tracks you&apos;ve recently played</p>
        </header>

        <HistoryList initialItems={items} initialCursor={nextCursor} />
      </Container>
    </main>
  );
}
