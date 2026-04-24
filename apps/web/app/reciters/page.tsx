import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { ReciterGrid } from '@/components/reciters/reciter-grid';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// Dynamic rendering avoids build-time DB access in CI/container builds.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Reciters',
  description: 'Browse all nawha reciters in our comprehensive digital library.',
  canonical: `${siteUrl()}/reciters`,
});

const createCaller = createCallerFactory(appRouter);

/**
 * Reciters Listing Page
 *
 * Server Component — fetches the first page of reciters and passes initial
 * data + cursor to the ReciterGrid client component. Grid groups reciters
 * by leading letter and emits A–Z anchor nav as the primary affordance.
 */
export default async function RecitersPage(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const t = await getTranslations('common');
  const caller = createCaller({ db, session: null, user: null });
  const { items, nextCursor } = await caller.reciter.list({ limit: 24 });

  return (
    <div className="py-10">
      <Container>
        <h1 className="mb-8 font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)]">
          {t('reciters')}
        </h1>
        <ReciterGrid initialItems={items} initialCursor={nextCursor} />
      </Container>
    </div>
  );
}
