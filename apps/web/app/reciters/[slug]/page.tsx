import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { ReciterHeader } from '@/components/reciters/reciter-header';
import { ReciterDiscography } from '@/components/reciters/reciter-discography';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/json-ld';
import { buildReciterJsonLd } from '@/lib/jsonld';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// Dynamic rendering avoids production static-generation conflicts with request-bound APIs.
export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

interface ReciterPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ReciterPageProps): Promise<Metadata> {
  setDefaultRequestLocale();
  const { slug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const reciter = await caller.reciter.getBySlug({ slug });

  if (!reciter) {
    return buildMetadata({ title: 'Reciter Not Found' });
  }

  return buildMetadata({
    title: reciter.name,
    description: `Browse the full discography of ${reciter.name} on Nawhas.`,
    canonical: `${siteUrl()}/reciters/${slug}`,
  });
}

/**
 * Reciter Profile Page
 *
 * Server Component — fetches a single reciter with their albums via tRPC server-side
 * caller and renders the header and discography sections.
 */
const INITIAL_ALBUM_PAGE_SIZE = 12;

export default async function ReciterPage({ params }: ReciterPageProps): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const { slug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const reciter = await caller.reciter.getBySlug({ slug });

  if (!reciter) {
    notFound();
  }

  const initialPage = await caller.album.listByReciter({
    reciterSlug: slug,
    limit: INITIAL_ALBUM_PAGE_SIZE,
  });

  return (
    <div className="py-10">
      <JsonLd data={buildReciterJsonLd(reciter)} />
      <Container>
        <ReciterHeader reciter={reciter} />
        <div className="mt-8">
          <ReciterDiscography
            reciterSlug={slug}
            initialAlbums={initialPage.items}
            initialCursor={initialPage.nextCursor}
          />
        </div>
      </Container>
    </div>
  );
}
