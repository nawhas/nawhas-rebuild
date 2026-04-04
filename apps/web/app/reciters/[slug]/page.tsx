import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { ReciterHeader } from '@/components/reciters/reciter-header';
import { ReciterDiscography } from '@/components/reciters/reciter-discography';
import { buildMetadata, siteUrl } from '@/lib/metadata';

// ISR: revalidate every hour.
export const revalidate = 3600;

const createCaller = createCallerFactory(appRouter);

interface ReciterPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const caller = createCaller({ db, session: null, user: null });
  // Fetch up to the maximum allowed limit for static generation.
  const { items } = await caller.reciter.list({ limit: 100 });
  return items.map((reciter) => ({ slug: reciter.slug }));
}

export async function generateMetadata({ params }: ReciterPageProps): Promise<Metadata> {
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
export default async function ReciterPage({ params }: ReciterPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const reciter = await caller.reciter.getBySlug({ slug });

  if (!reciter) {
    notFound();
  }

  return (
    <div className="py-10">
      <Container>
        <ReciterHeader reciter={reciter} />
        <div className="mt-8">
          <ReciterDiscography albums={reciter.albums} />
        </div>
      </Container>
    </div>
  );
}
